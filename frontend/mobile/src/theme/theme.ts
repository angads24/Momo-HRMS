import { MD3LightTheme } from 'react-native-paper';

export const palette = {
  primary: '#1B4B8F',
  primaryDark: '#123260',
  primaryLight: '#EFF6FF',
  primarySubtle: '#DBEAFE',
  ink: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  subtle: '#94A3B8',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderDark: '#CBD5E1',
  success: '#16A34A',
  successSurface: '#F0FDF4',
  error: '#DC2626',
  errorSurface: '#FEF2F2',
  warning: '#D97706',
  warningSurface: '#FFFBEB',
  info: '#2563EB',
  infoSurface: '#EFF6FF',
} as const;

export const theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    background: palette.background,
    surface: palette.surface,
    onSurface: palette.ink,
    error: palette.error,
    outline: palette.border,
  },
};

