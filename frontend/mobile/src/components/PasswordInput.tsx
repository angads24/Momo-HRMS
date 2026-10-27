import type { ComponentProps } from 'react';
import type React from 'react';
import { useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { TextInput } from 'react-native-paper';
import { AppTextInput } from './AppTextInput';

type Props = Omit<ComponentProps<typeof AppTextInput>, 'secureTextEntry' | 'right'> & {
  /** Ref forwarded to the underlying RN TextInput for focus chaining */
  innerRef?: React.Ref<RNTextInput>;
};

/** Password field with a show / hide eye icon. */
export function PasswordInput({ innerRef, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <AppTextInput
      autoCapitalize="none"
      autoCorrect={false}
      left={<TextInput.Icon icon="lock-outline" />}
      {...props}
      innerRef={innerRef}
      secureTextEntry={!visible}
      right={
        <TextInput.Icon
          icon={visible ? 'eye-off-outline' : 'eye-outline'}
          onPress={() => setVisible((current) => !current)}
          forceTextInputFocus={false}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        />
      }
    />
  );
}
