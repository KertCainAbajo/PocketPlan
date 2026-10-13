import { router } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Info, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion';
import { colors } from '@/theme/colors';

/** Soft, navy-tinted elevation shared by the floating cards. */
export const cardShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

/** Back button, page title and a one-line explanation. */
export function SettingsHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={cardShadow}
        className="h-11 w-11 items-center justify-center rounded-2xl bg-card active:bg-accent-light">
        <ChevronLeft size={21} color={colors.primary} strokeWidth={2.2} />
      </Pressable>
      <Text className="mt-4 text-[26px] font-extrabold tracking-tight text-ink">{title}</Text>
      {subtitle ? <Text className="mt-1 text-[13px] leading-[19px] text-muted">{subtitle}</Text> : null}
    </View>
  );
}

export function SettingsCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View style={cardShadow} className={`rounded-3xl bg-card ${className}`}>
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-2.5 ml-1 mt-7 text-[12px] font-bold uppercase tracking-[1px] text-muted">{children}</Text>;
}

/** Rounded, tinted square that holds a row's icon. */
export function IconTile({ Icon, color, size = 40 }: { Icon: LucideIcon; color: string; size?: number }) {
  return (
    <View className="items-center justify-center rounded-2xl" style={{ width: size, height: size, backgroundColor: `${color}1F` }}>
      <Icon size={size * 0.45} color={color} strokeWidth={2} />
    </View>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
  error?: string;
  Icon?: LucideIcon;
  /** Adds a show/hide toggle for passwords. */
  password?: boolean;
  /** Fixed text before the value, e.g. a currency symbol. Replaces the icon. */
  prefix?: string;
};

export function Field({ label, hint, error, Icon, password = false, prefix, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const border = error ? colors.error : focused ? colors.accent : colors.border;

  return (
    <View className="mt-4">
      <Text className="mb-1.5 ml-0.5 text-[13px] font-semibold text-ink">{label}</Text>
      <View className="h-[52px] flex-row items-center rounded-2xl border-[1.5px] bg-background px-3.5" style={{ borderColor: border }}>
        {prefix ? (
          <Text className={`text-[17px] font-bold ${focused || input.value ? 'text-primary' : 'text-muted'}`}>{prefix}</Text>
        ) : Icon ? (
          <Icon size={18} color={focused ? colors.accent : colors.textSecondary} />
        ) : null}
        <TextInput
          {...input}
          secureTextEntry={password && !visible}
          onFocus={(event) => { setFocused(true); input.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); input.onBlur?.(event); }}
          placeholderTextColor={colors.textSecondary}
          className={`flex-1 py-0 text-[15px] text-ink ${prefix ? 'ml-1.5' : Icon ? 'ml-2.5' : ''}`}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible((value) => !value)}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center">
            {visible ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="ml-0.5 mt-1.5 text-[12px] font-medium text-error">{error}</Text>
      ) : hint ? (
        <Text className="ml-0.5 mt-1.5 text-[12px] text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled = false, Icon, tone = 'primary' }: { title: string; onPress: () => void; disabled?: boolean; Icon?: LucideIcon; tone?: 'primary' | 'danger' }) {
  const bg = tone === 'danger' ? 'bg-error' : 'bg-primary';
  return (
    <PressableScale
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={disabled ? undefined : [cardShadow, { shadowOpacity: 0.22 }]}
      className={`mt-5 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl ${bg} ${disabled ? 'opacity-45' : 'active:opacity-80'}`}>
      {Icon ? <Icon size={17} color="white" strokeWidth={2.4} /> : null}
      <Text className="text-[15px] font-bold text-white">{title}</Text>
    </PressableScale>
  );
}

export function SecondaryButton({ title, onPress, Icon, tone = 'primary', disabled = false }: { title: string; onPress: () => void; Icon?: LucideIcon; tone?: 'primary' | 'danger'; disabled?: boolean }) {
  const color = tone === 'danger' ? colors.error : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-2xl ${tone === 'danger' ? 'bg-error-bg' : 'bg-accent-light'} ${disabled ? 'opacity-45' : 'active:opacity-75'}`}>
      {Icon ? <Icon size={16} color={color} strokeWidth={2.2} /> : null}
      <Text className="text-[14px] font-bold" style={{ color }}>{title}</Text>
    </Pressable>
  );
}

export function InfoNote({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warning' }) {
  const warning = tone === 'warning';
  return (
    <View className={`mt-4 flex-row gap-2.5 rounded-2xl p-3.5 ${warning ? 'bg-warning-bg' : 'bg-accent-light'}`}>
      <Info size={16} color={warning ? colors.warningText : colors.accent} style={{ marginTop: 1 }} />
      <Text className={`flex-1 text-[12.5px] leading-[18px] ${warning ? 'text-warning-text' : 'text-primary'}`}>{text}</Text>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View accessibilityLiveRegion="polite" className="mt-4 rounded-2xl bg-error-bg px-4 py-3">
      <Text className="text-[13px] font-medium text-error">{message}</Text>
    </View>
  );
}

/** Small green confirmation that fades in under a form after saving. */
export function SavedNote({ text }: { text: string }) {
  return (
    <View accessibilityLiveRegion="polite" className="mt-3 flex-row items-center justify-center gap-1.5">
      <View className="h-1.5 w-1.5 rounded-full bg-positive-text" />
      <Text className="text-[12px] font-semibold text-positive-text">{text}</Text>
    </View>
  );
}
