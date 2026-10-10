import { AlertCircle, Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/colors';

interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string;
  /** Leading icon inside the field. */
  icon?: LucideIcon;
  /** Renders a show/hide toggle and hides the text by default. */
  password?: boolean;
  /** Extra content under the field (e.g. a password strength meter). */
  children?: ReactNode;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, icon: Icon, password = false, onFocus, onBlur, children, ...inputProps },
  ref,
) {
  const [hidden, setHidden] = useState(password);
  const [focused, setFocused] = useState(false);

  const borderClass = error ? 'border-error' : focused ? 'border-accent' : 'border-border';
  const iconColor = error ? colors.error : focused ? colors.accent : colors.textSecondary;

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-semibold text-ink">{label}</Text>
      <View
        className={`h-14 flex-row items-center gap-3 rounded-2xl border-[1.5px] bg-card px-4 ${borderClass}`}
        style={focused && !error ? { shadowColor: colors.accent, shadowOpacity: 0.18, shadowRadius: 8, elevation: 2 } : undefined}>
        {Icon && <Icon size={20} color={iconColor} />}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor="#9AA1B3"
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
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <AlertCircle size={14} color={colors.error} />
          <Text accessibilityRole="alert" className="flex-1 text-sm text-error">
            {error}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
});
