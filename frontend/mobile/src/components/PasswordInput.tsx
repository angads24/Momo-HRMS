import type { ComponentProps } from 'react';
import React, { useMemo, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { TextInput } from 'react-native-paper';
import { AppTextInput } from './AppTextInput';

type Props = Omit<ComponentProps<typeof AppTextInput>, 'secureTextEntry' | 'right'> & {
  /** Ref forwarded to the underlying RN TextInput for focus chaining */
  innerRef?: React.Ref<RNTextInput>;
};

// Stable lock icon so React Native Paper doesn't re-measure adornments on every keystroke
const defaultLeftIcon = <TextInput.Icon icon="lock-outline" forceTextInputFocus={false} />;

/** Password field with a smooth show / hide eye icon and stable native layout. */
export function PasswordInput({ innerRef, style, value, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  // Re-create right icon only when visibility actually changes, not on every keystroke
  const rightIcon = useMemo(
    () => (
      <TextInput.Icon
        icon={visible ? 'eye-off-outline' : 'eye-outline'}
        onPress={() => setVisible((current) => !current)}
        forceTextInputFocus={false}
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      />
    ),
    [visible]
  );

  return (
    <AppTextInput
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      left={defaultLeftIcon}
      value={value ?? ''}
      {...props}
      style={style}
      innerRef={innerRef}
      secureTextEntry={!visible}
      right={rightIcon}
    />
  );
}
