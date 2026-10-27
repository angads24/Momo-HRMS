import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { COMPANY_NAME } from '../config/env';
import { palette } from '../theme/theme';

interface Props {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

/** App logo + company name + screen heading. */
export function AppHeader({ title, subtitle, showLogo = true }: Props) {
  return (
    <View style={styles.container}>
      {showLogo && (
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.company}>{COMPANY_NAME}</Text>
        </View>
      )}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  company: { fontSize: 20, fontWeight: '800', color: palette.ink, letterSpacing: -0.3 },
  title: { fontSize: 30, fontWeight: '800', color: palette.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: palette.muted, marginTop: 6, lineHeight: 22 },
});
