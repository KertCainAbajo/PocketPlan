import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  Ellipsis,
  Flag,
  GraduationCap,
  House,
  Laptop,
  Mountain,
  Plane,
  Plus,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { showAlert } from '@/components/app-alert';
import { AppBottomBar } from '@/components/app-bottom-bar';
import { BrandMark } from '@/components/brand-mark';
import { FadeInItem, Skeleton } from '@/components/motion';
import { FormBanner } from '@/components/ui/form-banner';
import { savingsGoalsApi, type SavingsGoal } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { cachedDateTimeFormat, cachedNumberFormat } from '@/lib/intl';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

type GoalFilter = 'all' | 'active' | 'achieved';

const LIGHT_ACCENT = '#AEB8FF';

/** Soft, navy-tinted elevation shared by the floating cards. */
const cardShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const money = (amount: string | number | undefined, currency: string) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${currency}`;
  try { return cachedNumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
};

/** Each goal type has its own icon and colour so goals are easy to tell apart. */
const GOAL_STYLE: Record<SavingsGoal['icon'], { Icon: LucideIcon; label: string; color: string }> = {
  laptop: { Icon: Laptop, label: 'Personal goal', color: '#6C7CF7' },
  home: { Icon: House, label: 'Home', color: '#F59E0B' },
  travel: { Icon: Plane, label: 'Leisure', color: '#0EA5E9' },
  emergency: { Icon: ShieldCheck, label: 'Safe cushion', color: '#10B981' },
  education: { Icon: GraduationCap, label: 'Education', color: '#8B5CF6' },
};

const monthsUntil = (date: string) => {
  const target = new Date(`${date}T12:00:00`);
  const now = new Date();
  return Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth());
};

export default function SavingsScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const currency = user?.currency ?? 'PHP';
  const [filter, setFilter] = useState<GoalFilter>('all');
  const goals = useQuery({ queryKey: ['savings-goals'], queryFn: savingsGoalsApi.list });
  const allGoals = goals.data?.goals ?? [];
  const activeGoals = allGoals.filter((goal) => goal.status === 'active');
  const completedGoals = allGoals.filter((goal) => goal.status === 'achieved');
  const visibleGoals = filter === 'all' ? allGoals : filter === 'active' ? activeGoals : completedGoals;
  const activeCount = goals.data?.active_count ?? activeGoals.length;
  const completedCount = completedGoals.length;
  const goalCurrency = goals.data?.currency ?? currency;
  const saved = Number(goals.data?.total_saved ?? 0);
  const combinedTarget = Number(goals.data?.combined_target ?? 0);
  const overallProgress = combinedTarget > 0 ? Math.min(100, saved / combinedTarget * 100) : 0;
  const monthlyPlan = activeGoals.reduce((total, goal) => {
    const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount));
    return total + remaining / (goal.target_date ? monthsUntil(goal.target_date) : 12);
  }, 0);
  const initials = user?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PP';

  function openCreate() { router.push('/savings-goal-form'); }
  function openGoal(goalId: number) { router.push({ pathname: '/savings-goal-details', params: { goalId: String(goalId) } }); }
  function openContribution(goalId: number) { router.push({ pathname: '/savings-goal-contribution', params: { goalId: String(goalId) } }); }
  function openNotifications() { router.push({ pathname: '/profile-setting', params: { section: 'notifications' } }); }
  function openProfile() { router.navigate('/profile'); }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow px-5 pb-8"
        refreshControl={<RefreshControl refreshing={goals.isRefetching} onRefresh={() => void goals.refetch()} tintColor={colors.accent} />}>
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="PocketPlan home" onPress={() => router.navigate('/')}>
            <BrandMark size={34} />
          </Pressable>
          <View className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notification settings"
              onPress={openNotifications}
              style={cardShadow}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-card active:bg-accent-light">
              <Bell size={19} color={colors.primary} strokeWidth={1.9} />
              <View className="absolute right-[11px] top-[10px] h-2 w-2 rounded-full border border-white bg-accent" />
            </Pressable>
            <View className="overflow-hidden rounded-full">
              <LinearGradient colors={[colors.accent, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={openProfile} className="h-11 w-11 items-center justify-center active:opacity-80">
                  <Text className="text-[14px] font-bold text-white">{initials}</Text>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </View>

        <View className="mt-5">
          <Text className="text-[26px] font-extrabold tracking-tight text-ink">Savings goals</Text>
          <Text className="mt-0.5 text-[13px] text-muted">Give every peso you save a purpose.</Text>
        </View>

        {goals.isError && <View className="mt-4"><FormBanner message={getErrorMessage(goals.error)} /></View>}

        {/* Hero */}
        <View className="mt-5 overflow-hidden rounded-[30px]">
          <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
            <View pointerEvents="none" className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-accent opacity-25" />
            <View pointerEvents="none" className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-white opacity-[0.04]" />

            <View className="flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-white/60">Total saved</Text>
              <View className="flex-row items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                <TrendingUp size={12} color="#4ADE80" strokeWidth={2.4} />
                <Text className="text-[11px] font-bold text-white">+{money(goals.data?.month_added ?? 0, goalCurrency)} this month</Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center">
              <View className="flex-1 pr-3">
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-[38px] font-extrabold tracking-tight text-white">
                  {goals.isPending ? '—' : money(goals.data?.total_saved, goalCurrency)}
                </Text>
                <Text className="mt-0.5 text-[13px] leading-[18px] text-white/70">
                  {activeCount} active {activeCount === 1 ? 'goal' : 'goals'} · {overallProgress.toFixed(1)}% of your combined target
                </Text>
              </View>
              <ProgressRing percent={overallProgress} />
            </View>

            <View className="mt-5 flex-row rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3">
              <HeroStat Icon={Target} label="Combined target" value={money(goals.data?.combined_target ?? 0, goalCurrency)} />
              <View className="mx-2 w-px bg-white/10" />
              <HeroStat Icon={CalendarDays} label="Monthly plan" value={`${money(monthlyPlan, goalCurrency)}/mo`} />
              <View className="mx-2 w-px bg-white/10" />
              <HeroStat Icon={Check} label="Completed" value={String(completedCount)} />
            </View>
          </LinearGradient>
        </View>

        {/* Actions */}
        <View className="mt-4 flex-row gap-2.5">
          <Pressable
            accessibilityRole="button"
            onPress={openCreate}
            style={[cardShadow, { shadowOpacity: 0.25 }]}
            className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-80">
            <Plus size={18} color="white" strokeWidth={2.4} />
            <Text className="text-[14px] font-bold text-white">New goal</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Goal summary"
            onPress={() => setFilter('all')}
            style={cardShadow}
            className="h-[52px] w-[52px] items-center justify-center rounded-2xl bg-card active:bg-accent-light">
            <ChartNoAxesColumn size={19} color={colors.primary} />
          </Pressable>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mt-4" contentContainerClassName="gap-2 px-5">
          <FilterChip label="All" count={allGoals.length} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label="In progress" count={activeCount} selected={filter === 'active'} onPress={() => setFilter('active')} />
          <FilterChip label="Completed" count={completedCount} selected={filter === 'achieved'} onPress={() => setFilter('achieved')} />
        </ScrollView>

        {goals.isPending ? (
          <View className="mt-4 gap-3">
            {[0, 1].map((i) => <Skeleton key={i} className="h-[170px] rounded-3xl" />)}
          </View>
        ) : visibleGoals.length ? (
          visibleGoals.map((goal, index) => (
            <FadeInItem key={goal.id} index={index}>
              <GoalCard goal={goal} currency={goalCurrency} onOpen={() => openGoal(goal.id)} onContribute={() => openContribution(goal.id)} />
            </FadeInItem>
          ))
        ) : (
          <EmptyGoals completed={filter === 'achieved'} onCreate={openCreate} />
        )}

        {/* Momentum */}
        <View className="mt-5 overflow-hidden rounded-3xl">
          <LinearGradient colors={['#EEF0FF', '#E2E6FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-accent">
              <Sparkles size={19} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-primary">Your savings momentum</Text>
              <Text className="mt-0.5 text-[12px] leading-[17px] text-primary/70">
                You saved {money(goals.data?.month_added ?? 0, goalCurrency)} across your goals this month. Keep going, small steps add up.
              </Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      <AppBottomBar active="savings" />
    </SafeAreaView>
  );
}

/** Circular gauge of overall progress toward all goals combined. */
function ProgressRing({ percent, size = 84, stroke = 8 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${Math.round(percent)} percent of combined target saved`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#4ADE80"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-base font-extrabold text-white">{Math.round(percent)}%</Text>
        <Text className="text-[10px] font-medium text-white/60">saved</Text>
      </View>
    </View>
  );
}

function HeroStat({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-1.5">
        <Icon size={13} color={LIGHT_ACCENT} strokeWidth={2.2} />
        <Text numberOfLines={1} className="flex-1 text-[11px] text-white/60">{label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit className="mt-1 text-sm font-bold text-white">{value}</Text>
    </View>
  );
}

function FilterChip({ label, count, selected, onPress }: { label: string; count: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={selected ? undefined : cardShadow}
      className={`h-10 flex-row items-center gap-2 rounded-full px-4 ${selected ? 'bg-primary' : 'bg-card'}`}>
      <Text className={`text-[13px] ${selected ? 'font-bold text-white' : 'font-semibold text-ink'}`}>{label}</Text>
      <View className={`min-w-[22px] items-center rounded-full px-1.5 py-0.5 ${selected ? 'bg-white/20' : 'bg-background'}`}>
        <Text className={`text-[11px] font-bold ${selected ? 'text-white' : 'text-muted'}`}>{count}</Text>
      </View>
    </Pressable>
  );
}

function GoalCard({ goal, currency, onOpen, onContribute }: { goal: SavingsGoal; currency: string; onOpen: () => void; onContribute: () => void }) {
  const ratio = Number(goal.target_amount) > 0 ? Number(goal.saved_amount) / Number(goal.target_amount) : 0;
  const progress = Math.max(0, Math.min(100, ratio * 100));
  const style = GOAL_STYLE[goal.icon] ?? GOAL_STYLE.laptop;
  const complete = goal.status === 'achieved';
  const accent = complete ? '#10B981' : style.color;
  const targetDate = goal.target_date ? cachedDateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(`${goal.target_date}T12:00:00`)) : 'Flexible target';
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount));
  const monthPlan = remaining / (goal.target_date ? monthsUntil(goal.target_date) : 12);

  function showActions() {
    showAlert(goal.name, 'Choose an action for this savings goal.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'View details', onPress: onOpen },
      { text: 'Edit goal', onPress: () => router.push({ pathname: '/savings-goal-form', params: { goalId: String(goal.id) } }) },
    ], { icon: Flag });
  }

  return (
    <View style={cardShadow} className="mt-4 rounded-3xl bg-card p-4">
      {goal.icon === 'travel' && <TravelScene />}

      <Pressable accessibilityRole="button" accessibilityLabel={`${goal.name} details`} onPress={onOpen} className="flex-row items-center active:opacity-70">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${style.color}22` }}>
          <style.Icon size={21} color={style.color} strokeWidth={2} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-bold text-ink">{goal.name}</Text>
          <Text numberOfLines={1} className="mt-0.5 text-[12px] text-muted">{style.label} · Due {targetDate}</Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: complete ? colors.positive : colors.accentLight }}>
          {complete && <Check size={12} color={colors.positiveText} strokeWidth={2.6} />}
          <Text className="text-[11px] font-bold" style={{ color: complete ? colors.positiveText : colors.primary }}>
            {complete ? 'Done' : `${progress.toFixed(0)}%`}
          </Text>
        </View>
      </Pressable>

      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-[11px] text-muted">Saved</Text>
          <Text className="mt-0.5 text-[22px] font-extrabold tracking-tight text-ink">{money(goal.saved_amount, currency)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[11px] text-muted">Target</Text>
          <Text className="mt-0.5 text-[14px] font-bold text-ink">{money(goal.target_amount, currency)}</Text>
        </View>
      </View>

      <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#ECEEF5]">
        <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: accent }} />
      </View>

      <View className="mt-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <CalendarDays size={13} color={colors.textSecondary} />
          <Text className="text-[12px] text-muted">
            {goal.reminder_enabled ? `Suggested ${money(monthPlan, currency)}/mo` : `${goal.contribution_count} contribution${goal.contribution_count === 1 ? '' : 's'} so far`}
          </Text>
        </View>
        <Text className="text-[12px] font-bold" style={{ color: complete ? colors.positiveText : colors.primary }}>
          {complete ? 'Goal completed' : `${money(remaining, currency)} left`}
        </Text>
      </View>

      <View className="mt-4 flex-row items-center gap-2.5">
        <Pressable
          accessibilityRole="button"
          onPress={complete ? onOpen : onContribute}
          className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl active:opacity-80 ${complete ? 'bg-positive' : 'bg-primary'}`}>
          {complete ? <Check size={16} color={colors.positiveText} strokeWidth={2.4} /> : <Plus size={16} color="white" strokeWidth={2.4} />}
          <Text className={`text-[13px] font-bold ${complete ? 'text-positive-text' : 'text-white'}`}>{complete ? 'View summary' : 'Contribute'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${goal.name}`}
          onPress={showActions}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-background active:bg-accent-light">
          <Ellipsis size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function TravelScene() {
  return (
    <View className="mb-4 overflow-hidden rounded-2xl">
      <LinearGradient colors={['#D9E7FF', '#F4CBA8', '#B9D7CF']} style={{ height: 96 }}>
        <View className="absolute right-6 top-3 h-7 w-7 items-center justify-center rounded-full bg-[#FFF4D6]">
          <Sun size={16} color="#E8A94D" />
        </View>
        <Svg width="100%" height="96" viewBox="0 0 340 96" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0 }}>
          <Polygon points="0,80 64,30 126,80" fill="#809B9B" />
          <Polygon points="78,82 160,14 239,82" fill="#6E888C" />
          <Polygon points="195,82 272,36 340,82" fill="#8FA8A3" />
          <Polygon points="0,80 340,80 340,96 0,96" fill="#405A66" opacity="0.75" />
        </Svg>
        <View className="absolute bottom-3 left-3 flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/85">
            <Mountain size={16} color="#29436C" />
          </View>
          <View>
            <Text className="text-[9px] font-bold tracking-[1px] text-white">TRAVEL FUND</Text>
            <Text className="mt-0.5 text-[12px] font-extrabold text-white">A trip you’re dreaming of</Text>
          </View>
        </View>
        <View className="absolute right-[60px] top-4">
          <Plane size={16} color="#31486F" />
        </View>
      </LinearGradient>
    </View>
  );
}

function EmptyGoals({ completed, onCreate }: { completed: boolean; onCreate: () => void }) {
  return (
    <View style={cardShadow} className="mt-4 items-center rounded-3xl bg-card px-6 py-9">
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-accent-light">
        {completed ? <Flag size={26} color={colors.accent} /> : <Sprout size={26} color={colors.accent} />}
      </View>
      <Text className="mt-4 text-center text-base font-bold text-ink">
        {completed ? 'Your first completed goal will appear here' : 'Start saving toward something you love'}
      </Text>
      <Text className="mt-1.5 text-center text-[13px] leading-5 text-muted">
        {completed ? 'Keep contributing and celebrate when you reach your target.' : 'Create a goal and give every contribution a purpose.'}
      </Text>
      {!completed && (
        <>
          <View className="mt-4 flex-row flex-wrap justify-center gap-2">
            {(['emergency', 'laptop', 'travel'] as const).map((icon) => {
              const idea = GOAL_STYLE[icon];
              const label = icon === 'emergency' ? 'Emergency fund' : icon === 'laptop' ? 'New laptop' : 'Dream trip';
              return (
                <Pressable
                  key={icon}
                  accessibilityRole="button"
                  accessibilityLabel={`Create a goal like ${label}`}
                  onPress={onCreate}
                  className="flex-row items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 active:opacity-70">
                  <idea.Icon size={14} color={idea.color} strokeWidth={2.2} />
                  <Text className="text-[12px] font-semibold text-ink">{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={onCreate} className="mt-5 flex-row items-center gap-1.5 rounded-full bg-primary px-5 py-3 active:opacity-80">
            <Plus size={15} color="white" strokeWidth={2.4} />
            <Text className="text-[13px] font-bold text-white">Create a goal</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
