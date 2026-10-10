import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors } from '@/theme/colors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-accent-light border border-accent',
  ghost: 'bg-transparent',
  danger: 'bg-error',
};

const textByVariant: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-primary',
  ghost: 'text-accent',
  danger: 'text-white',
};

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, className = '' }: ButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={`h-14 flex-row items-center justify-center rounded-2xl px-5 active:opacity-80 ${containerByVariant[variant]} ${inactive ? 'opacity-60' : ''} ${className}`}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.card : colors.primary} />
      ) : (
        <Text className={`text-base font-semibold ${textByVariant[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
