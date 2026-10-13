import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  CheckCircle2,
  Gauge,
  GraduationCap,
  ReceiptText,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { ScrollView, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { colors } from '@/theme/colors';

const LIGHT_ACCENT = '#AEB8FF';

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Wallet, label: 'Plan your allowance' },
  { icon: ReceiptText, label: 'Log in seconds' },
  { icon: Gauge, label: 'Daily safe limit' },
];

export default function WelcomeScreen() {
  useStatusBarStyle('light');

  return (
    <View className="flex-1 bg-primary">
      <LinearGradient colors={['#2C477E', colors.primary, '#15244A']} locations={[0, 0.45, 1]} style={{ position: 'absolute', inset: 0 }} />
      {/* Soft decorative glows */}
      <View pointerEvents="none" className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-accent opacity-[0.14]" />
      <View pointerEvents="none" className="absolute -left-40 top-[38%] h-80 w-80 rounded-full bg-accent opacity-[0.08]" />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="grow px-6 pb-4 pt-4" bounces={false} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)} className="flex-row items-center justify-between">
            <BrandMark inverted size={40} />
            <View className="flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              <GraduationCap size={13} color={LIGHT_ACCENT} />
              <Text className="text-[11px] font-semibold text-white/85">Made for students</Text>
            </View>
          </Animated.View>

          {/* Product preview */}
          <Animated.View entering={FadeInDown.delay(120).duration(600)} className="flex-1 justify-center py-6">
            <BrandHero />
          </Animated.View>

          <View>
            <Animated.View entering={FadeInDown.delay(220).duration(600)}>
              <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight text-white">
                Know what you can <Text style={{ color: LIGHT_ACCENT }}>safely spend</Text> today.
              </Text>
              <Text className="mt-3 text-[15px] leading-[23px] text-white/70">
                PocketPlan turns your allowance into a clear daily budget, so your money lasts until the next one.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)} className="mt-5 flex-row gap-2">
              {FEATURES.map((feature) => (
                <View key={feature.label} className="flex-1 items-center rounded-2xl border border-white/10 bg-white/[0.07] px-2 py-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <feature.icon size={17} color={LIGHT_ACCENT} strokeWidth={2.2} />
                  </View>
                  <Text className="mt-2 text-center text-[11px] font-semibold leading-[14px] text-white/85">{feature.label}</Text>
                </View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(380).duration(600)} className="mt-7">
            <Button label="Get started" variant="inverse" onPress={() => router.push('/register')} />
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

/**
 * Brand visual: the logo glowing inside soft rings, with three small status
 * cards around it. Deliberately shows no amounts.
 */
function BrandHero() {
  return (
    <View className="h-[300px] items-center justify-center" accessible accessibilityLabel="PocketPlan: allowance planned, spending on track, savings growing.">
      {/* Concentric rings */}
      <View className="absolute h-[280px] w-[280px] rounded-full border border-white/[0.06]" />
      <View className="absolute h-[216px] w-[216px] rounded-full border border-white/10 bg-white/[0.03]" />
      <View className="absolute h-[156px] w-[156px] rounded-full bg-accent opacity-25" />

      {/* Emblem */}
      <View style={emblemShadow} className="h-[124px] w-[124px] overflow-hidden rounded-[36px] border border-white/20">
        <LinearGradient colors={['#3A5BA8', '#1E3366']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Logo size={84} variant="dark" />
        </LinearGradient>
      </View>

      <StatusCard Icon={CheckCircle2} tint={colors.positiveText} bg={colors.positive} title="Allowance planned" style={{ top: 14, left: 0 }} />
      <StatusCard Icon={TrendingUp} tint={colors.accent} bg={colors.accentLight} title="Spending on track" style={{ top: 128, right: 0 }} />
      <StatusCard Icon={Sprout} tint="#B45309" bg={colors.warningBg} title="Savings growing" style={{ bottom: 12, left: 18 }} />
    </View>
  );
}

const emblemShadow = {
  shadowColor: '#0B1430',
  shadowOpacity: 0.45,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 12,
};

const cardShadow = {
  shadowColor: '#0B1430',
  shadowOpacity: 0.3,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

function StatusCard({ Icon, tint, bg, title, style }: { Icon: LucideIcon; tint: string; bg: string; title: string; style: ViewStyle }) {
  return (
    <View style={[cardShadow, { position: 'absolute' }, style]} className="flex-row items-center gap-2 rounded-2xl bg-white py-2 pl-2 pr-3.5">
      <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
        <Icon size={16} color={tint} strokeWidth={2.3} />
      </View>
      <Text className="text-[12px] font-bold text-ink">{title}</Text>
    </View>
  );
}
