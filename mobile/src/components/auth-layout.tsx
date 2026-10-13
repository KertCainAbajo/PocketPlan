import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { colors } from '@/theme/colors';

import { Logo } from './logo';

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
 * Shared frame for sign-in, sign-up and password screens: a navy hero with the
 * PocketPlan emblem, and the form on a rounded sheet that overlaps it.
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
          colors={['#3B5BA9', colors.primary, '#13203F']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ paddingTop: insets.top + 8, paddingBottom: 72, paddingHorizontal: 20, overflow: 'hidden' }}>
          {/* Depth: a soft glow, two thin rings and a faint lower light. */}
          <View pointerEvents="none" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent opacity-25" />
          <View pointerEvents="none" className="absolute -right-10 top-6 h-56 w-56 rounded-full border border-white/10" />
          <View pointerEvents="none" className="absolute -left-20 top-40 h-48 w-48 rounded-full border border-white/[0.07]" />
          <View pointerEvents="none" className="absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-white opacity-[0.04]" />

          <View className="h-11 flex-row items-center">
            {router.canGoBack() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={12}
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 active:opacity-70">
                <ArrowLeft size={21} color={colors.card} />
              </Pressable>
            ) : null}
          </View>

          <Animated.View entering={FadeInDown.duration(500)} className="items-center">
            {/* Emblem with a glow behind it */}
            <View className="items-center justify-center">
              <View pointerEvents="none" className="absolute h-28 w-28 rounded-full bg-accent opacity-30" />
              <View
                className="h-[76px] w-[76px] items-center justify-center rounded-[26px] border border-white/20 bg-white/10"
                style={{ shadowColor: '#0B1430', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
                <Logo size={50} variant="dark" />
              </View>
            </View>

            {eyebrow ? (
              <View className="mt-5 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <Text className="text-xs font-semibold text-white/85">{eyebrow}</Text>
              </View>
            ) : null}
            <Text className={`${eyebrow ? 'mt-3' : 'mt-5'} text-center text-[30px] font-extrabold leading-[36px] tracking-tight text-white`}>{title}</Text>
            {subtitle ? <Text className="mt-2 max-w-[320px] text-center text-[15px] leading-[22px] text-white/70">{subtitle}</Text> : null}

            {highlights?.length ? (
              <View className="mt-4 flex-row flex-wrap justify-center gap-2">
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

        <Animated.View
          entering={FadeInUp.delay(80).duration(450)}
          className="-mt-10 flex-1 rounded-t-[36px] bg-background px-5 pt-7"
          style={{ paddingBottom: insets.bottom + 24 }}>
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
