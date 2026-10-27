import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from 'react-native-paper';

type Props = ComponentProps<typeof Button> & {
  haptic?: boolean;
};

/** Full-width, rounded primary button with haptic feedback. Pass `loading` to show a spinner. */
export function AppButton({
  style,
  contentStyle,
  labelStyle,
  mode = 'contained',
  haptic = true,
  onPress,
  ...rest
}: Props) {
  const handlePress = (e: any) => {
    if (haptic && mode === 'contained') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  return (
    <Button
      mode={mode}
      style={[styles.button, style]}
      contentStyle={[styles.content, contentStyle]}
      labelStyle={[styles.label, labelStyle]}
      onPress={handlePress}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 12 },
  content: { height: 52 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
