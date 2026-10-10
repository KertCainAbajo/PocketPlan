import { Check, Circle } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors } from '@/theme/colors';

/** The server's rules (Password::defaults): at least 8 characters, a letter and a number. */
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'A letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { label: 'A number', test: (p: string) => /[0-9]/.test(p) },
] as const;

const LEVELS = [
  { label: 'Too weak', color: colors.error },
  { label: 'Fair', color: colors.warning },
  { label: 'Good', color: colors.accent },
  { label: 'Strong', color: colors.positiveText },
] as const;

/**
 * 0–4. Meeting the required rules gives "Good"; length ≥ 12 or mixed case
 * plus a symbol make it "Strong". Purely advisory: the server enforces the rules.
 */
export function passwordScore(password: string): number {
  if (!password) return 0;
  const required = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (required < PASSWORD_RULES.length) return Math.max(1, required - 1);

  const extras = [password.length >= 12, /[a-z]/.test(password) && /[A-Z]/.test(password), /[^A-Za-z0-9]/.test(password)];
  return extras.filter(Boolean).length >= 2 ? 4 : 3;
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const score = passwordScore(password);
  const level = LEVELS[score - 1];

  return (
    <View className="mt-2.5" accessible accessibilityLabel={`Password strength: ${level.label}`}>
      <View className="flex-row items-center gap-1.5">
        {LEVELS.map((_, i) => (
          <View key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i < score ? level.color : colors.border }} />
        ))}
        <Text className="ml-1 w-16 text-right text-xs font-bold" style={{ color: level.color }}>
          {level.label}
        </Text>
      </View>

      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <View key={rule.label} className="flex-row items-center gap-1">
              {met ? <Check size={13} color={colors.positiveText} strokeWidth={3} /> : <Circle size={11} color={colors.textSecondary} />}
              <Text className={`text-xs ${met ? 'font-medium text-positive-text' : 'text-muted'}`}>{rule.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
