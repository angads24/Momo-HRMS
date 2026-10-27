import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { palette } from '../theme/theme';

interface Props {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingIndicator({ message, fullScreen = false }: Props) {
  if (fullScreen) {
    return <SplashLoader message={message} />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={palette.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

/** Branded full-screen loading state with animated logo */
function SplashLoader({ message }: { message?: string }) {
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Subtle pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, []);

  return (
    <View style={styles.splash}>
      <Animated.View
        style={[
          styles.splashContent,
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </Animated.View>
        <Text style={styles.splashBrand}>Momo HRMS</Text>
        <Text style={styles.splashTagline}>Smart Attendance Management</Text>
      </Animated.View>

      <View style={styles.splashBottom}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
        {message ? (
          <Text style={styles.splashMessage}>{message}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  message: { marginTop: 12, color: palette.muted },

  // Branded splash
  splash: {
    flex: 1,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
    gap: 12,
  },
  splashLogo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  splashBrand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  splashTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  splashBottom: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 10,
  },
  splashMessage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
});
