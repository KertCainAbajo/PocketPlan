import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { colors } from '@/theme/colors';

import { BrandMark } from './brand-mark';

interface AuthLayoutProps {
  /** Small chip above the title, e.g. a greeting. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Short selling points shown as chips under the subtitle. */
  highlights?: { icon: LucideIcon; label: string }[];
  children: ReactNode;
}

/**
 * Shared frame for sign-in, sign-up and password screens: a navy header that
 * continues the welcome screen's branding, with the form on a rounded sheet.
 */
export function AuthLayout({ eyebrow, title, subtitle, highlights, children }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="grow"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <LinearGradient
          colors={['#34539A', colors.primary, '#16254A']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 60, paddingHorizontal: 20, overflow: 'hidden' }}>
          {/* Decorative depth */}
          <View pointerEvents="none" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent opacity-20" />
          <View pointerEvents="none" className="absolute -right-4 top-10 h-40 w-40 rounded-full border border-white/10" />
          <View pointerEvents="none" className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-white opacity-[0.04]" />

          <View className="flex-row items-center justify-between">
            {router.canGoBack() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={12}
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 active:opacity-70">
                <ArrowLeft size={21} color={colors.card} />
              </Pressable>
            ) : (
              <View className="h-11 w-11" />
            )}
            <BrandMark inverted size={30} />
          </View>

          <Animated.View entering={FadeInDown.duration(450)} className="mt-7">
            {eyebrow ? (
              <View className="mb-3 self-start rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <Text className="text-xs font-semibold text-white/85">{eyebrow}</Text>
              </View>
            ) : null}
            <Text className="text-[30px] font-extrabold leading-[36px] tracking-tight text-white">{title}</Text>
            {subtitle ? <Text className="mt-2 text-[15px] leading-[22px] text-white/70">{subtitle}</Text> : null}
            {highlights?.length ? (
              <View className="mt-4 flex-row flex-wrap gap-2">
                {highlights.map(({ icon: Icon, label }) => (
                  <View key={label} className="flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5">
                    <Icon size={13} color="#AEB8FF" strokeWidth={2.4} />
                    <Text className="text-[12px] font-semibold text-white/90">{label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Animated.View>
        </LinearGradient>

        <View className="-mt-9 flex-1 rounded-t-[32px] bg-background px-5 pt-7" style={{ paddingBottom: insets.bottom + 24 }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
