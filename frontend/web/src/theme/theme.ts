import { createTheme } from '@mui/material/styles';

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
  successLight: '#F0FDF4',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  info: '#2563EB',
  infoLight: '#EFF6FF',
} as const;

export const theme = createTheme({
  palette: {
    primary: {
      main: palette.primary,
      dark: palette.primaryDark,
      light: palette.primaryLight,
    },
    error: {
      main: palette.error,
      light: palette.errorLight,
    },
    warning: {
      main: palette.warning,
      light: palette.warningLight,
    },
    success: {
      main: palette.success,
      light: palette.successLight,
    },
    info: {
      main: palette.info,
      light: palette.infoLight,
    },
    background: {
      default: palette.background,
      paper: palette.surface,
    },
    text: {
      primary: palette.ink,
      secondary: palette.muted,
    },
    divider: palette.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", system-ui, -apple-system, sans-serif',
    h3: { fontWeight: 800, letterSpacing: '-0.02em', color: palette.ink },
    h4: { fontWeight: 800, letterSpacing: '-0.02em', color: palette.ink },
    h5: { fontWeight: 700, letterSpacing: '-0.01em', color: palette.ink },
    h6: { fontWeight: 700, color: palette.ink },
    subtitle1: { fontWeight: 600, color: palette.ink },
    subtitle2: { fontWeight: 600, color: palette.muted },
    body1: { color: palette.body, lineHeight: 1.6 },
    body2: { color: palette.body, lineHeight: 1.55 },
    caption: { color: palette.muted },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
      styleOverrides: {
        root: {
          '&.Mui-focusVisible, &:focus-visible': {
            outline: '2px solid #2563eb',
            outlineOffset: 2,
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '&.Mui-focusVisible, &:focus-visible': {
            outline: '2px solid #2563eb',
            outlineOffset: 2,
            backgroundColor: 'transparent',
          },
        },
        text: {
          '&.Mui-focusVisible, &:focus-visible': {
            backgroundColor: 'transparent',
          },
        },
        outlined: {
          '&.Mui-focusVisible, &:focus-visible': {
            backgroundColor: 'transparent',
          },
        },
        sizeMedium: {
          minHeight: 40,
          padding: '8px 16px',
        },
        sizeSmall: {
          minHeight: 32,
          padding: '4px 12px',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible, &:focus-visible': {
            outline: '2px solid #2563eb',
            outlineOffset: 2,
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible, &:focus-visible': {
            outline: '2px solid #2563eb',
            outlineOffset: -2,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible, &:focus-visible': {
            outline: '2px solid #2563eb',
            outlineOffset: -2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: palette.border,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderColor: palette.border,
          boxShadow: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: palette.borderSubtle,
          fontSize: '0.875rem',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 700,
          backgroundColor: '#F8FAFC',
          color: palette.muted,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
          '&.Mui-focusVisible, &:focus-visible': {
            outline: '2px solid #2563eb',
            outlineOffset: 2,
          },
        },
        sizeSmall: {
          height: 22,
          fontSize: '0.75rem',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          borderColor: palette.borderDark,
          backgroundColor: '#FFFFFF',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.primary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.primary,
            borderWidth: 2,
          },
        },
        input: {
          outline: 'none !important',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          outline: 'none !important',
        },
        input: {
          outline: 'none !important',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.ink,
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 6,
          padding: '6px 10px',
        },
      },
    },
  },
});
