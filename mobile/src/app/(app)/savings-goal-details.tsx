import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeft, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { FormBanner } from '@/components/ui/form-banner';
import { savingsGoalsApi, type SavingsGoal } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const money = (value: string | number | undefined, currency: string, digits = 2) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `— ${currency}`;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount); }
  catch { return `${currency} ${amount.toFixed(digits)}`; }
};

const fullDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const shortDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));

export default function SavingsGoalDetailsScreen() {
  useStatusBarStyle('dark');
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const id = Number(goalId);
  const validId = Number.isInteger(id) && id > 0;
  const currency = useAuthStore((state) => state.user?.currency ?? 'PHP');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const detail = useQuery({ queryKey: ['savings-goal', id], queryFn: () => savingsGoalsApi.get(id), enabled: validId });
  const data = detail.data;
  const goal = data?.goal;
  const progress = Math.max(0, Math.min(100, goal?.progress_percent ?? 0));
  const target = goal?.target_date ? new Date(`${goal.target_date}T12:00:00`) : null;
  const now = new Date();
  const monthsLeft = target ? Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth()) : 12;
  const monthly = goal ? Math.max(0, (Number(goal.target_amount) - Number(goal.saved_amount)) / monthsLeft) : 0;
  const history = data?.contributions ?? [];
  const shownHistory = showAllHistory ? history : history.slice(0, 2);
  const maxChart = Math.max(1, ...((data?.monthly_progress ?? []).map((point) => Number(point.amount))));

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-7">
      <View className="flex-row items-center pt-1">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-1 h-9 w-9 items-center justify-center rounded-full active:bg-accent-light"><ArrowLeft size={18} color={colors.primary} /></Pressable>
        <View className="flex-1"><Text numberOfLines={1} className="text-[18px] font-bold text-primary">{goal?.name ?? 'Savings goal'}</Text></View>
        {goal && <Pressable accessibilityRole="button" accessibilityLabel="Edit savings goal" onPress={() => router.push({ pathname: '/savings-goal-form', params: { goalId: String(goal.id) } })} className="ml-2 h-9 w-9 items-center justify-center rounded-full active:bg-accent-light"><Pencil size={15} color={colors.primary} /></Pressable>}
      </View>
      {goal?.icon === 'emergency' && <Text className="ml-1 mt-0.5 text-[9px] text-muted">A safety net for whatever life brings.</Text>}

      {detail.isError && <View className="mt-3"><FormBanner message={getErrorMessage(detail.error)} /></View>}
      {detail.isPending ? <View className="mt-4 rounded-[18px] bg-white p-6"><Text className="text-center text-[11px] text-muted">Loading your goal…</Text></View> : goal && <>
        <View className="mt-4 items-center rounded-[18px] bg-white px-4 pb-3 pt-3">
          <View className="h-[152px] w-full items-center justify-center">
            <Svg width={152} height={152} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="42" fill="none" stroke="#ECEEFF" strokeWidth="7" />
              <Circle cx="50" cy="50" r="42" fill="none" stroke="#6C79FF" strokeWidth="7" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`} strokeLinecap="butt" rotation={-90} originX={50} originY={50} />
            </Svg>
            <View className="absolute items-center"><Text className="text-[22px] font-bold tracking-tight text-primary">{money(goal.saved_amount, currency, 0)}</Text><Text className="mt-0.5 text-[9px] text-muted">of {money(goal.target_amount, currency, 0)} · {progress}%</Text></View>
          </View>
          <View className="mt-1 w-full flex-row items-center justify-between"><Text className="text-[8px] font-semibold text-primary">{money(goal.remaining_amount, currency, 0)} to go</Text><Text className="text-[8px] text-muted">{goal.target_date ? `By ${fullDate(goal.target_date)}` : 'No target date'}</Text></View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/savings-goal-contribution', params: { goalId: String(goal.id) } })} className="mt-3 h-[44px] flex-row items-center justify-center gap-2 rounded-[10px] bg-primary active:opacity-80"><Text className="text-[10px] font-bold text-white">Add contribution</Text><Text className="text-[16px] text-white">＋</Text></Pressable>

        <View className="mt-3 rounded-[13px] bg-[#EEF0FF] px-3 py-2.5">
          <Text className="text-[9px] font-bold text-primary">A steady path to your {goal.icon === 'emergency' ? 'safety net' : 'goal'}</Text>
          <Text className="mt-1 text-[9px] leading-[14px] text-ink">Set aside {money(monthly, currency, 0)} a month for the next {monthsLeft} month{monthsLeft === 1 ? '' : 's'} to reach your target. Any extra gets you there sooner.</Text>
        </View>

        <View className="mt-3 rounded-[17px] bg-white px-3.5 pb-3 pt-3">
          <Text className="text-[10px] font-medium text-primary">Your savings, growing</Text>
          <Text className="mt-1 text-[7px] text-muted">Cumulative saved · {currency} · Month-end, then today</Text>
          <View className="mt-3 h-[102px] flex-row items-end justify-around">
            {data?.monthly_progress.map((point, index) => {
              const amount = Number(point.amount);
              const height = Math.max(10, amount / maxChart * 60);
              const current = index === (data.monthly_progress.length - 1);
              return <View key={`${point.label}-${index}`} className="h-full flex-1 items-center justify-end">
                <Text numberOfLines={1} adjustsFontSizeToFit className="mb-1 text-[7px] font-medium text-primary">{money(point.amount, currency, 0)}</Text>
                <View className="w-[26px] rounded-t-[5px] bg-[#EEF0FF]" style={{ height }}><View className={`h-full rounded-t-[5px] ${current ? 'bg-[#6C79FF]' : 'bg-[#EEF0FF]'}`} /></View>
                <Text className="mt-1 text-[7px] text-muted">{point.label}</Text>
              </View>;
            })}
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between"><Text className="text-[13px] font-semibold text-primary">Contribution history</Text>{history.length > 2 && <Pressable accessibilityRole="button" onPress={() => setShowAllHistory((value) => !value)}><Text className="text-[9px] font-semibold text-primary">{showAllHistory ? 'Show less' : 'See all'}</Text></Pressable>}</View>
        {shownHistory.length ? <View className="mt-2 rounded-[16px] bg-white px-3 py-1">
          {shownHistory.map((contribution, index) => <View key={contribution.id} className={`flex-row items-center py-2.5 ${index > 0 ? 'border-t border-[#F0F1F6]' : ''}`}>
            <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-xl bg-accent-light"><ArrowDownLeft size={14} color={colors.primary} /></View>
            <View className="flex-1"><Text className="text-[9px] font-semibold text-ink">{contribution.note === 'Starting amount' ? 'Starting amount' : 'Contribution'}</Text><Text className="mt-0.5 text-[7px] text-muted">{shortDate(contribution.contributed_on)} · {contribution.account_name}</Text></View>
            <Text className="text-[9px] font-medium text-primary">{money(contribution.amount, currency)}</Text>
          </View>)}
        </View> : <View className="mt-2 rounded-[16px] bg-white px-4 py-5"><Text className="text-center text-[9px] text-muted">Your contributions will show up here.</Text></View>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
