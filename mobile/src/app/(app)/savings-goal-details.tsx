import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarDays, ChevronRight, Clock3, GraduationCap, House, Laptop, Pencil, Plane, ShieldCheck, Sparkles, TrendingUp, WalletCards } from 'lucide-react-native';
import { createElement, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { FormBanner } from '@/components/ui/form-banner';
import { savingsGoalsApi, type SavingsGoal } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { cachedDateTimeFormat, cachedNumberFormat } from '@/lib/intl';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const money = (value: string | number | undefined, currency: string, digits = 2) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `— ${currency}`;
  try { return cachedNumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount); }
  catch { return `${currency} ${amount.toFixed(digits)}`; }
};

const iconFor = (icon: SavingsGoal['icon']) => icon === 'home' ? House : icon === 'travel' ? Plane : icon === 'emergency' ? ShieldCheck : icon === 'education' ? GraduationCap : Laptop;
const fullDate = (value: string) => cachedDateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const shortDate = (value: string) => cachedDateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));

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
  const remaining = Math.max(0, Number(goal?.remaining_amount ?? 0));
  const targetDate = goal?.target_date ? new Date(`${goal.target_date}T12:00:00`) : null;
  const now = new Date();
  const monthsLeft = targetDate ? Math.max(1, (targetDate.getFullYear() - now.getFullYear()) * 12 + targetDate.getMonth() - now.getMonth()) : 12;
  const monthly = goal ? remaining / monthsLeft : 0;
  const history = data?.contributions ?? [];
  const shownHistory = showAllHistory ? history : history.slice(0, 3);
  const maxChart = Math.max(1, ...((data?.monthly_progress ?? []).map((point) => Number(point.amount))));

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={detail.isRefetching} onRefresh={() => void detail.refetch()} tintColor={colors.accent} />} contentContainerClassName="px-5 pb-5">
        <View className="flex-row items-center pt-1">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white"><ArrowLeft size={18} color={colors.primary} /></Pressable>
          <View className="flex-1"><Text className="text-[9px] font-semibold uppercase tracking-[1.2px] text-muted">Your savings plan</Text><Text numberOfLines={1} className="mt-0.5 text-[16px] font-bold text-primary">{goal?.name ?? 'Goal details'}</Text></View>
          {goal && <Pressable accessibilityRole="button" accessibilityLabel="Edit savings goal" onPress={() => router.push({ pathname: '/savings-goal-form', params: { goalId: String(goal.id) } })} className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"><Pencil size={15} color={colors.primary} /></Pressable>}
        </View>

        {detail.isError && <View className="mt-3"><FormBanner message={getErrorMessage(detail.error)} /></View>}
        {detail.isPending ? <View className="mt-4 rounded-[22px] bg-white p-7"><Text className="text-center text-[12px] text-muted">Loading your goal…</Text></View> : goal && <>
          <View className="mt-4 overflow-hidden rounded-[24px] bg-white p-4">
            <View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2.5"><View className="h-11 w-11 items-center justify-center rounded-[15px] bg-accent-light"><GoalIcon icon={goal.icon} /></View><View><Text className="text-[9px] font-semibold uppercase tracking-[1px] text-accent">{goal.icon === 'emergency' ? 'Your safety net' : 'A goal worth saving for'}</Text><Text className="mt-0.5 text-[11px] text-muted">Every deposit moves you closer</Text></View></View><View className="flex-row items-center gap-1 rounded-full bg-[#F2F4FF] px-2.5 py-1.5"><Sparkles size={10} color={colors.accent} /><Text className="text-[8px] font-bold text-primary">{Math.floor(progress)}% there</Text></View></View>
            <View className="mt-4 flex-row items-center justify-center">
              <View className="h-[180px] w-[180px] items-center justify-center">
                <Svg width={180} height={180} viewBox="0 0 100 100"><Circle cx="50" cy="50" r="43" fill="none" stroke="#EDF0FF" strokeWidth="7" /><Circle cx="50" cy="50" r="43" fill="none" stroke="#697BFF" strokeWidth="7" strokeDasharray={`${2 * Math.PI * 43}`} strokeDashoffset={`${2 * Math.PI * 43 * (1 - progress / 100)}`} strokeLinecap="round" rotation={-90} originX={50} originY={50} /></Svg>
                <View className="absolute items-center"><Text className="text-[26px] font-bold tracking-tight text-primary">{money(goal.saved_amount, currency, 0)}</Text><Text className="mt-1 text-[9px] text-muted">of {money(goal.target_amount, currency, 0)}</Text><View className="mt-2 rounded-full bg-accent-light px-2.5 py-1"><Text className="text-[9px] font-bold text-primary">{progress.toFixed(0)}% saved</Text></View></View>
              </View>
            </View>
            <View className="mt-1 flex-row items-center justify-between rounded-[13px] bg-background px-3 py-2.5"><View><Text className="text-[8px] text-muted">Still to go</Text><Text className="mt-0.5 text-[11px] font-bold text-primary">{money(remaining, currency)}</Text></View><View className="h-7 w-px bg-border" /><View className="items-end"><Text className="text-[8px] text-muted">Target date</Text><Text className="mt-0.5 text-[10px] font-semibold text-primary">{targetDate ? fullDate(goal.target_date!) : 'Whenever you’re ready'}</Text></View></View>
          </View>

          <View className="mt-3 flex-row gap-2.5">
            <MiniStat icon={<TrendingUp size={14} color={colors.accent} />} label="Contributions" value={String(history.length)} />
            <MiniStat icon={<CalendarDays size={14} color={colors.accent} />} label="Suggested monthly" value={money(monthly, currency, 0)} />
          </View>

          <View className="mt-3 rounded-[17px] border border-[#E6EAFE] bg-[#F0F2FF] p-3.5"><View className="flex-row items-center gap-2"><View className="h-7 w-7 items-center justify-center rounded-lg bg-white"><Clock3 size={14} color={colors.primary} /></View><Text className="text-[10px] font-bold text-primary">A steady path to your {goal.icon === 'emergency' ? 'safety net' : 'goal'}</Text></View><Text className="mt-2 text-[9px] leading-[15px] text-ink">Set aside about <Text className="font-bold text-primary">{money(monthly, currency, 0)} each month</Text> for the next {monthsLeft} month{monthsLeft === 1 ? '' : 's'} to reach your target. You can change your plan anytime.</Text></View>

          <View className="mt-5 flex-row items-end justify-between"><View><Text className="text-[15px] font-bold text-primary">Your savings journey</Text><Text className="mt-0.5 text-[9px] text-muted">A view of your progress over time</Text></View><View className="flex-row items-center gap-1 rounded-full bg-white px-2.5 py-1.5"><View className="h-1.5 w-1.5 rounded-full bg-accent" /><Text className="text-[8px] font-medium text-muted">Cumulative</Text></View></View>
          <View className="mt-2 rounded-[18px] bg-white px-3.5 pb-3.5 pt-4">
            {data?.monthly_progress.length ? <>
              <Text className="text-[8px] text-muted">Total saved each month · {currency}</Text>
              <View className="mt-4 h-[118px] flex-row items-end justify-around">
                {data.monthly_progress.map((point, index) => {
                  const amount = Number(point.amount);
                  const height = Math.max(8, amount / maxChart * 76);
                  const current = index === data.monthly_progress.length - 1;
                  return <View key={`${point.label}-${index}`} className="h-full flex-1 items-center justify-end">
                    <Text numberOfLines={1} adjustsFontSizeToFit className={`mb-1 text-[7px] ${current ? 'font-bold text-primary' : 'text-muted'}`}>{money(point.amount, currency, 0)}</Text>
                    <View className={`w-[26px] rounded-t-[7px] ${current ? 'bg-[#697BFF]' : 'bg-[#E9ECFF]'}`} style={{ height }} />
                    <Text className="mt-1.5 text-[7px] text-muted">{point.label}</Text>
                  </View>;
                })}
              </View>
            </> : <View className="items-center py-5"><View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-light"><TrendingUp size={16} color={colors.primary} /></View><Text className="mt-2 text-[9px] font-semibold text-primary">Your progress chart is on its way</Text><Text className="mt-1 text-[8px] text-muted">Add a contribution to start your savings journey.</Text></View>}
          </View>

          <View className="mt-5 flex-row items-center justify-between"><View><Text className="text-[15px] font-bold text-primary">Contribution history</Text><Text className="mt-0.5 text-[9px] text-muted">Every step that brought you here</Text></View>{history.length > 3 && <Pressable accessibilityRole="button" onPress={() => setShowAllHistory((value) => !value)} className="flex-row items-center gap-0.5"><Text className="text-[9px] font-bold text-primary">{showAllHistory ? 'Show less' : 'See all'}</Text><ChevronRight size={12} color={colors.primary} /></Pressable>}</View>
          {shownHistory.length ? <View className="mt-2 overflow-hidden rounded-[18px] bg-white px-3.5">
            {shownHistory.map((contribution, index) => <View key={contribution.id} className={`flex-row items-center py-3 ${index > 0 ? 'border-t border-[#F0F1F6]' : ''}`}>
              <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-xl bg-[#EEF1FF]"><ArrowDownLeft size={15} color={colors.primary} /></View>
              <View className="flex-1"><Text className="text-[10px] font-semibold text-ink">{contribution.note === 'Starting amount' ? 'Starting balance' : 'Goal contribution'}</Text><Text className="mt-0.5 text-[8px] text-muted">{shortDate(contribution.contributed_on)} · {contribution.account_name}</Text>{contribution.note && contribution.note !== 'Starting amount' && <Text numberOfLines={1} className="mt-0.5 text-[8px] text-muted">{contribution.note}</Text>}</View>
              <View className="items-end"><Text className="text-[10px] font-bold text-primary">+{money(contribution.amount, currency)}</Text><Text className="mt-0.5 text-[7px] text-muted">saved</Text></View>
            </View>)}
          </View> : <View className="mt-2 items-center rounded-[18px] bg-white px-4 py-6"><Text className="text-[10px] font-semibold text-primary">Your first contribution starts the story</Text><Text className="mt-1 text-[8px] text-muted">It will appear here once you add it.</Text></View>}

          <View className="mt-4 flex-row items-center gap-2 rounded-[14px] bg-white p-3"><View className="h-8 w-8 items-center justify-center rounded-lg bg-[#EAF7F0]"><WalletCards size={14} color="#39815D" /></View><Text className="flex-1 text-[8px] leading-[13px] text-muted">Contributions are savings transfers. They stay separate from your expenses and category budgets.</Text><ArrowUpRight size={13} color={colors.primary} /></View>
        </>}
      </ScrollView>

      {goal && <View className="border-t border-border bg-background px-5 pb-2 pt-3"><View className="flex-row gap-2.5"><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/savings-goal-form', params: { goalId: String(goal.id) } })} className="h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-border bg-white"><Pencil size={17} color={colors.primary} /></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/savings-goal-contribution', params: { goalId: String(goal.id) } })} className="h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-[14px] bg-primary shadow-sm shadow-primary/20 active:opacity-80"><Text className="text-[11px] font-bold text-white">Add contribution</Text><ArrowUpRight size={15} color="white" /></Pressable></View></View>}
    </View>
  </SafeAreaView>;
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <View className="min-h-[68px] flex-1 flex-row items-center gap-2 rounded-[15px] border border-[#EEF0F6] bg-white px-3"><View className="h-8 w-8 items-center justify-center rounded-xl bg-accent-light">{icon}</View><View className="flex-1"><Text className="text-[8px] text-muted">{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit className="mt-0.5 text-[10px] font-bold text-primary">{value}</Text></View></View>;
}

/** The goal's icon, chosen by type. A component, so it isn't re-created on every render. */
function GoalIcon({ icon }: { icon: SavingsGoal['icon'] }) {
  return createElement(iconFor(icon), { size: 20, color: colors.primary });
}
