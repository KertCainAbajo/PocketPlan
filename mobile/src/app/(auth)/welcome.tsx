import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { CalendarDays, PiggyBank, TrendingDown } from 'lucide-react-native';
import { useCallback, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { colors } from '@/theme/colors';

export default function WelcomeScreen() {
  // Light status bar icons on the navy background; restore dark when leaving.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-1 justify-center px-6">
          <BrandMark inverted />
          <Text className="mt-8 text-4xl font-bold leading-tight text-white">
            Know what you can safely spend today.
          </Text>
          <Text className="mt-4 text-base leading-6 text-white/80">
            PocketPlan turns your allowance into a clear daily budget, so your money lasts until the next one.
          </Text>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="rounded-t-[32px] bg-background">
        <View className="px-6 pb-4 pt-7">
          <Feature icon={<CalendarDays size={20} color={colors.accent} />} text="A recommended daily limit that updates as you spend" />
          <Feature icon={<TrendingDown size={20} color={colors.accent} />} text="Track expenses by category in seconds" />
          <Feature icon={<PiggyBank size={20} color={colors.accent} />} text="Set savings goals and watch them grow" />

          <Button label="Create an account" onPress={() => router.push('/register')} className="mt-4" />
          <Button label="I already have an account" variant="ghost" onPress={() => router.push('/login')} className="mt-1" />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View className="mb-3.5 flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-light">{icon}</View>
      <Text className="flex-1 text-[15px] leading-5 text-ink">{text}</Text>
    </View>
  );
}
