import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { colors } from '@/theme/colors';

import { Logo } from './logo';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared frame for sign-in, sign-up and password screens: a navy header that
 * continues the welcome screen's branding, with the form on a rounded sheet.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
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
          colors={['#2C477E', colors.primary, '#1C2F59']}
          style={{ paddingTop: insets.top + 12, paddingBottom: 56, paddingHorizontal: 20, overflow: 'hidden' }}>
          <View pointerEvents="none" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent opacity-[0.15]" />

          <View className="flex-row items-center justify-between">
            {router.canGoBack() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={12}
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 active:opacity-70">
                <ArrowLeft size={22} color={colors.card} />
              </Pressable>
            ) : (
              <View className="h-11 w-11" />
            )}
            <Logo size={40} variant="dark" />
          </View>

          <Animated.View entering={FadeInDown.duration(450)} className="mt-6">
            <Text className="text-[30px] font-extrabold tracking-tight text-white">{title}</Text>
            {subtitle ? <Text className="mt-1.5 text-[15px] leading-[22px] text-white/70">{subtitle}</Text> : null}
          </Animated.View>
        </LinearGradient>

        <View className="-mt-8 flex-1 rounded-t-[32px] bg-background px-5 pt-7" style={{ paddingBottom: insets.bottom + 24 }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
