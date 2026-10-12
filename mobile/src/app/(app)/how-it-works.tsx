import { router } from 'expo-router';
import {
  ArrowLeft,
  ChartNoAxesColumn,
  CheckCircle2,
  Flag,
  Gauge,
  PiggyBank,
  ReceiptText,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { colors } from '@/theme/colors';

/** The flow of the app in order, with where to find each step. */
const STEPS: { Icon: LucideIcon; title: string; body: string; where: string }[] = [
  {
    Icon: Wallet,
    title: 'Your allowance arrives',
    body: 'During setup you entered your allowance and how often it comes. With “Repeat this allowance” on, it is added as income automatically each time.',
    where: 'Set up once during onboarding',
  },
  {
    Icon: ChartNoAxesColumn,
    title: 'Each allowance gets a budget',
    body: 'Your allowance becomes the spending limit for that period (for example one week). With repeat on, a new budget starts by itself every period.',
    where: 'Budgets tab',
  },
  {
    Icon: ReceiptText,
    title: 'Log what you spend',
    body: 'Add every expense with its category. It is counted in the budget for that date, and your numbers update right away.',
    where: 'Home → Expense',
  },
  {
    Icon: Gauge,
    title: 'Check what is safe to spend today',
    body: 'PocketPlan divides what is left by the days left. Stay under today’s amount and your money lasts the whole period.',
    where: 'Home → top card',
  },
  {
    Icon: PiggyBank,
    title: 'Leftover money is saved',
    body: 'When a repeating allowance period ends, whatever you did not spend is moved to your savings, and the next period starts fresh.',
    where: 'Home → Savings so far',
  },
];

const TERMS: [string, string][] = [
  ['Balance', 'All the money you have recorded: income minus expenses minus what you moved to savings.'],
  ['Budget (plan)', 'How much you plan to spend in one period. It is a limit, not money in your pocket.'],
  ['Safe to spend today', 'What is left in this budget, divided by the days left, minus what you already spent today.'],
  ['Left to assign', 'Budget money you have not given to a category yet. Split your week’s money, for example ₱800 Food and ₱500 Transportation, until this reaches zero.'],
  ['Savings so far', 'Unspent allowance saved at the end of each period, plus money you put into goals.'],
  ['Goal', 'Something you are saving for, like a laptop. Adding money to a goal is a transfer, not an expense.'],
];

const STATUSES: { label: string; detail: string; text: string; bg: string }[] = [
  { label: 'Safe', detail: 'You are within today’s amount.', text: colors.positiveText, bg: colors.positive },
  { label: 'Watch', detail: 'You have used 80% or more of today’s amount.', text: colors.warningText, bg: colors.warningBg },
  { label: 'Over', detail: 'You spent more than today’s amount. Tomorrow’s amount gets smaller.', text: colors.error, bg: colors.errorBg },
];

export default function HowItWorksScreen() {
  useStatusBarStyle('dark');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <Text className="text-xl font-bold text-ink">How PocketPlan works</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        <Text className="mb-5 mt-2 text-[15px] leading-[22px] text-muted">
          PocketPlan answers one question: how much can I safely spend today so my allowance lasts until the next one?
        </Text>

        <View className="rounded-3xl border border-border bg-card p-5">
          {STEPS.map((step, index) => (
            <View key={step.title} className="flex-row gap-4">
              <View className="items-center">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                  <step.Icon size={20} color={colors.card} />
                </View>
                {index < STEPS.length - 1 && <View className="my-1.5 w-0.5 flex-1 bg-accent-light" />}
              </View>
              <View className={`flex-1 ${index < STEPS.length - 1 ? 'pb-5' : ''}`}>
                <Text className="text-[11px] font-bold uppercase tracking-widest text-accent">Step {index + 1}</Text>
                <Text className="mt-0.5 text-base font-bold text-ink">{step.title}</Text>
                <Text className="mt-1 text-[13px] leading-5 text-muted">{step.body}</Text>
                <View className="mt-2 self-start rounded-full bg-accent-light px-2.5 py-1">
                  <Text className="text-[11px] font-semibold text-primary">{step.where}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View className="mt-4 flex-row items-start gap-3 rounded-3xl bg-accent-light p-4">
          <Flag size={20} color={colors.accent} />
          <Text className="flex-1 text-[13px] leading-5 text-primary">
            <Text className="font-bold">Optional: Goals.</Text> Saving for something specific? Create a goal in the Goals tab and add money to it whenever you like.
          </Text>
        </View>

        <Text className="mb-3 mt-7 text-base font-bold text-ink">What the status means</Text>
        <View className="gap-2">
          {STATUSES.map((status) => (
            <View key={status.label} className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: status.bg }}>
                <CheckCircle2 size={13} color={status.text} />
                <Text className="text-xs font-bold" style={{ color: status.text }}>{status.label}</Text>
              </View>
              <Text className="flex-1 text-[13px] leading-5 text-ink">{status.detail}</Text>
            </View>
          ))}
        </View>

        <Text className="mb-3 mt-7 text-base font-bold text-ink">Words you will see</Text>
        <View className="rounded-3xl border border-border bg-card px-4">
          {TERMS.map(([term, meaning], index) => (
            <View key={term} className={`py-3.5 ${index < TERMS.length - 1 ? 'border-b border-[#F1F2F7]' : ''}`}>
              <Text className="text-[13px] font-bold text-ink">{term}</Text>
              <Text className="mt-0.5 text-[13px] leading-5 text-muted">{meaning}</Text>
            </View>
          ))}
        </View>

        <Button label="Got it" className="mt-7" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </ScrollView>
    </SafeAreaView>
  );
}
