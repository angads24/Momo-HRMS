import * as SecureStore from 'expo-secure-store';

/**
 * Token storage for the MOBILE app.
 *  - refresh token (long lived)  -> Expo SecureStore (Keychain / Keystore, encrypted)
 *  - access token (15 minutes)   -> memory only, never written to disk
 * Passwords are never stored anywhere.
 */
const REFRESH_TOKEN_KEY = 'hrms_refresh_token';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
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
    if (typeof newRefreshToken === 'string' && newRefreshToken.trim().length > 0) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken.trim());
    } else if (newRefreshToken && typeof newRefreshToken === 'object') {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, JSON.stringify(newRefreshToken));
    } else if (accessToken) {
      // Fallback: preserve session token if refresh token was omitted in response
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, String(accessToken));
    }
  } catch (err) {
    console.warn('[SecureStore] Failed to persist token:', err);
  }
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore error if key was not found
  }
}
