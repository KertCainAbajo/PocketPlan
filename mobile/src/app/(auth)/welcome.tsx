import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import {
  CheckCircle2,
  Gauge,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { colors } from '@/theme/colors';

const LIGHT_ACCENT = '#AEB8FF';

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Wallet, title: 'Add your allowance', body: 'Daily, weekly, monthly or your own schedule.' },
  { icon: ReceiptText, title: 'Log what you spend', body: 'Pick a category and you are done in seconds.' },
  { icon: Gauge, title: 'Know your safe daily limit', body: 'Recalculated every day so your money lasts.' },
];

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
      <LinearGradient colors={['#2C477E', colors.primary, '#15244A']} locations={[0, 0.45, 1]} style={{ position: 'absolute', inset: 0 }} />
      {/* Soft decorative glows */}
      <View pointerEvents="none" className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent opacity-[0.12]" />
      <View pointerEvents="none" className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent opacity-[0.10]" />
      <View pointerEvents="none" className="absolute -left-32 top-1/2 h-80 w-80 rounded-full bg-accent opacity-[0.07]" />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="grow px-6 pb-4 pt-4" bounces={false} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <BrandMark inverted size={44} />
          </Animated.View>

          {/* Middle block is centred in whatever height the phone has. */}
          <View className="flex-1 justify-center py-8">
            <Animated.View entering={FadeInDown.delay(120).duration(600)}>
              <Text className="text-[34px] font-extrabold leading-[40px] tracking-tight text-white">
                Know what you can <Text style={{ color: LIGHT_ACCENT }}>safely spend</Text> today.
              </Text>
              <Text className="mt-3 text-base leading-6 text-white/70">
                PocketPlan turns your allowance into a clear daily budget, so your money lasts until the next one.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(600)} className="mt-8">
              <HowItWorksCard />
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(360).duration(600)}>
            <Button label="Create free account" variant="inverse" onPress={() => router.push('/register')} />
            <Button label="I already have an account" variant="outline-inverse" onPress={() => router.push('/login')} className="mt-3" />
            <View className="mt-4 flex-row items-center justify-center gap-1.5">
              <ShieldCheck size={14} color="rgba(255,255,255,0.6)" />
              <Text className="text-xs text-white/60">No bank login needed · Your data stays private</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Three connected steps explaining the app, ending with the three budget statuses. */
function HowItWorksCard() {
  return (
    <View className="rounded-[28px] border border-white/15 bg-white/[0.08] p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-white/60">How it works</Text>
        <View className="rounded-full bg-white/10 px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-white/70">3 simple steps</Text>
        </View>
      </View>

      {STEPS.map((step, index) => (
        <Step key={step.title} number={index + 1} icon={step.icon} title={step.title} body={step.body} last={index === STEPS.length - 1}>
          {index === STEPS.length - 1 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              <StatusChip label="Safe" icon={CheckCircle2} color={colors.positiveText} background={colors.positive} />
              <StatusChip label="Watch" icon={TriangleAlert} color={colors.warningText} background={colors.warningBg} />
              <StatusChip label="Over" icon={XCircle} color={colors.error} background={colors.errorBg} />
            </View>
          )}
        </Step>
      ))}
    </View>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  body,
  last,
  children,
}: {
  number: number;
  icon: LucideIcon;
  title: string;
  body: string;
  last: boolean;
  children?: ReactNode;
}) {
  return (
    <View className="flex-row gap-4" accessible accessibilityLabel={`Step ${number}: ${title}. ${body}`}>
      {/* Icon badge with a connector line down to the next step */}
      <View className="items-center">
        <LinearGradient
          colors={[LIGHT_ACCENT, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={colors.card} strokeWidth={2.2} />
        </LinearGradient>
        {!last && (
          <LinearGradient colors={['rgba(174,184,255,0.6)', 'rgba(174,184,255,0.08)']} style={{ width: 2, flex: 1, minHeight: 18, marginVertical: 6 }} />
        )}
      </View>

      <View className={`flex-1 ${last ? '' : 'pb-5'}`}>
        <Text className="text-[11px] font-bold uppercase tracking-widest text-[#AEB8FF]">Step {number}</Text>
        <Text className="mt-0.5 text-base font-bold text-white">{title}</Text>
        <Text className="mt-0.5 text-[13px] leading-5 text-white/60">{body}</Text>
        {children}
      </View>
    </View>
  );
}

function StatusChip({ label, icon: Icon, color, background }: { label: string; icon: LucideIcon; color: string; background: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: background }}>
      <Icon size={13} color={color} strokeWidth={2.4} />
      <Text className="text-xs font-bold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
