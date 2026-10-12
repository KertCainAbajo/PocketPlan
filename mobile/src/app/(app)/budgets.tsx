import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Bus, CalendarDays, ChartNoAxesColumn, ChevronRight, House, ReceiptText, ShoppingBag, ShoppingBasket, Utensils, WalletCards, Pencil, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { AppBottomBar } from '@/components/app-bottom-bar';
import { budgetApi, type BudgetItem } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

function money(amount: string | number | undefined, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${currency}`;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
}

const shortDate = (date: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));

/** "Oct 11 – Oct 17": budgets are browsed by their own period, not by calendar month. */
function periodLabel(budget: BudgetItem) {
  return `${shortDate(budget.start_date)} – ${shortDate(budget.end_date)}`;
}

/** Today's date as YYYY-MM-DD on this device, comparable with budget dates. */
function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function periodTiming(budget: BudgetItem, today: string): { label: string; tone: string } {
  if (budget.start_date > today) return { label: 'Upcoming', tone: 'bg-accent-light text-primary' };
  if (budget.end_date < today || budget.status === 'completed') return { label: 'Past period', tone: 'bg-border text-muted' };
  return { label: 'Current period', tone: 'bg-positive text-positive-text' };
}

function categoryIcon(name: string) {
  const value = name.toLowerCase();
  if (value.includes('home') || value.includes('housing')) return House;
  if (value.includes('grocery') || value.includes('food')) return ShoppingBasket;
  if (value.includes('dining') || value.includes('restaurant')) return Utensils;
  if (value.includes('transport')) return Bus;
  if (value.includes('shop')) return ShoppingBag;
  if (value.includes('bill')) return ReceiptText;
  return WalletCards;
}

export default function BudgetsScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const currency = user?.currency ?? 'PHP';
  const [pickedId, setPickedId] = useState<number | null>(null);
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: budgetApi.list });

  // Newest period first. Open on the period that contains today, then step older/newer.
  const today = todayString();
  const periods = [...(budgets.data ?? [])].sort((a, b) => b.start_date.localeCompare(a.start_date));
  const currentIndex = periods.findIndex((b) => b.start_date <= today && b.end_date >= today);
  const pickedIndex = pickedId === null ? -1 : periods.findIndex((b) => b.id === pickedId);
  const index = pickedIndex >= 0 ? pickedIndex : currentIndex >= 0 ? currentIndex : 0;
  const selected = periods[index] as BudgetItem | undefined;
  const older = periods[index + 1];
  const newer = index > 0 ? periods[index - 1] : undefined;
  const detail = useQuery({ queryKey: ['budget', selected?.id], queryFn: () => budgetApi.get(selected!.id), enabled: Boolean(selected?.id) });
  const budget = detail.data ?? selected;
  const categoryLimits = budget?.category_limits ?? [];
  // Envelope view: the period's money is split across categories, so the headline is what is not yet assigned.
  const budgetAmount = Number(budget?.spending_limit ?? 0);
  const limitTotal = Math.round(categoryLimits.reduce((total, category) => total + Number(category.limit_amount), 0) * 100) / 100;
  const leftToAssign = Math.round((budgetAmount - limitTotal) * 100) / 100;
  const overAssigned = leftToAssign < 0;
  const assignedPercent = budgetAmount > 0 ? Math.min(100, Math.round((limitTotal / budgetAmount) * 100)) : 0;
  const periodStart = budget ? new Date(`${budget.start_date}T12:00:00`) : new Date();
  const periodEnd = budget ? new Date(`${budget.end_date}T12:00:00`) : new Date();
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const periodProgress = budget ? Math.min(100, Math.max(0, Math.round(((now.getTime() - periodStart.getTime()) / Math.max(1, periodEnd.getTime() - periodStart.getTime())) * 100))) : 0;
  const timing = selected ? periodTiming(selected, today) : null;
  const createBudget = () => router.push('/budget-form');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-6" refreshControl={<RefreshControl refreshing={budgets.isRefetching || detail.isRefetching} onRefresh={() => { void budgets.refetch(); if (selected) void detail.refetch(); }} tintColor={colors.accent} />}>
        <View className="flex-row items-center justify-between pt-3">
          <View><Text className="text-[25px] font-bold tracking-tight text-primary">Budgets</Text><Text className="mt-1 text-[11px] text-muted">One spending plan for each allowance period.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Create budget" onPress={createBudget} className="h-10 w-10 items-center justify-center rounded-2xl bg-primary active:opacity-75"><Plus size={19} color="white" /></Pressable>
        </View>

        <View className="mt-5 min-h-[54px] flex-row items-center justify-between rounded-2xl border border-border bg-card px-2 py-1.5">
          <Pressable accessibilityRole="button" accessibilityLabel="Previous budget period" accessibilityState={{ disabled: !older }} disabled={!older} onPress={() => older && setPickedId(older.id)} className={`h-9 w-9 items-center justify-center rounded-xl active:bg-accent-light ${older ? '' : 'opacity-30'}`}><ArrowLeft size={17} color={colors.primary} /></Pressable>
          <View className="items-center">
            <View className="flex-row items-center gap-2"><CalendarDays size={14} color={colors.primary} /><Text className="text-[13px] font-semibold text-primary">{selected ? periodLabel(selected) : 'No budget periods'}</Text></View>
            {timing && <Text className={`mt-1 rounded-full px-2 py-px text-[9px] font-semibold ${timing.tone}`}>{timing.label}</Text>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next budget period" accessibilityState={{ disabled: !newer }} disabled={!newer} onPress={() => newer && setPickedId(newer.id)} className={`h-9 w-9 items-center justify-center rounded-xl active:bg-accent-light ${newer ? '' : 'opacity-30'}`}><ArrowRight size={17} color={colors.primary} /></Pressable>
        </View>

        {budgets.isError && <View className="mt-3"><FormBanner message={getErrorMessage(budgets.error)} /></View>}
        {detail.isError && <View className="mt-3"><FormBanner message={getErrorMessage(detail.error)} /></View>}

        {budgets.isPending ? <View className="mt-4 rounded-[22px] bg-card p-6"><Text className="text-center text-xs text-muted">Loading your plan…</Text></View> : budget ? <>
          <View className="mt-4 overflow-hidden rounded-[24px] bg-primary px-5 pb-5 pt-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2"><View className="h-7 w-7 items-center justify-center rounded-lg bg-white/15"><ChartNoAxesColumn size={15} color="white" /></View><Text className="text-[10px] font-semibold text-white/85">{budget.frequency[0].toUpperCase() + budget.frequency.slice(1)} spending plan</Text></View>
              <View className="rounded-full bg-white/15 px-2.5 py-1"><Text className="text-[9px] font-semibold text-white">{assignedPercent}% assigned</Text></View>
            </View>
            <Text className="mt-4 text-[9px] font-medium uppercase tracking-[1.1px] text-white/65">{overAssigned ? 'Over-assigned by' : 'Left to assign'}</Text>
            <Text className={`mt-1 text-[31px] font-bold tracking-tight ${overAssigned ? 'text-[#F08A8A]' : 'text-white'}`}>{money(Math.abs(leftToAssign), currency)}</Text>
            <Text className="mt-1 text-[10px] leading-4 text-white/75">{overAssigned ? 'Your categories add up to more than this budget. Lower one of them.' : leftToAssign === 0 ? 'Every peso has a job. Nice!' : `Split your ${money(budgetAmount, currency)} into categories below.`}</Text>
            <View className="mt-4 h-[7px] overflow-hidden rounded-full bg-white/20"><View className={`h-full rounded-full ${overAssigned ? 'bg-[#F08A8A]' : 'bg-[#8BC9B4]'}`} style={{ width: `${assignedPercent}%` }} /></View>
            <View className="mt-2 flex-row items-center justify-between"><Text className="text-[9px] text-white/75">{money(limitTotal, currency)} assigned</Text><Text className="text-[9px] text-white/75">of {money(budgetAmount, currency)}</Text></View>
            {budget.status !== 'completed' && <Pressable accessibilityRole="button" accessibilityLabel={`Change the ${budget.frequency} budget amount`} onPress={() => router.push({ pathname: '/budget-form', params: { budgetId: String(budget.id) } })} className="mt-4 h-10 flex-row items-center justify-center gap-2 rounded-xl bg-white/15 active:opacity-70"><Pencil size={13} color="white" /><Text className="text-[10px] font-semibold text-white">Change {budget.frequency} amount · {money(budgetAmount, currency)}</Text></Pressable>}
            <View className="mt-4 flex-row items-center justify-between border-t border-white/15 pt-3"><View><Text className="text-[8px] text-white/65">Spent so far</Text><Text className="mt-0.5 text-[9px] font-medium text-white">{money(budget.summary.spent_total, currency)}</Text></View><View className="items-end"><Text className="text-[8px] text-white/65">Period elapsed</Text><Text className="mt-0.5 text-[9px] font-medium text-white">{periodProgress}%</Text></View></View>
          </View>

          {budget.savings_rollover && <View className="mt-3 flex-row items-center rounded-[18px] border border-border bg-card px-4 py-3.5"><View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-accent-light"><WalletCards size={17} color={colors.primary} /></View><View className="flex-1"><Text className="text-[10px] font-semibold text-primary">{Number(budget.savings_rollover.amount) > 0 ? `${money(budget.savings_rollover.amount, currency)} moved to savings` : 'No unspent allowance to save'}</Text><Text className="mt-1 text-[9px] text-muted">Period closed · {budget.savings_rollover.saved_on}</Text></View></View>}

          <View className="mb-2 mt-6 flex-row items-end justify-between">
            <View><Text className="text-[16px] font-bold text-primary">Your categories</Text><Text className="mt-1 text-[9px] text-muted">How you split this period’s money.</Text></View>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/activity')} className="flex-row items-center gap-1 py-1"><Text className="text-[9px] font-semibold text-primary">Insights</Text><ArrowRight size={12} color={colors.primary} /></Pressable>
          </View>

          {detail.isPending ? <View className="rounded-[18px] bg-card p-5"><Text className="text-center text-xs text-muted">Loading category limits…</Text></View> : categoryLimits.length ? <View className="overflow-hidden rounded-[20px] border border-border bg-card px-4">
            {categoryLimits.map((category, index) => {
              const Icon = categoryIcon(category.category_name);
              const used = Math.min(100, Math.max(0, category.percent_used));
              const remaining = Number(category.remaining);
              const barColor = remaining < 0 ? '#D55F6D' : used >= 80 ? '#D98B32' : colors.accent;
              return <Pressable key={category.category_id} accessibilityRole="button" accessibilityLabel={`${category.category_name} budget details`} onPress={() => router.push({ pathname: '/category-budget-details', params: { budgetId: String(budget.id), categoryId: String(category.category_id) } })} className={`py-3.5 active:opacity-70 ${index < categoryLimits.length - 1 ? 'border-b border-border' : ''}`}>
                <View className="flex-row items-center">
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-xl bg-accent-light"><Icon size={15} color={colors.primary} strokeWidth={1.8} /></View>
                  <Text numberOfLines={1} className="flex-1 text-[11px] font-semibold text-ink">{category.category_name}</Text>
                  <Text className={`text-[10px] font-semibold ${remaining < 0 ? 'text-error' : 'text-primary'}`}>{remaining < 0 ? `${money(Math.abs(remaining), currency)} over` : `${money(category.remaining, currency)} left`}</Text>
                  <ChevronRight size={14} color={colors.textSecondary} />
                </View>
                <View className="ml-11 mt-2 h-[5px] overflow-hidden rounded-full bg-border"><View className="h-full rounded-full" style={{ width: `${used}%`, backgroundColor: barColor }} /></View>
                <View className="ml-11 mt-1.5 flex-row items-center justify-between"><Text className="text-[8px] text-muted">{money(category.spent, currency)} / {money(category.limit_amount, currency)}</Text><Text className="text-[8px] font-medium text-muted">{category.percent_used}% used</Text></View>
              </Pressable>;
            })}
          </View> : <View className="items-center rounded-[20px] border border-dashed border-border bg-card px-5 py-7"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-light"><ChartNoAxesColumn size={19} color={colors.primary} /></View><Text className="mt-3 text-[13px] font-bold text-primary">Nothing assigned yet</Text><Text className="mt-1 text-center text-[10px] leading-4 text-muted">Give your {money(budgetAmount, currency)} a job: for example Food, Transportation and School supplies.</Text></View>}

          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/category-budget-form', params: { budgetId: String(budget.id) } })} className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-primary active:opacity-80"><Text className="text-[11px] font-semibold text-white">Assign money to a category</Text><Plus size={15} color="white" /></Pressable>
          {categoryLimits.length > 0 && <Text className="mt-2.5 px-1 text-[9px] leading-4 text-muted">{money(limitTotal, currency)} of {money(budgetAmount, currency)} assigned{leftToAssign > 0 ? ` · ${money(leftToAssign, currency)} still free` : ''}. Tap a category to change it.</Text>}
        </> : <View className="mt-4 items-center rounded-[22px] border border-border bg-card px-5 py-8"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-light"><ChartNoAxesColumn size={20} color={colors.primary} /></View><Text className="mt-3 text-[15px] font-bold text-primary">No budget yet</Text><Text className="mt-1 text-center text-[10px] leading-4 text-muted">A budget is how much you plan to spend in one period. Create one to get your daily safe-to-spend amount.</Text><Pressable onPress={createBudget} className="mt-4 rounded-xl bg-primary px-5 py-3"><Text className="text-[10px] font-semibold text-white">Create a budget</Text></Pressable></View>}
      </ScrollView>

      <AppBottomBar active="budgets" />
    </SafeAreaView>
  );
}
