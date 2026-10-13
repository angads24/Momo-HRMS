import { NativeModules } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically resolves the host IP:
 * 1. Checks Expo Constants hostUri (auto-detected from Metro bundler on phone).
 * 2. Checks NativeModules.SourceCode.scriptURL.
 * 3. Checks EXPO_PUBLIC_API_URL from .env.
 * 4. Falls back to current PC LAN IP: 10.37.165.35.
 */
function resolveHost(): string {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
      (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}`;
      }
    }

    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}`;
      }
    }
  } catch {}

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {}
  }

  return 'http://10.37.165.35';
}

const currentHost = resolveHost();

// Sanitize raw env URL: Port 8081 is the Expo Metro bundler, NEVER the backend API Gateway (port 8000).
let rawEnvUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
if (rawEnvUrl.includes(':8081')) {
  rawEnvUrl = rawEnvUrl.replace(':8081', ':8000');
}

const isUnifiedGateway =
  rawEnvUrl.startsWith('https://') ||
  rawEnvUrl.includes(':8000') ||
  process.env.EXPO_PUBLIC_USE_GATEWAY === 'true' ||
  !rawEnvUrl;

const unifiedGatewayUrl = rawEnvUrl
  ? (rawEnvUrl.endsWith('/api/v1') ? rawEnvUrl : `${rawEnvUrl}/api/v1`)
  : `${currentHost}:8000/api/v1`;

export const GATEWAY_URL = unifiedGatewayUrl;
export const AUTH_API_URL = isUnifiedGateway ? unifiedGatewayUrl : `${currentHost}:3001/api/v1`;
export const ATTENDANCE_API_URL = isUnifiedGateway ? unifiedGatewayUrl : `${currentHost}:3002/api/v1`;
export const GEOFENCE_API_URL = isUnifiedGateway ? unifiedGatewayUrl : `${currentHost}:3003/api/v1`;
export const EMPLOYEE_API_URL = isUnifiedGateway ? unifiedGatewayUrl : `${currentHost}:3004/api/v1`;
export const NOTIFICATION_API_URL = isUnifiedGateway ? unifiedGatewayUrl : `${currentHost}:3005/api/v1`;
export const FACE_API_URL = isUnifiedGateway ? unifiedGatewayUrl : `${currentHost}:3006/api/v1`;

export const API_URL = AUTH_API_URL;
export const COMPANY_NAME = 'Momo HRMS';
