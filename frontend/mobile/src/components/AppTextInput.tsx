import type { ComponentProps } from 'react';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

type Props = ComponentProps<typeof TextInput> & {
  /** Validation message. When set, the field turns red. */
  errorText?: string;
  /** Ref forwarded to the underlying TextInput for focus chaining between fields */
  innerRef?: React.Ref<RNTextInput>;
};

/** Rounded outlined text field with a built-in error line. */
export function AppTextInput({ errorText, style, innerRef, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        mode="outlined"
        outlineStyle={styles.outline}
        style={[styles.input, style]}
        ref={innerRef as any}
        {...rest}
        error={Boolean(errorText)}
      />
      <HelperText type="error" visible={Boolean(errorText)} style={styles.helper}>
        {errorText}
      </HelperText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 2 },
  input: { backgroundColor: '#FFFFFF' },
  outline: { borderRadius: 12 },
  helper: { paddingHorizontal: 4 },
});
