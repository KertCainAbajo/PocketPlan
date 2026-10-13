import { Delete, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { PIN_LENGTH } from '@/features/security/app-lock';
import { colors } from '@/theme/colors';

/** Row of dots showing how many digits are entered. Shakes when `errorKey` changes. */
export function PinDots({ length, errorKey = 0, error = false, light = false }: { length: number; errorKey?: number; error?: boolean; light?: boolean }) {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!errorKey) return;
    shake.set(withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    ));
  }, [errorKey, shake]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const filled = error ? colors.error : light ? '#FFFFFF' : colors.primary;
  const empty = light ? 'rgba(255,255,255,0.25)' : colors.border;

  return (
    <Animated.View style={style} className="flex-row justify-center gap-4" accessible accessibilityLabel={`${length} of ${PIN_LENGTH} digits entered`}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <View
          key={i}
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: i < length ? filled : 'transparent', borderWidth: 2, borderColor: i < length ? filled : empty }}
        />
      ))}
    </Animated.View>
  );
}

/**
 * 3×4 number pad. The bottom-left key is optional (e.g. a fingerprint button);
 * bottom-right deletes the last digit.
 */
export function PinKeypad({
  onDigit,
  onDelete,
  extraKey,
  light = false,
  disabled = false,
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  extraKey?: { Icon: LucideIcon; label: string; onPress: () => void };
  light?: boolean;
  disabled?: boolean;
}) {
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];
  const keyBg = light ? 'bg-white/10' : 'bg-card';
  const text = light ? 'text-white' : 'text-ink';
  const iconColor = light ? '#FFFFFF' : colors.primary;

  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row[0]} className="flex-row justify-center gap-5">
          {row.map((digit) => <Key key={digit} label={digit} className={`${keyBg}`} onPress={() => onDigit(digit)} disabled={disabled}><Text className={`text-[28px] font-semibold ${text}`}>{digit}</Text></Key>)}
        </View>
      ))}
      <View className="flex-row justify-center gap-5">
        {extraKey ? (
          <Key label={extraKey.label} onPress={extraKey.onPress} disabled={disabled}>
            <extraKey.Icon size={28} color={iconColor} strokeWidth={1.8} />
          </Key>
        ) : (
          <View className="h-[74px] w-[74px]" />
        )}
        <Key label="0" className={keyBg} onPress={() => onDigit('0')} disabled={disabled}><Text className={`text-[28px] font-semibold ${text}`}>0</Text></Key>
        <Key label="Delete" onPress={onDelete} disabled={disabled}>
          <Delete size={26} color={iconColor} strokeWidth={1.8} />
        </Key>
      </View>
    </View>
  );
}

function Key({ label, onPress, disabled, className = '', children }: { label: string; onPress: () => void; disabled?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      className={`h-[74px] w-[74px] items-center justify-center rounded-full active:opacity-60 ${className}`}>
      {children}
    </Pressable>
  );
}
