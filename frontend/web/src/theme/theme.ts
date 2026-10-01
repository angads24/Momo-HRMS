import { createTheme } from '@mui/material/styles';

export const palette = {
  // Orange & Sunset Brand Colors
  primary: '#FF6B35',
  primaryLight: '#FFA06B',
  primaryDark: '#E8551E',
  primaryGlow: 'rgba(255, 107, 53, 0.25)',
  
  // Secondary / Accent Amber
  accent: '#FF8A00',
  accentLight: '#FFA733',
  accentDark: '#D47200',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
  gradientSunset: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
  gradientWarm: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
  gradientHero: 'radial-gradient(ellipse at 20% 20%, rgba(255, 107, 53, 0.18) 0%, rgba(255, 160, 67, 0.08) 50%, #FFFFFF 100%)',

  // Neutrals / White Surface Layers
  ink: '#1F2937',
  inkSecondary: '#4B5563',
  muted: '#6B7280',
  background: '#FDFCFB',
  backgroundWarm: '#FFFBF7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF7ED',
  border: '#FED7AA',
  borderLight: '#F3F4F6',

  // Semantic
  success: '#10B981',
  successSurface: '#ECFDF5',
  warning: '#F59E0B',
  warningSurface: '#FFFBEB',
  error: '#EF4444',
  errorSurface: '#FEF2F2',
  info: '#3B82F6',
  infoSurface: '#EFF6FF',
} as const;

export const theme = createTheme({
  palette: {
    primary: {
      main: palette.primary,
      light: palette.primaryLight,
      dark: palette.primaryDark,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: palette.accent,
      light: palette.accentLight,
      dark: palette.accentDark,
      contrastText: '#FFFFFF',
    },
    error: { main: palette.error },
    warning: { main: palette.warning },
    success: { main: palette.success },
    info: { main: palette.info },
    background: {
      default: palette.background,
      paper: palette.surface,
    },
    text: {
      primary: palette.ink,
      secondary: palette.inkSecondary,
    },
    divider: palette.border,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Manrope", "Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
    h3: { fontWeight: 800, letterSpacing: -0.8 },
    h4: { fontWeight: 800, letterSpacing: -0.5 },
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0.2 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 10,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 14px rgba(255, 107, 53, 0.25)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(255, 107, 53, 0.06), 0 1px 3px rgba(0,0,0,0.04)',
          border: `1px solid ${palette.borderLight}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
  },
});
