import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Bus, ChartNoAxesColumn, House, ReceiptText, ShoppingBag, ShoppingBasket, Utensils, WalletCards, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
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

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

function budgetForMonth(budgets: BudgetItem[], month: Date): BudgetItem | undefined {
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  const inMonth = budgets.filter((budget) => {
    const budgetStart = new Date(`${budget.start_date}T12:00:00`);
    const budgetEnd = new Date(`${budget.end_date}T12:00:00`);
    return budgetStart <= end && budgetEnd >= start;
  });
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()) {
    const active = inMonth.find((budget) => budget.status === 'active' && new Date(`${budget.start_date}T12:00:00`) <= today && new Date(`${budget.end_date}T12:00:00`) >= today);
    if (active) return active;
  }
  return inMonth.sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
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
  const [month, setMonth] = useState(() => new Date());
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: budgetApi.list });
  const selected = budgets.data ? budgetForMonth(budgets.data, month) : undefined;
  const detail = useQuery({ queryKey: ['budget', selected?.id], queryFn: () => budgetApi.get(selected!.id), enabled: Boolean(selected?.id) });
  const budget = detail.data ?? selected;
  const categoryLimits = budget?.category_limits ?? [];
  const percent = Math.min(100, Math.max(0, budget?.summary.percent_used ?? 0));
  const limitTotal = categoryLimits.reduce((total, category) => total + Number(category.limit_amount), 0);

  const changeMonth = (amount: number) => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + amount, 1));
  const createBudget = () => router.push('/budget-form');
  const spendingInsights = () => router.navigate('/activity');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-5" refreshControl={<RefreshControl refreshing={budgets.isRefetching || detail.isRefetching} onRefresh={() => { void budgets.refetch(); if (selected) void detail.refetch(); }} tintColor={colors.accent} />}>
        <View className="flex-row items-center justify-between pt-2">
          <View><Text className="text-[25px] font-bold tracking-tight text-primary">Budgets</Text><Text className="mt-0.5 text-[11px] text-muted">A little structure. A lot more peace of mind.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Create budget" onPress={createBudget} className="h-10 w-10 items-center justify-center rounded-full bg-accent-light"><Plus size={19} color={colors.primary} /></Pressable>
        </View>

        <View className="mt-4 h-11 flex-row items-center justify-between rounded-[14px] border border-[#E8EBF3] bg-white px-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} className="h-8 w-9 items-center justify-center rounded-lg active:bg-accent-light"><ArrowLeft size={15} color={colors.primary} /></Pressable>
          <Text className="text-[11px] font-semibold text-primary">{monthLabel(month)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => changeMonth(1)} className="h-8 w-9 items-center justify-center rounded-lg active:bg-accent-light"><ArrowRight size={15} color={colors.primary} /></Pressable>
        </View>

        {budgets.isError && <View className="mt-3"><FormBanner message={getErrorMessage(budgets.error)} /></View>}
        {detail.isError && <View className="mt-3"><FormBanner message={getErrorMessage(detail.error)} /></View>}

        {budgets.isPending ? <View className="mt-3 rounded-[20px] bg-white p-5"><Text className="text-center text-xs text-muted">Loading your plan…</Text></View> : budget ? <>
          <View className="mt-3 overflow-hidden rounded-[20px] bg-[#EEF0FF] px-4 pb-4 pt-3.5">
            <View className="flex-row items-start justify-between">
              <View><Text className="text-[9px] font-medium text-primary/75">Remaining this period</Text><Text className="mt-1 text-[25px] font-bold tracking-tight text-primary">{money(budget.summary.remaining, currency)}</Text></View>
              <View className="mt-1 rounded-full bg-white/75 px-2.5 py-1"><Text className="text-[9px] font-bold text-primary">{percent}% used</Text></View>
            </View>
            <View className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-white"><View className={`h-full rounded-full ${budget.summary.is_overspent ? 'bg-[#D55F6D]' : 'bg-[#6979F8]'}`} style={{ width: `${percent}%` }} /></View>
            <View className="mt-2 flex-row items-center justify-between"><Text className="text-[9px] text-primary/75">{money(budget.summary.spent_total, currency)} spent</Text><Text className="text-[9px] text-primary/75">of {money(budget.spending_limit, currency)}</Text></View>
            <Text className="mt-1.5 text-[8px] text-primary/60">{budget.name} · {budget.start_date} to {budget.end_date}</Text>
          </View>

          {budget.savings_rollover && <View className="mt-2.5 flex-row items-center rounded-[15px] border border-[#DDEFE5] bg-[#E8F7EF] px-3.5 py-3"><View className="mr-2.5 h-8 w-8 items-center justify-center rounded-xl bg-white/80"><WalletCards size={16} color="#388867" /></View><View className="flex-1"><Text className="text-[10px] font-semibold text-[#25684D]">{Number(budget.savings_rollover.amount) > 0 ? `${money(budget.savings_rollover.amount, currency)} moved to savings` : 'No unspent allowance to save'}</Text><Text className="mt-0.5 text-[8px] text-[#4F8068]">Period closed · {budget.savings_rollover.saved_on}</Text></View></View>}

          <View className="mb-2 mt-5 flex-row items-center justify-between">
            <Text className="text-[14px] font-semibold text-primary">Category budgets</Text>
            <Pressable accessibilityRole="button" onPress={spendingInsights} className="flex-row items-center gap-1 py-1"><Text className="text-[9px] font-semibold text-primary">Spending insights</Text><ArrowRight size={12} color={colors.primary} /></Pressable>
          </View>

          {detail.isPending ? <View className="rounded-[18px] bg-white p-5"><Text className="text-center text-xs text-muted">Loading category limits…</Text></View> : categoryLimits.length ? categoryLimits.map((category) => {
            const Icon = categoryIcon(category.category_name);
            const used = Math.min(100, Math.max(0, category.percent_used));
            const remaining = Number(category.remaining);
            const barColor = remaining < 0 ? '#D55F6D' : used >= 80 ? '#F4A020' : '#6D7CF8';
            return <View key={category.category_id} className="mt-2.5 rounded-[17px] border border-[#EEF0F5] bg-white px-3.5 py-3">
              <View className="flex-row items-center">
                <View className="mr-2.5 h-7 w-7 items-center justify-center rounded-lg bg-[#F0F2FF]"><Icon size={14} color={colors.primary} strokeWidth={1.7} /></View>
                <Text numberOfLines={1} className="flex-1 text-[10px] font-semibold text-primary">{category.category_name}</Text>
                <Text className="text-[9px] font-semibold text-primary">{used}%</Text>
              </View>
              <View className="mt-2 h-[4px] overflow-hidden rounded-full bg-[#ECEEFF]"><View className="h-full rounded-full" style={{ width: `${used}%`, backgroundColor: barColor }} /></View>
              <View className="mt-1.5 flex-row items-center justify-between"><Text className="text-[8px] text-muted">{money(category.spent, currency)} of {money(category.limit_amount, currency)}</Text><Text className={`text-[8px] font-semibold ${remaining < 0 ? 'text-[#C64E5F]' : 'text-primary'}`}>{remaining < 0 ? `${money(Math.abs(remaining), currency)} over` : `${money(category.remaining, currency)} left`}</Text></View>
            </View>;
          }) : <View className="items-center rounded-[18px] border border-dashed border-[#DDE2EF] bg-white px-5 py-6"><Text className="text-[11px] font-semibold text-primary">No category limits yet</Text><Text className="mt-1 text-center text-[9px] leading-4 text-muted">Set category limits to see exactly where your plan is going.</Text></View>}

          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/category-budget-form', params: { budgetId: String(budget.id) } })} className="mt-3 h-10 flex-row items-center justify-center gap-2 rounded-[12px] bg-primary active:opacity-80"><Text className="text-[10px] font-semibold text-white">Create category budget</Text><Plus size={14} color="#FFFFFF" /></Pressable>
          {categoryLimits.length > 0 && <Text className="mt-2 px-1 text-[8px] leading-3 text-muted">Category limits total {money(limitTotal, currency)}. Savings contributions are separate from your spending budget.</Text>}
        </> : <View className="mt-3 items-center rounded-[20px] border border-[#E8EBF3] bg-white px-5 py-8"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-light"><ChartNoAxesColumn size={19} color={colors.primary} /></View><Text className="mt-3 text-[14px] font-bold text-primary">No budget for {monthLabel(month)}</Text><Text className="mt-1 text-center text-[10px] leading-4 text-muted">Create a spending plan to track your remaining balance and category limits.</Text><Pressable onPress={createBudget} className="mt-4 rounded-xl bg-primary px-5 py-3"><Text className="text-[10px] font-semibold text-white">Create a budget</Text></Pressable></View>}
      </ScrollView>

      <AppBottomBar active="budgets" />
    </SafeAreaView>
  );
}
