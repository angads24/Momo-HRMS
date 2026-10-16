import { NativeModules } from 'react-native';
let Constants: any = null;
try {
  Constants = require('expo-constants')?.default ?? require('expo-constants');
} catch {}

/**
 * Default production backend gateway deployed on Render.
 * Guaranteed fallback if .env is omitted during EAS cloud builds.
 */
export const DEFAULT_PRODUCTION_GATEWAY = 'https://momo-hrms-backend.onrender.com';

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

  return DEFAULT_PRODUCTION_GATEWAY;
}

const currentHost = resolveHost();

// Read and sanitize env URL, defaulting to deployed Render production gateway
let rawEnvUrl = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_PRODUCTION_GATEWAY).trim().replace(/\/+$/, '');
if (rawEnvUrl.includes(':8081')) {
  rawEnvUrl = rawEnvUrl.replace(':8081', ':8000');
}

const isUnifiedGateway = true;

const unifiedGatewayUrl = rawEnvUrl.endsWith('/api/v1')
  ? rawEnvUrl
  : `${rawEnvUrl}/api/v1`;

export const GATEWAY_URL = unifiedGatewayUrl;
export const AUTH_API_URL = unifiedGatewayUrl;
export const ATTENDANCE_API_URL = unifiedGatewayUrl;
export const GEOFENCE_API_URL = unifiedGatewayUrl;
export const EMPLOYEE_API_URL = unifiedGatewayUrl;
export const NOTIFICATION_API_URL = unifiedGatewayUrl;
export const FACE_API_URL = unifiedGatewayUrl;

export const API_URL = AUTH_API_URL;
export const COMPANY_NAME = 'Momo HRMS';
