import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/colors';

interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string;
  /** Renders a show/hide toggle and hides the text by default. */
  password?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, password = false, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [hidden, setHidden] = useState(password);
  const [focused, setFocused] = useState(false);

  const borderClass = error ? 'border-error' : focused ? 'border-accent' : 'border-border';

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-ink">{label}</Text>
      <View className={`h-14 flex-row items-center rounded-2xl border bg-card px-4 ${borderClass}`}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={hidden}
          className="flex-1 text-base text-ink"
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={12}
            onPress={() => setHidden((h) => !h)}>
            {hidden ? <Eye size={20} color={colors.textSecondary} /> : <EyeOff size={20} color={colors.textSecondary} />}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="mt-1.5 text-sm text-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
