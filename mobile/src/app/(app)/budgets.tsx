import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { budgetApi } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

function money(amount: string, currency: string) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount)); }
  catch { return `${currency} ${amount}`; }
}

export default function BudgetsScreen() {
  useStatusBarStyle('dark');
  const currency = useAuthStore((state) => state.user?.currency ?? 'PHP');
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: budgetApi.list });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="grow px-5 pb-6" refreshControl={<RefreshControl refreshing={budgets.isRefetching} onRefresh={() => void budgets.refetch()} tintColor={colors.accent} />}>
        <View className="flex-row items-center pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center"><ArrowLeft size={19} color={colors.primary} /></Pressable>
          <View className="flex-1"><Text className="text-[21px] font-bold text-primary">Your budgets</Text><Text className="mt-0.5 text-[11px] text-muted">Track spending against your plans.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Create budget" onPress={() => router.push('/budget-form')} className="h-10 w-10 items-center justify-center rounded-full bg-accent-light"><Plus size={20} color={colors.primary} /></Pressable>
        </View>

        {budgets.isError && <View className="mt-4"><FormBanner message={getErrorMessage(budgets.error)} /></View>}
        {budgets.isPending ? <View className="mt-5 rounded-2xl bg-card p-5"><Text className="text-center text-sm text-muted">Loading budgets…</Text></View> : budgets.data?.length ? budgets.data.map((budget) => {
          const used = Math.min(100, Math.max(0, budget.summary.percent_used));
          return <View key={budget.id} className="mt-3 rounded-2xl bg-card p-4">
            <View className="flex-row items-center justify-between"><Text className="flex-1 text-base font-semibold text-primary">{budget.name}</Text><View className={`rounded-full px-2.5 py-1 ${budget.status === 'active' ? 'bg-positive' : 'bg-accent-light'}`}><Text className="text-[10px] font-semibold text-primary">{budget.status === 'active' ? 'Active' : 'Completed'}</Text></View></View>
            <Text className="mt-1 text-xs text-muted">{budget.frequency[0].toUpperCase() + budget.frequency.slice(1)} · {budget.start_date} to {budget.end_date}</Text>
            <View className="mt-4 flex-row justify-between"><Text className="text-xs text-muted">Spent {money(budget.summary.spent_total, currency)}</Text><Text className="text-xs font-semibold text-primary">Limit {money(budget.spending_limit, currency)}</Text></View>
            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent-light"><View className={`h-full rounded-full ${budget.summary.is_overspent ? 'bg-[#E94B55]' : 'bg-accent'}`} style={{ width: `${used}%` }} /></View>
            <Text className="mt-2 text-[10px] text-muted">{money(budget.summary.remaining, currency)} remaining · {used}% used</Text>
          </View>;
        }) : <View className="mt-5 items-center rounded-2xl bg-card px-5 py-8"><Text className="text-base font-semibold text-primary">No budgets yet</Text><Text className="mt-1 text-center text-xs leading-5 text-muted">Create a spending plan to track what is left for this period.</Text><Pressable onPress={() => router.push('/budget-form')} className="mt-4 rounded-xl bg-primary px-5 py-3"><Text className="text-xs font-semibold text-white">Create your first budget</Text></Pressable></View>}
      </ScrollView>
    </SafeAreaView>
  );
}
