import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ChartNoAxesColumn, ChevronRight, Flag, GraduationCap, House, Laptop, Plane, Plus, ShieldCheck, Sprout, TrendingUp, UserRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { FormBanner } from '@/components/ui/form-banner';
import { savingsGoalsApi, type SavingsGoal } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const money = (amount: string | number | undefined, currency: string) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${currency}`;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
};

const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date());

export default function SavingsScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const currency = user?.currency ?? 'PHP';
  const goals = useQuery({ queryKey: ['savings-goals'], queryFn: savingsGoalsApi.list });
  const activeGoals = goals.data?.goals.filter((goal) => goal.status === 'active') ?? [];
  function openCreate() { router.push('/savings-goal-form'); }

  const signOut = useAuthStore((state) => state.signOut);
  const profile = () => Alert.alert('PocketPlan profile', user?.email ?? 'Your profile', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
  ]);

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-5" refreshControl={<RefreshControl refreshing={goals.isRefetching} onRefresh={() => void goals.refetch()} tintColor={colors.accent} />}>
      <View className="pt-2"><BrandMark size={32} /></View>
      <View className="mt-5 flex-row items-start justify-between">
        <View><Text className="text-[26px] font-bold tracking-tight text-primary">Savings goals</Text><Text className="mt-1 text-[11px] text-muted">Little by little, your future takes shape.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Create a savings goal" onPress={openCreate} className="mt-1 h-9 w-9 items-center justify-center rounded-full active:bg-accent-light"><Plus size={20} color={colors.primary} /></Pressable>
      </View>

      {goals.isError && <View className="mt-3"><FormBanner message={getErrorMessage(goals.error)} /></View>}

      <View className="mt-4 rounded-[22px] bg-primary px-4 py-4">
        <Text className="text-[10px] font-medium text-white/80">Saved across your goals</Text>
        <Text className="mt-1 text-[30px] font-bold tracking-tight text-white">{money(goals.data?.total_saved, goals.data?.currency ?? currency)}</Text>
        <Text className="mt-1 text-[9px] text-white/75">{Number(goals.data?.combined_target) > 0 ? `${Math.min(100, Math.floor(Number(goals.data?.total_saved) / Number(goals.data?.combined_target) * 100))}% of ${money(goals.data?.combined_target, goals.data?.currency ?? currency)} combined targets` : 'Create a goal and start saving toward it'}</Text>
        <View className="mt-4 flex-row items-center gap-1.5"><TrendingUp size={13} color="#DCE4FF" /><Text className="text-[9px] text-white/85">{money(goals.data?.month_added, goals.data?.currency ?? currency)} added in {monthName} · {goals.data?.month_contributions ?? 0} contributions</Text></View>
      </View>

      <View className="mt-4 flex-row items-center justify-between"><Text className="text-[15px] font-bold text-primary">Your goals</Text><Text className="text-[10px] font-semibold text-primary">{goals.data?.active_count ?? 0} active</Text></View>

      {goals.isPending ? <View className="mt-3 rounded-[18px] bg-white p-6"><Text className="text-center text-xs text-muted">Loading your goals…</Text></View> : activeGoals.length ? activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} currency={goals.data?.currency ?? currency} onPress={() => router.push({ pathname: '/savings-goal-details', params: { goalId: String(goal.id) } })} />) : <View className="mt-3 items-center rounded-[18px] border border-dashed border-[#DDE2EF] bg-white px-5 py-7"><View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-light"><Sprout size={18} color={colors.accent} /></View><Text className="mt-2 text-[12px] font-bold text-primary">No savings goals yet</Text><Text className="mt-1 text-center text-[9px] leading-4 text-muted">Give your savings a purpose by creating your first goal.</Text></View>}

      <View className="mt-4 rounded-[17px] bg-[#EEF0FF] px-3.5 py-3.5">
        <Text className="text-[11px] font-bold text-primary">Every contribution counts.</Text>
        <Text className="mt-2 text-[9px] leading-[15px] text-ink">Savings are money you set aside, not money you spend. Your contributions won't use up your category budgets.</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={openCreate} className="mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-[10px] bg-primary active:opacity-80"><Text className="text-[11px] font-bold text-white">Create a savings goal</Text><Plus size={14} color="white" /></Pressable>
    </ScrollView>

    <View className="flex-row border-t border-border bg-card px-1 pb-1 pt-2">
      <TabItem label="Home" icon={<House size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/')} />
      <TabItem label="Activity" icon={<ArrowLeftRight size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/activity')} />
      <TabItem label="Budgets" icon={<ChartNoAxesColumn size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/budgets')} />
      <TabItem label="Goals" active icon={<Flag size={16} color={colors.primary} />} onPress={() => undefined} />
      <TabItem label="Profile" icon={<UserRound size={16} color={colors.textSecondary} />} onPress={profile} />
    </View>

  </SafeAreaView>;
}

function GoalCard({ goal, currency, onPress }: { goal: SavingsGoal; currency: string; onPress: () => void }) {
  const ratio = Number(goal.target_amount) > 0 ? Number(goal.saved_amount) / Number(goal.target_amount) : 0;
  const progress = Math.max(0, Math.min(100, ratio * 100));
  const Icon = goal.icon === 'home' ? House : goal.icon === 'travel' ? Plane : goal.icon === 'emergency' ? ShieldCheck : goal.icon === 'education' ? GraduationCap : Laptop;
  const sublabel = goal.target_date ? `Saving toward · ${dateLabel(goal.target_date)}` : `${goal.contribution_count} contribution${goal.contribution_count === 1 ? '' : 's'}`;

  return <Pressable accessibilityRole="button" accessibilityLabel={`${goal.name}, ${money(goal.saved_amount, currency)} saved. Add contribution.`} onPress={onPress} className="mt-3 rounded-[17px] bg-white px-3.5 py-3.5 active:opacity-80">
    <View className="flex-row items-start justify-between"><View className="flex-row flex-1 items-center gap-2.5"><View className="h-8 w-8 items-center justify-center rounded-xl bg-accent-light"><Icon size={15} color={colors.primary} /></View><View className="flex-1"><Text numberOfLines={1} className="text-[11px] font-bold text-ink">{goal.name}</Text><Text numberOfLines={1} className="mt-0.5 text-[9px] text-muted">{sublabel}</Text></View></View><ChevronRight size={16} color={colors.primary} /></View>
    <Text className="mt-2.5 text-[21px] font-bold tracking-tight text-primary">{money(goal.saved_amount, currency)}</Text>
    <View className="mt-2 h-[5px] overflow-hidden rounded-full bg-[#ECEEFF]"><View className="h-full rounded-full bg-[#667BFF]" style={{ width: `${progress}%` }} /></View>
    <Text className="mt-1.5 text-[9px] text-muted">{Math.floor(progress)}% saved · {money(goal.target_amount, currency)} goal</Text>
  </Pressable>;
}

function TabItem({ label, icon, active = false, onPress }: { label: string; icon: React.ReactNode; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-12 flex-1 items-center justify-center gap-0.5"><View className={`h-7 min-w-8 items-center justify-center rounded-full px-2 ${active ? 'bg-accent-light' : ''}`}>{icon}</View><Text className={`text-[9px] ${active ? 'font-semibold text-primary' : 'text-muted'}`}>{label}</Text></Pressable>;
}
