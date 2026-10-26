import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../types/auth';
import type { EmployeeProfile } from './employeeApi';

/**
 * Encrypted persistent storage for the MOBILE app.
 *  - Refresh token, access token, user session, and profile are stored in
 *    Expo SecureStore (Keychain on iOS, Keystore/EncryptedSharedPreferences on Android).
 *  - Kept intact until user explicitly logs out or token is revoked by server.
 */
const REFRESH_TOKEN_KEY = 'hrms_refresh_token';
const ACCESS_TOKEN_KEY = 'hrms_access_token';
const AUTH_USER_KEY = 'hrms_auth_user';
const EMPLOYEE_PROFILE_KEY = 'hrms_employee_profile';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export async function initAccessToken(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (stored) {
      accessToken = stored;
    }
    return accessToken;
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveTokens(newAccessToken: unknown, newRefreshToken: unknown): Promise<void> {
  accessToken = typeof newAccessToken === 'string' ? newAccessToken : (newAccessToken ? String(newAccessToken) : null);

  try {
    if (accessToken) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    }

    if (typeof newRefreshToken === 'string' && newRefreshToken.trim().length > 0) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken.trim());
    } else if (newRefreshToken && typeof newRefreshToken === 'object') {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, JSON.stringify(newRefreshToken));
    } else if (accessToken) {
      // Fallback: preserve session token if refresh token was omitted in response
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, String(accessToken));
    }
  } catch (err) {
    console.warn('[SecureStore] Failed to persist tokens:', err);
  }
}

export async function saveAuthUser(user: AuthUser | null): Promise<void> {
  try {
    if (user) {
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    }
  } catch (err) {
    console.warn('[SecureStore] Failed to persist auth user:', err);
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function saveEmployeeProfile(profile: EmployeeProfile | null): Promise<void> {
  try {
    if (profile) {
      await SecureStore.setItemAsync(EMPLOYEE_PROFILE_KEY, JSON.stringify(profile));
    } else {
      await SecureStore.deleteItemAsync(EMPLOYEE_PROFILE_KEY);
    }
  } catch (err) {
    console.warn('[SecureStore] Failed to persist employee profile:', err);
  }
}

export async function getEmployeeProfile(): Promise<EmployeeProfile | null> {
  try {
    const raw = await SecureStore.getItemAsync(EMPLOYEE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EmployeeProfile;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  await Promise.allSettled([
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_USER_KEY),
    SecureStore.deleteItemAsync(EMPLOYEE_PROFILE_KEY),
  ]);
}
