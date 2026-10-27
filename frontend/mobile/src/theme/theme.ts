import { MD3LightTheme } from 'react-native-paper';

export const palette = {
  // Primary — vibrant indigo-blue
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primarySubtle: '#DBEAFE',
  primaryGradientStart: '#3B82F6',
  primaryGradientEnd: '#1D4ED8',

  // Accent — for badges & highlights
  accent: '#7C3AED',
  accentLight: '#F5F3FF',

  // Text
  ink: '#0F172A',
  body: '#1E293B',
  muted: '#64748B',
  subtle: '#94A3B8',

  // Surfaces
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFBFF',

  // Borders
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderDark: '#CBD5E1',

  // Semantic
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
    secondaryContainer: palette.primaryLight,
    onSecondaryContainer: palette.primaryDark,
  },
};
