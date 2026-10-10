import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Plain-text label read by screen readers. */
  accessibilityLabel: string;
  error?: string;
  children: ReactNode;
}

export function Checkbox({ checked, onChange, accessibilityLabel, error, children }: CheckboxProps) {
  return (
    <View className="mb-4">
      <View className="flex-row items-start gap-3">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={accessibilityLabel}
          hitSlop={10}
          onPress={() => onChange(!checked)}
          className={`mt-0.5 h-6 w-6 items-center justify-center rounded-lg border-[1.5px] ${
            checked ? 'border-primary bg-primary' : error ? 'border-error bg-card' : 'border-border bg-card'
          }`}>
          {checked && <Check size={16} color={colors.card} strokeWidth={3} />}
        </Pressable>
        <View className="flex-1">{children}</View>
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="ml-9 mt-1 text-sm text-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
