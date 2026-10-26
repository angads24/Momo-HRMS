import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { getCurrentUser, loginUser, logoutUser, resetPassword as resetPasswordApi } from '../api/authApi';
import { refreshSession, setAuthEventHandlers } from '../api/client';
import {
  clearTokens,
  getAuthUser,
  getEmployeeProfile,
  getRefreshToken,
  initAccessToken,
  saveAuthUser,
  saveEmployeeProfile,
  saveTokens,
} from '../api/tokenStorage';
import { getEmployeeMe } from '../api/employeeApi';
import type { EmployeeProfile } from '../api/employeeApi';
import { getFaceStatus } from '../api/faceApi';
import type { AuthUser } from '../types/auth';
import { toAuthUser } from '../utils/roles';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export const RESTRICTED_APP_MESSAGE =
  'Access Restricted: The mobile app is reserved for employees and HR staff. Administrators must use the Momo HRMS web management portal.';

const NO_MODULE_MESSAGE =
  'Your account does not have access to any module. Please contact your administrator.';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  employeeProfile: EmployeeProfile | null;
  isProfileComplete: boolean;
  isFaceEnrolled: boolean;
  notice: string | null;
  clearNotice: () => void;
  login: (email: string, password: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<EmployeeProfile | null>;
  checkFaceEnrollment: (targetProfile?: EmployeeProfile | null) => Promise<boolean>;
  setProfileCompletedManually: () => void;
  setFaceEnrolledManually: (enrolled: boolean) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function checkProfileCompleteness(profile: EmployeeProfile | null): boolean {
  if (!profile) return false;
  if (profile.isOnboarded) return true;
  const hasDob = Boolean(profile.dateOfBirth && String(profile.dateOfBirth).trim().length > 0);
  const hasPhone = Boolean(profile.phone && String(profile.phone).trim().length > 0);
  const hasPersonalEmail = Boolean(profile.personalEmail && String(profile.personalEmail).trim().length > 0);
  const hasAddress = Boolean(profile.address && String(profile.address).trim().length > 0);
  return hasDob && hasPhone && hasPersonalEmail && hasAddress;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const employeeProfileRef = useRef<EmployeeProfile | null>(null);
  employeeProfileRef.current = employeeProfile;

  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(true);
  const [isFaceEnrolled, setIsFaceEnrolled] = useState<boolean>(true);
  const [notice, setNotice] = useState<string | null>(null);

  const endSession = useCallback((message: string | null = null) => {
    setUser(null);
    setEmployeeProfile(null);
    setIsProfileComplete(true);
    setIsFaceEnrolled(true);
    setStatus('unauthenticated');
    setNotice(message);
  }, []);

  const checkFaceEnrollment = useCallback(
    async (targetProfile?: EmployeeProfile | null): Promise<boolean> => {
      const prof = targetProfile !== undefined ? targetProfile : employeeProfileRef.current;
      const empId = prof?.employeeCode || prof?.id;
      if (!empId) {
        setIsFaceEnrolled(true);
        return true;
      }
      try {
        const statusRes = await getFaceStatus(empId);
        setIsFaceEnrolled(statusRes.is_enrolled);
        return statusRes.is_enrolled;
      } catch {
        return true;
      }
    },
    [],
  );

  const refreshProfile = useCallback(async (): Promise<EmployeeProfile | null> => {
    try {
      const profile = await getEmployeeMe();
      if (profile) {
        setEmployeeProfile(profile);
        const complete = checkProfileCompleteness(profile);
        setIsProfileComplete(complete);
        await saveEmployeeProfile(profile);
        const empId = profile?.employeeCode || profile?.id;
        if (empId) {
          try {
            const statusRes = await getFaceStatus(empId);
            setIsFaceEnrolled(statusRes.is_enrolled);
          } catch {}
        }
      }
      return profile;
    } catch {
      return null;
    }
  }, []);

  const setProfileCompletedManually = useCallback(() => {
    setIsProfileComplete(true);
  }, []);

  const setFaceEnrolledManually = useCallback((enrolled: boolean) => {
    setIsFaceEnrolled(enrolled);
  }, []);

  // Axios interceptors callback
  useEffect(() => {
    setAuthEventHandlers({
      onSessionExpired: () => {
        void clearTokens();
        endSession('Your session has expired. Please log in again.');
      },
      onPasswordChangeRequired: () =>
        setUser((current) => (current ? { ...current, mustChangePassword: true } : current)),
    });
  }, [endSession]);

  // Session restoration on app start - Persists across app closures and reboots
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initAccessToken();
        const [storedRefreshToken, storedUser, storedProfile] = await Promise.all([
          getRefreshToken(),
          getAuthUser(),
          getEmployeeProfile(),
        ]);

        if (!storedRefreshToken) {
          if (!cancelled) endSession();
          return;
        }

        // 1. Instantly hydrate state from local persistent storage (offline-first)
        if (storedUser) {
          if (!cancelled) {
            setUser(storedUser);
            if (storedProfile) {
              setEmployeeProfile(storedProfile);
              setIsProfileComplete(checkProfileCompleteness(storedProfile));
            }
            setStatus('authenticated');
          }
        }

        // 2. Perform background session refresh & profile sync
        try {
          const session = await refreshSession();
          if (cancelled) return;

          const sessionUser = session?.user || (session as any)?.data?.user;
          if (sessionUser) {
            const restored = toAuthUser(sessionUser);
            if (!restored.appRole) {
              await clearTokens();
              endSession(NO_MODULE_MESSAGE);
              return;
            }

            // Platform separation: reject ADMIN on mobile, allow EMPLOYEE and HR
            if (restored.appRole !== 'EMPLOYEE' && restored.appRole !== 'HR') {
              await clearTokens();
              endSession(RESTRICTED_APP_MESSAGE);
              return;
            }

            if (!cancelled) {
              setUser(restored);
              await saveAuthUser(restored);
              setStatus('authenticated');
            }
          }

          if (!cancelled) {
            try {
              const freshProfile = await getEmployeeMe();
              if (!cancelled && freshProfile) {
                setEmployeeProfile(freshProfile);
                setIsProfileComplete(checkProfileCompleteness(freshProfile));
                await saveEmployeeProfile(freshProfile);
                const empId = freshProfile?.employeeCode || freshProfile?.id;
                if (empId) {
                  try {
                    const statusRes = await getFaceStatus(empId);
                    setIsFaceEnrolled(statusRes.is_enrolled);
                  } catch {}
                }
              }
            } catch {
              // Non-fatal if offline
            }
          }
        } catch (error) {
          if (cancelled) return;

          // Only terminate session if token is genuinely rejected (401 / 403 from server)
          if (
            axios.isAxiosError(error) &&
            error.response &&
            [400, 401, 403].includes(error.response.status)
          ) {
            await clearTokens();
            endSession('Your session has expired. Please log in again.');
            return;
          }

          // If offline, connection timed out, 503, or temporary server error:
          // Keep the stored session alive!
          if (storedUser) {
            console.log('[Auth] Background refresh skipped due to network/server; maintaining offline session.');
            return;
          }

          const offline = axios.isAxiosError(error) && !error.response;
          endSession(offline ? 'Unable to reach the server. Please check your connection and log in.' : null);
        }
      } catch (err) {
        if (!cancelled) endSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await loginUser({ email: email.trim(), password: password.trim() });
      const accessTok = session?.accessToken || (session as any)?.data?.accessToken || '';
      const refreshTok = session?.refreshToken || (session as any)?.data?.refreshToken || accessTok;
      await saveTokens(accessTok, refreshTok);

      const sessionUser = session?.user || (session as any)?.data?.user;
      if (!sessionUser) {
        throw new Error('Authentication response is missing user information. Please try again.');
      }

      const loggedIn = toAuthUser(sessionUser);
      if (!loggedIn.appRole) {
        await logoutUser().catch(() => {});
        await clearTokens();
        throw new Error(NO_MODULE_MESSAGE);
      }

      // Platform Separation: allow EMPLOYEE and HR roles on mobile
      if (loggedIn.appRole !== 'EMPLOYEE' && loggedIn.appRole !== 'HR') {
        await logoutUser().catch(() => {});
        await clearTokens();
        throw new Error(RESTRICTED_APP_MESSAGE);
      }

      let profile: EmployeeProfile | null = null;
      if (!loggedIn.mustChangePassword) {
        try {
          profile = await getEmployeeMe();
          setEmployeeProfile(profile);
          setIsProfileComplete(checkProfileCompleteness(profile));
          const empId = profile?.employeeCode || profile?.id;
          if (empId) {
            try {
              const statusRes = await getFaceStatus(empId);
              setIsFaceEnrolled(statusRes.is_enrolled);
            } catch {}
          }
        } catch {
          // Fallback
        }
      }

      // Persist auth user and employee profile for offline app restarts
      await saveAuthUser(loggedIn);
      if (profile) {
        await saveEmployeeProfile(profile);
      }

      setNotice(null);
      setUser(loggedIn);
      setStatus('authenticated');
    },
    [],
  );

  const resetPassword = useCallback(
    async (newPassword: string) => {
      try {
        await resetPasswordApi(newPassword);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          try {
            setUser(await getCurrentUser());
          } catch {
            /* keep current state */
          }
        }
        throw error;
      }

      const fresh = await getCurrentUser();
      if (fresh.mustChangePassword) {
        throw new Error('The server did not confirm the password change. Please try again.');
      }
      setUser(fresh);
      await saveAuthUser(fresh);
      setNotice('Your password was updated successfully.');

      // Now check profile completeness and face enrollment
      try {
        const profile = await getEmployeeMe();
        setEmployeeProfile(profile);
        setIsProfileComplete(checkProfileCompleteness(profile));
        await saveEmployeeProfile(profile);
        await checkFaceEnrollment(profile);
      } catch {
        // Fallback
      }
    },
    [checkFaceEnrollment],
  );

  const logout = useCallback(async () => {
    await logoutUser().catch(() => {});
    await clearTokens();
    endSession();
  }, [endSession]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      employeeProfile,
      isProfileComplete,
      isFaceEnrolled,
      notice,
      clearNotice,
      login,
      resetPassword,
      refreshProfile,
      setProfileCompletedManually,
      checkFaceEnrollment,
      setFaceEnrolledManually,
      logout,
    }),
    [
      status,
      user,
      employeeProfile,
      isProfileComplete,
      isFaceEnrolled,
      notice,
      clearNotice,
      login,
      resetPassword,
      refreshProfile,
      setProfileCompletedManually,
      checkFaceEnrollment,
      setFaceEnrolledManually,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
