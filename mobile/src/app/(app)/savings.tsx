import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowUpRight, Bell, CalendarDays, ChartNoAxesColumn, Check, ChevronRight, CircleCheck, Ellipsis, Flag, GraduationCap, House, Laptop, Mountain, Plane, Plus, ShieldCheck, Sparkles, Sprout, Sun, TrendingUp, WalletCards } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { AppBottomBar } from '@/components/app-bottom-bar';
import { BrandMark } from '@/components/brand-mark';
import { FormBanner } from '@/components/ui/form-banner';
import { savingsGoalsApi, type SavingsGoal } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

type GoalFilter = 'all' | 'active' | 'achieved';

const money = (amount: string | number | undefined, currency: string) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${currency}`;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
};

const iconFor = (icon: SavingsGoal['icon']) => icon === 'home' ? House : icon === 'travel' ? Plane : icon === 'emergency' ? ShieldCheck : icon === 'education' ? GraduationCap : Laptop;
const goalType = (icon: SavingsGoal['icon']) => ({ emergency: 'Safe cushion', travel: 'Leisure', education: 'Education', home: 'Home', laptop: 'Personal goal' })[icon];

export default function SavingsScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const currency = user?.currency ?? 'PHP';
  const [filter, setFilter] = useState<GoalFilter>('all');
  const goals = useQuery({ queryKey: ['savings-goals'], queryFn: savingsGoalsApi.list });
  const allGoals = goals.data?.goals ?? [];
  const activeGoals = allGoals.filter((goal) => goal.status === 'active');
  const completedGoals = allGoals.filter((goal) => goal.status === 'achieved');
  const visibleGoals = useMemo(() => filter === 'all' ? allGoals : filter === 'active' ? activeGoals : completedGoals, [allGoals, activeGoals, completedGoals, filter]);
  const activeCount = goals.data?.active_count ?? activeGoals.length;
  const completedCount = completedGoals.length;
  const saved = Number(goals.data?.total_saved ?? 0);
  const combinedTarget = Number(goals.data?.combined_target ?? 0);
  const overallProgress = combinedTarget > 0 ? Math.min(100, saved / combinedTarget * 100) : 0;
  const monthlyPlan = activeGoals.reduce((total, goal) => {
    const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount));
    const target = goal.target_date ? new Date(`${goal.target_date}T12:00:00`) : null;
    const now = new Date();
    const months = target ? Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth()) : 12;
    return total + remaining / months;
  }, 0);
  const initials = user?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PP';

  function openCreate() { router.push('/savings-goal-form'); }
  function openGoal(goalId: number) { router.push({ pathname: '/savings-goal-details', params: { goalId: String(goalId) } }); }
  function openContribution(goalId: number) { router.push({ pathname: '/savings-goal-contribution', params: { goalId: String(goalId) } }); }
  function openNotifications() { router.push({ pathname: '/profile-setting', params: { section: 'notifications' } }); }
  function openProfile() { router.navigate('/profile'); }

  return <SafeAreaView className="flex-1 bg-[#F4F6FC]" edges={['top', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow px-3 pb-4" refreshControl={<RefreshControl refreshing={goals.isRefetching} onRefresh={() => void goals.refetch()} tintColor={colors.accent} />}>
      <View className="flex-row items-center justify-between rounded-b-[15px] bg-white px-3 py-2.5">
        <Pressable accessibilityRole="button" accessibilityLabel="PocketPlan home" onPress={() => router.navigate('/')} className="flex-row items-center gap-2"><BrandMark size={25} /><View className="ml-0.5 border-l border-[#E6E9F0] pl-2"><Text className="text-[8px] font-semibold text-muted">Savings</Text></View></Pressable>
        <View className="flex-row items-center gap-2.5"><Pressable accessibilityRole="button" accessibilityLabel="Notification settings" onPress={openNotifications} className="relative h-9 w-9 items-center justify-center rounded-xl bg-[#F4F6FC]"><Bell size={16} color={colors.primary} /><View className="absolute right-[8px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#7584FF]" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={openProfile} className="h-8 w-8 items-center justify-center rounded-full border-2 border-[#E8ECFF] bg-[#DDE5FF]"><Text className="text-[9px] font-bold text-primary">{initials}</Text></Pressable></View>
      </View>

      {goals.isError && <View className="mt-2"><FormBanner message={getErrorMessage(goals.error)} /></View>}

      <LinearGradient colors={['#1B3163', '#213D78', '#294987']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="mt-3 overflow-hidden rounded-[20px]" style={{ borderRadius: 20, overflow: 'hidden', marginTop: 12, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 18 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] font-semibold text-white">Total accumulated</Text>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10"><WalletCards size={18} color="#E6EBFF" /></View>
        </View>
        <Text adjustsFontSizeToFit numberOfLines={1} className="mt-2 text-[30px] font-extrabold leading-[36px] tracking-tight text-white">{money(goals.data?.total_saved, goals.data?.currency ?? currency)}</Text>
        <Text numberOfLines={1} className="mt-1 text-[9px] font-medium text-white/75">{activeCount} active goals · {overallProgress.toFixed(1)}% of combined target</Text>

        <View className="mt-4 flex-row border-t border-white/15 pt-3.5">
          <View className="min-w-0 flex-1 pr-3"><Text className="text-[9px] font-medium text-white/65">Target combined</Text><Text numberOfLines={1} adjustsFontSizeToFit className="mt-1.5 text-[13px] font-bold text-white">{money(goals.data?.combined_target, goals.data?.currency ?? currency)}</Text></View>
          <View className="my-0.5 w-px bg-white/15" />
          <View className="min-w-0 flex-1 pl-3"><Text className="text-[9px] font-medium text-white/65">Monthly plan</Text><Text numberOfLines={1} adjustsFontSizeToFit className="mt-1.5 text-[13px] font-bold text-white">{money(monthlyPlan, goals.data?.currency ?? currency)}<Text className="text-[8px] font-medium text-white/70"> / mo</Text></Text></View>
        </View>
      </LinearGradient>

      <View className="mt-2.5 flex-row gap-2"><Pressable accessibilityRole="button" onPress={openCreate} className="h-[36px] flex-1 flex-row items-center justify-center gap-1.5 rounded-[9px] bg-[#5869E8] shadow-sm shadow-[#4252B6]/20"><Plus size={14} color="white" /><Text className="text-[9px] font-bold text-white">New Goal</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Goal summary" onPress={() => setFilter('all')} className="h-[36px] w-[38px] items-center justify-center rounded-[9px] bg-[#E3E8FF]"><ChartNoAxesColumn size={15} color={colors.primary} /></Pressable></View>

      <View className="mt-2 flex-row gap-1.5"><FilterChip label="All" count={allGoals.length} selected={filter === 'all'} onPress={() => setFilter('all')} /><FilterChip label="In Progress" count={activeCount} selected={filter === 'active'} onPress={() => setFilter('active')} /><FilterChip label="Completed" count={completedCount} selected={filter === 'achieved'} onPress={() => setFilter('achieved')} /></View>

      {goals.isPending ? <View className="mt-2 rounded-[14px] bg-white p-6"><Text className="text-center text-[10px] text-muted">Loading your goals…</Text></View> : visibleGoals.length ? visibleGoals.map((goal) => <GoalCard key={goal.id} goal={goal} currency={goals.data?.currency ?? currency} onOpen={() => openGoal(goal.id)} onContribute={() => openContribution(goal.id)} />) : <EmptyGoals completed={filter === 'achieved'} onCreate={openCreate} />}

      <View className="mt-2.5 flex-row items-center rounded-[13px] border border-[#E5E9FF] bg-[#E9ECFF] px-2.5 py-2"><View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-[#596CEB]"><Sparkles size={13} color="white" /></View><View className="flex-1"><Text className="text-[8px] font-bold text-primary">Your savings momentum</Text><Text numberOfLines={2} className="mt-0.5 text-[7px] leading-[11px] text-[#384560]">You saved {money(goals.data?.month_added, goals.data?.currency ?? currency)} across your goals this month. Keep going—small steps add up.</Text></View></View>
    </ScrollView>

    <AppBottomBar active="savings" />
  </SafeAreaView>;
}

function FilterChip({ label, count, selected, onPress }: { label: string; count: number; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} className={`h-[25px] flex-1 flex-row items-center justify-center gap-1 rounded-full px-2 ${selected ? 'bg-[#112954]' : 'border border-[#E8EAF2] bg-white'}`}><Text className={`text-[7px] ${selected ? 'font-bold text-white' : 'font-semibold text-[#52617E]'}`}>{label}</Text><Text className={`text-[7px] ${selected ? 'font-bold text-white' : 'text-[#68758F]'}`}>({count})</Text></Pressable>;
}

function GoalCard({ goal, currency, onOpen, onContribute }: { goal: SavingsGoal; currency: string; onOpen: () => void; onContribute: () => void }) {
  const ratio = Number(goal.target_amount) > 0 ? Number(goal.saved_amount) / Number(goal.target_amount) : 0;
  const progress = Math.max(0, Math.min(100, ratio * 100));
  const Icon = iconFor(goal.icon);
  const complete = goal.status === 'achieved';
  const targetDate = goal.target_date ? new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(`${goal.target_date}T12:00:00`)) : 'Flexible target';
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount));
  const monthPlan = goal.target_date ? remaining / Math.max(1, (new Date(`${goal.target_date}T12:00:00`).getFullYear() - new Date().getFullYear()) * 12 + new Date(`${goal.target_date}T12:00:00`).getMonth() - new Date().getMonth()) : remaining / 12;

  function showActions() {
    Alert.alert(goal.name, 'Choose an action for this savings goal.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'View details', onPress: onOpen },
      { text: 'Edit goal', onPress: () => router.push({ pathname: '/savings-goal-form', params: { goalId: String(goal.id) } }) },
    ]);
  }

  return <View className="mt-2 overflow-hidden rounded-[13px] border border-[#EDF0F6] bg-white p-2">
    {goal.icon === 'travel' && <TravelScene />}
    <View className="flex-row items-start pt-0.5">
      <Pressable accessibilityRole="button" onPress={onOpen} className="mr-2 mt-0.5 h-8 w-8 items-center justify-center rounded-[10px] bg-[#EEF0FF]"><Icon size={14} color={colors.primary} /></Pressable>
      <Pressable accessibilityRole="button" onPress={onOpen} className="min-w-0 flex-1"><Text numberOfLines={1} className="text-[9px] font-bold text-[#17294C]">{goal.name}</Text><Text numberOfLines={1} className="mt-0.5 text-[7px] text-[#71809A]">Due {targetDate} · {goalType(goal.icon)}</Text></Pressable>
      <View className={`rounded-full px-1.5 py-1 ${complete ? 'bg-[#E5F7ED]' : 'bg-[#EEF0FF]'}`}><Text className={`text-[7px] font-bold ${complete ? 'text-[#26764C]' : 'text-[#4159C7]'}`}>{progress.toFixed(1)}%</Text></View>
    </View>
    <View className="mt-2 flex-row items-center justify-between"><Text className="text-[15px] font-extrabold tracking-tight text-[#213B70]">{money(goal.saved_amount, currency)}</Text><Text className="text-[7px] text-[#78839A]">Target: {money(goal.target_amount, currency)}</Text></View>
    <View className="mt-1 h-[4px] overflow-hidden rounded-full bg-[#E9ECFA]"><View className={`h-full rounded-full ${complete ? 'bg-[#45B881]' : 'bg-[#687BFF]'}`} style={{ width: `${progress}%` }} /></View>
    <View className="mt-1 flex-row items-center justify-between"><View className="flex-row items-center gap-1"><CalendarDays size={9} color={colors.accent} /><Text className="text-[7px] text-[#75819A]">{goal.reminder_enabled ? `Suggested · ${money(monthPlan, currency)}/mo` : `${goal.contribution_count} contribution${goal.contribution_count === 1 ? '' : 's'} so far`}</Text></View><Text className="text-[7px] font-bold text-primary">{complete ? 'Goal completed' : `${money(remaining, currency)} left`}</Text></View>
    <View className="mt-2 flex-row items-center gap-1.5"><Pressable accessibilityRole="button" onPress={complete ? onOpen : onContribute} className="h-[25px] flex-1 flex-row items-center justify-center gap-1 rounded-[7px] bg-[#EAEDFF]">{complete ? <Check size={10} color={colors.primary} /> : <Plus size={10} color={colors.primary} />}<Text className="text-[7px] font-bold text-primary">{complete ? 'View Summary' : 'Contribute'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`More actions for ${goal.name}`} onPress={showActions} className="h-[25px] w-[29px] items-center justify-center rounded-[7px] bg-[#F1F3F8]"><Ellipsis size={14} color={colors.primary} /></Pressable></View>
  </View>;
}

function TravelScene() {
  return <LinearGradient colors={['#D9E7FF', '#F4CBA8', '#B9D7CF']} className="mb-2 h-[70px] overflow-hidden rounded-[9px]">
    <View className="absolute right-5 top-2 h-5 w-5 items-center justify-center rounded-full bg-[#FFF4D6]"><Sun size={12} color="#E8A94D" /></View>
    <Svg width="100%" height="70" viewBox="0 0 340 70" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0 }}><Polygon points="0,59 64,18 126,59" fill="#809B9B" /><Polygon points="78,61 160,7 239,61" fill="#6E888C" /><Polygon points="195,61 272,23 340,61" fill="#8FA8A3" /><Polygon points="0,59 340,59 340,70 0,70" fill="#405A66" opacity="0.75" /></Svg>
    <View className="absolute bottom-2 left-2.5 flex-row items-center gap-1.5"><View className="h-6 w-6 items-center justify-center rounded-lg bg-white/80"><Mountain size={13} color="#29436C" /></View><View><Text className="text-[6px] font-bold tracking-[1px] text-[#263C5A]">TRAVEL FUND</Text><Text className="mt-0.5 text-[8px] font-extrabold text-[#17294C]">A trip you’re dreaming of</Text></View></View>
    <View className="absolute right-3 top-3"><Plane size={14} color="#31486F" /></View>
  </LinearGradient>;
}

function EmptyGoals({ completed, onCreate }: { completed: boolean; onCreate: () => void }) {
  return <View className="mt-2 items-center rounded-[14px] border border-dashed border-[#D7DDF0] bg-white px-5 py-6"><View className="h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF]"><Sprout size={18} color={colors.accent} /></View><Text className="mt-2 text-[10px] font-bold text-primary">{completed ? 'Your first completed goal will appear here' : 'Start saving toward something you love'}</Text><Text className="mt-1 text-center text-[8px] leading-3 text-muted">{completed ? 'Keep contributing and celebrate when you reach your target.' : 'Create a goal and give every contribution a purpose.'}</Text>{!completed && <Pressable onPress={onCreate} className="mt-2.5 rounded-full bg-primary px-3 py-1.5"><Text className="text-[8px] font-bold text-white">Create a goal</Text></Pressable>}</View>;
}
