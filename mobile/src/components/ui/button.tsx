import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors } from '@/theme/colors';

/** 'inverse' and 'outline-inverse' are for navy backgrounds. */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse' | 'outline-inverse';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  /** Trailing icon, e.g. an arrow on a "continue" button. */
  icon?: LucideIcon;
}

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-accent-light border border-accent',
  ghost: 'bg-transparent',
  danger: 'bg-error',
  inverse: 'bg-white',
  'outline-inverse': 'bg-white/5 border border-white/30',
};

const textByVariant: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-primary',
  ghost: 'text-accent',
  danger: 'text-white',
  inverse: 'text-primary',
  'outline-inverse': 'text-white',
};

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, className = '', icon: Icon }: ButtonProps) {
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
        <ActivityIndicator color={['primary', 'danger', 'outline-inverse'].includes(variant) ? colors.card : colors.primary} />
      ) : (
        <>
          <Text className={`text-base font-semibold ${textByVariant[variant]}`}>{label}</Text>
          {Icon ? <Icon size={18} strokeWidth={2.4} color={['primary', 'danger', 'outline-inverse'].includes(variant) ? colors.card : colors.primary} style={{ marginLeft: 8 }} /> : null}
        </>
      )}
    </Pressable>
  );
}
