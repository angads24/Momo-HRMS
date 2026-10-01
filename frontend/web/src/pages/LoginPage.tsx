import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BadgeIcon from '@mui/icons-material/Badge';
import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ErrorMessage } from '../components/ErrorMessage';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '../schemas/authSchemas';
import type { LoginFormValues } from '../schemas/authSchemas';
import { getErrorMessage } from '../utils/errors';
import { COMPANY_NAME } from '../config/env';

export default function LoginPage() {
  const { login, notice } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values.email, values.password);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Login failed. Please verify credentials.'));
    }
  });

  const handleFillCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true, shouldDirty: true });
    setValue('password', pass, { shouldValidate: true, shouldDirty: true });
    setSubmitError(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: '#FFFFFF',
        color: '#1F2937',
      }}
    >
      {/* Left Pane - Orange Sunset Gradient Showcase */}
      <Box
        sx={{
          flex: '1 1 54%',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 6, lg: 8 },
          background: 'linear-gradient(145deg, #FF5722 0%, #FF6B35 45%, #FFA043 100%)',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '4px 0 24px rgba(255, 107, 53, 0.15)',
        }}
      >
        {/* Subtle geometric dot pattern */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255, 255, 255, 0.15) 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
          }}
        />

        {/* Ambient warm glows */}
        <Box
          sx={{
            position: 'absolute',
            top: '-15%',
            right: '-10%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Header */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2.5,
                background: '#FFFFFF',
                color: '#FF6B35',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: 24,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              }}
            >
              M
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5, color: '#FFFFFF' }}>
              {COMPANY_NAME}
            </Typography>
            <Chip
              label="ENTERPRISE SUITE"
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.22)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                fontWeight: 800,
                fontSize: 11,
                ml: 1,
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
            Next-Generation Smart Workforce Attendance & Biometric Geofencing Portal
          </Typography>
        </Box>

        {/* Center Architectural Showcase Cards */}
        <Box sx={{ position: 'relative', zIndex: 1, my: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              lineHeight: 1.15,
              mb: 2.5,
              color: '#FFFFFF',
              textShadow: '0 2px 10px rgba(0,0,0,0.1)',
            }}
          >
            Zero-Trust Biometric & Geofenced Attendance.
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: 16,
              lineHeight: 1.6,
              mb: 4,
              maxWidth: 540,
            }}
          >
            Unified multi-microservice platform combining real-time YuNet + SFace neural biometrics, GPS polygon geofence confinement, and instant automated reporting.
          </Typography>

          {/* Feature Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5, maxWidth: 580 }}>
            <Card
              sx={{
                p: 2.5,
                bgcolor: 'rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#FFFFFF',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <FingerprintIcon sx={{ color: '#FFE0B2', fontSize: 26 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                  SFace AI Verification
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.4, display: 'block' }}>
                Automated hands-free face detection with active liveness challenge response.
              </Typography>
            </Card>

            <Card
              sx={{
                p: 2.5,
                bgcolor: 'rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#FFFFFF',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <LocationCityIcon sx={{ color: '#FFE0B2', fontSize: 26 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                  Polygon Geofencing
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.4, display: 'block' }}>
                Pre-flight location perimeter verification blocks outside check-in attempts.
              </Typography>
            </Card>
          </Box>
        </Box>

        {/* Footer badges */}
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedUserIcon sx={{ color: '#FFE0B2', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 600 }}>
              ISO/IEC 30107 Anti-Spoofing
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon sx={{ color: '#FFE0B2', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 600 }}>
              AES-256-GCM Vector Encryption
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right Pane - Clean White Login Card */}
      <Box
        sx={{
          flex: '1 1 46%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, sm: 6, lg: 8 },
          bgcolor: '#FFFBF7',
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 480,
            p: { xs: 3, sm: 4.5 },
            bgcolor: '#FFFFFF',
            borderRadius: 4,
            border: '1px solid #FED7AA',
            boxShadow: '0 20px 48px rgba(255, 107, 53, 0.08), 0 4px 12px rgba(0,0,0,0.03)',
            color: '#1F2937',
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: '#FFF7ED',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <SecurityIcon sx={{ color: '#FF6B35', fontSize: 22 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1F2937' }}>
                HR & Admin Portal
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              Sign in with your corporate credentials to manage workforce operations.
            </Typography>
          </Box>

          {/* Quick Demo Credentials Autofill Banner */}
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              bgcolor: '#FFF7ED',
              border: '1px solid #FED7AA',
            }}
          >
            <Typography variant="caption" sx={{ color: '#EA580C', fontWeight: 800, display: 'block', mb: 1.2, letterSpacing: 0.5 }}>
              ⚡ QUICK DEMO CREDENTIALS (CLICK TO AUTO-FILL)
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<BadgeIcon fontSize="small" sx={{ color: '#EA580C' }} />}
                onClick={() => handleFillCredentials('hr@company.com', 'HrAdmin123!')}
                sx={{
                  bgcolor: '#FFFFFF',
                  borderColor: '#FED7AA',
                  color: '#EA580C',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  py: 0.6,
                  px: 1.5,
                  '&:hover': {
                    bgcolor: '#FFF7ED',
                    borderColor: '#FF6B35',
                  },
                }}
              >
                HR Admin (hr@company.com)
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<AdminPanelSettingsIcon fontSize="small" sx={{ color: '#C2410C' }} />}
                onClick={() => handleFillCredentials('admin@company.com', 'Admin123!')}
                sx={{
                  bgcolor: '#FFFFFF',
                  borderColor: '#FED7AA',
                  color: '#C2410C',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  py: 0.6,
                  px: 1.5,
                  '&:hover': {
                    bgcolor: '#FFF7ED',
                    borderColor: '#FF6B35',
                  },
                }}
              >
                Super Admin (admin@company.com)
              </Button>
            </Box>

            <Typography variant="caption" sx={{ color: '#9A3412', mt: 1.2, display: 'block', fontWeight: 500 }}>
              HR Password: <strong style={{ color: '#EA580C' }}>HrAdmin123!</strong> | Admin Password: <strong style={{ color: '#EA580C' }}>Admin123!</strong>
            </Typography>
          </Box>

          <ErrorMessage message={notice} variant="info" />
          <ErrorMessage message={submitError} />

          {/* Form */}
          <form onSubmit={onSubmit} noValidate>
            <Controller
              control={control}
              name="email"
              render={({ field: { ref, ...field } }) => (
                <AppTextInput
                  {...field}
                  inputRef={ref}
                  label="Corporate Email or Username"
                  type="email"
                  autoComplete="email"
                  errorText={errors.email?.message}
                  sx={{
                    mb: 2,
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      '& fieldset': {
                        borderColor: '#E5E7EB',
                      },
                      '&:hover fieldset': {
                        borderColor: '#FF6B35',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#FF6B35',
                      },
                    },
                    '& input': { color: '#1F2937' },
                    '& label': { color: '#6B7280' },
                    '& label.Mui-focused': { color: '#FF6B35' },
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon sx={{ color: '#9CA3AF' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { ref, ...field } }) => (
                <PasswordInput
                  {...field}
                  inputRef={ref}
                  label="Password"
                  sx={{
                    mb: 2.5,
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      '& fieldset': {
                        borderColor: '#E5E7EB',
                      },
                      '&:hover fieldset': {
                        borderColor: '#FF6B35',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#FF6B35',
                      },
                    },
                    '& input': { color: '#1F2937' },
                    '& label': { color: '#6B7280' },
                    '& label.Mui-focused': { color: '#FF6B35' },
                  }}
                />
              )}
            />

            <AppButton
              type="submit"
              fullWidth
              loading={isSubmitting}
              disabled={!isValid || isSubmitting}
              sx={{
                py: 1.4,
                fontSize: 15,
                fontWeight: 800,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
                color: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(255, 107, 53, 0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #E8551E 0%, #FF8A00 100%)',
                },
              }}
            >
              Sign In to Management Portal
            </AppButton>
          </form>

          <Divider sx={{ my: 3, borderColor: '#FED7AA' }} />

          {/* Mobile App Reminder */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#FFF7ED',
              border: '1px solid #FED7AA',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <PhoneIphoneIcon sx={{ color: '#FF6B35', fontSize: 28 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1F2937' }}>
                Employee Mobile App
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', lineHeight: 1.4 }}>
                Daily biometric face clock-in & geofence punch are secured on the Momo Mobile App.
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
