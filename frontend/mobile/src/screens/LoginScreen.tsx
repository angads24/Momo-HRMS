import { useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '../schemas/authSchemas';
import type { LoginFormValues } from '../schemas/authSchemas';
import { palette } from '../theme/theme';
import { getErrorMessage } from '../utils/errors';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, notice } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    control,
    handleSubmit,
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
      setSubmitError(getErrorMessage(error, 'Login failed. Please try again.'));
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo / Brand */}
          <View style={styles.brandSection}>
            <View style={styles.logoWrap}>
              <MaterialCommunityIcons name="shield-account" size={40} color={palette.primary} />
            </View>
            <Text style={styles.appName}>Momo HRMS</Text>
            <Text style={styles.tagline}>Secure Workforce Management</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            {/* Notice */}
            {notice ? (
              <View style={styles.noticeBox}>
                <MaterialCommunityIcons name="information" size={16} color={palette.info} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            {/* Error */}
            {submitError ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={palette.error} />
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputRow, errors.email && styles.inputRowError]}>
                    <MaterialCommunityIcons name="email-outline" size={18} color={palette.muted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="you@company.com"
                      placeholderTextColor={palette.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      textColor={palette.ink}
                      theme={{ colors: { background: 'transparent' } }}
                    />
                  </View>
                )}
              />
              {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputRow, errors.password && styles.inputRowError]}>
                    <MaterialCommunityIcons name="lock-outline" size={18} color={palette.muted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Your password"
                      placeholderTextColor={palette.muted}
                      secureTextEntry={!passwordVisible}
                      autoCapitalize="none"
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      textColor={palette.ink}
                      theme={{ colors: { background: 'transparent' } }}
                      right={
                        <TextInput.Icon
                          icon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                          color={palette.muted}
                          onPress={() => setPasswordVisible((v) => !v)}
                        />
                      }
                    />
                  </View>
                )}
              />
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, (!isValid || isSubmitting) && styles.submitBtnDisabled]}
              onPress={onSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <Text style={styles.submitBtnText}>Signing in...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="login" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <View style={styles.footer}>
            <MaterialCommunityIcons name="help-circle-outline" size={14} color={palette.muted} />
            <Text style={styles.footerText}>
              Forgot your password? Contact your HR or administrator.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  // Brand
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: palette.primary + '20',
    borderWidth: 1, borderColor: palette.primary + '40',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  appName: { color: palette.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: palette.muted, fontSize: 13, marginTop: 4 },

  // Card
  card: {
    backgroundColor: palette.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: { color: palette.ink, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { color: palette.muted, fontSize: 14, marginBottom: 24 },

  // Alerts
  noticeBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: palette.info + '15', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: palette.info + '30' },
  noticeText: { flex: 1, color: palette.info, fontSize: 13, lineHeight: 18 },
  errorBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: palette.error + '15', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: palette.error + '30' },
  errorText: { flex: 1, color: palette.error, fontSize: 13, lineHeight: 18 },

  // Inputs
  inputWrap: { marginBottom: 16 },
  inputLabel: { color: palette.inkSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: palette.surfaceElevated,
    borderRadius: 12, borderWidth: 1, borderColor: palette.border,
    overflow: 'hidden',
  },
  inputRowError: { borderColor: palette.error + '80' },
  inputIcon: { marginLeft: 12 },
  textInput: { flex: 1, backgroundColor: 'transparent', fontSize: 15 },
  fieldError: { color: palette.error, fontSize: 12, marginTop: 4 },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: palette.primary,
    borderRadius: 14, paddingVertical: 16,
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Footer
  footer: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 24, paddingHorizontal: 4 },
  footerText: { flex: 1, color: palette.muted, fontSize: 12, lineHeight: 18 },
});
