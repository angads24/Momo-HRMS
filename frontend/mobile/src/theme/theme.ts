import { MD3LightTheme } from 'react-native-paper';

export const palette = {
  // Brand: Vibrant Sunset & Tangerine Orange
  primary: '#FF6B35',
  primaryLight: '#FFA06B',
  primaryDark: '#E8551E',
  accent: '#FF8A00',
  accentLight: '#FFA733',

  // Semantic
  success: '#10B981',
  successSurface: '#ECFDF5',
  warning: '#F59E0B',
  warningSurface: '#FFFBEB',
  error: '#EF4444',
  errorSurface: '#FEF2F2',
  info: '#3B82F6',
  infoSurface: '#EFF6FF',

  // White and soft warm layers
  background: '#FDFCFB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF7ED',
  card: '#FFFFFF',
  border: '#FED7AA',
  borderLight: '#F3F4F6',

  // Text: High-contrast charcoal on white
  ink: '#1F2937',
  inkSecondary: '#4B5563',
  muted: '#9CA3AF',

  // Status colors
  checked_in: '#10B981',
  checked_out: '#EF4444',
  paused: '#F59E0B',
  working: '#FF6B35',
} as const;

export const theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    background: palette.background,
    surface: palette.surface,
    surfaceVariant: palette.surfaceElevated,
    onSurface: palette.ink,
    onSurfaceVariant: palette.inkSecondary,
    error: palette.error,
    outline: palette.border,
    secondary: palette.accent,
    onBackground: palette.ink,
    elevation: {
      level0: 'transparent',
      level1: palette.surface,
      level2: palette.surfaceElevated,
      level3: palette.card,
      level4: palette.card,
      level5: palette.card,
    },
  },
};
