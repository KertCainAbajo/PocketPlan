import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Pencil, ShoppingBasket, TrendingUp } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { budgetApi, activityApi } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { cachedDateTimeFormat, cachedNumberFormat } from '@/lib/intl';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const money = (amount: string | number, currency: string) => {
  try { return cachedNumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount)); }
  catch { return `${currency} ${Number(amount).toFixed(2)}`; }
};

const prettyDate = (date: string) => cachedDateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));

export default function CategoryBudgetDetailsScreen() {
  useStatusBarStyle('dark');
  const params = useLocalSearchParams<{ budgetId?: string; categoryId?: string }>();
  const budgetId = Number(params.budgetId);
  const categoryId = Number(params.categoryId);
  const currency = useAuthStore((state) => state.user?.currency ?? 'PHP');
  const budget = useQuery({ queryKey: ['budget', budgetId], queryFn: () => budgetApi.get(budgetId), enabled: Number.isInteger(budgetId) && budgetId > 0 });
  const activity = useInfiniteQuery({
    queryKey: ['activity', 'category-budget', categoryId],
    queryFn: ({ pageParam }) => activityApi.getPage(pageParam, ''),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.length + 1 : undefined,
    enabled: Number.isInteger(categoryId) && categoryId > 0,
  });
  const category = budget.data?.category_limits?.find((item) => item.category_id === categoryId);
  const transactions = activity.data?.pages.flatMap((page) => page.transactions).filter((transaction) =>
    transaction.type === 'expense' && transaction.category.id === categoryId && transaction.date >= (budget.data?.start_date ?? '') && transaction.date <= (budget.data?.end_date ?? ''),
  ) ?? [];
  const spent = Number(category?.spent ?? 0);
  const limit = Number(category?.limit_amount ?? 0);
  const remaining = Number(category?.remaining ?? 0);
  const used = Math.max(0, Math.min(100, category?.percent_used ?? 0));
  const isNearLimit = used >= 80;
  const thresholdAmount = limit * 0.8;

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-8">
      <View className="flex-row items-center justify-between pt-3">
        <View className="flex-row items-center">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-2 h-10 w-10 items-center justify-center rounded-xl bg-card"><ArrowLeft size={18} color={colors.primary} /></Pressable>
          <View><Text className="text-[18px] font-bold text-primary">{category?.category_name ?? 'Category budget'}</Text><Text className="mt-0.5 text-[9px] text-muted">{budget.data?.name ?? 'Spending plan'}</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit category budget" onPress={() => router.push({ pathname: '/category-budget-form', params: { budgetId: String(budgetId), categoryId: String(categoryId) } })} className="h-10 w-10 items-center justify-center rounded-xl bg-card"><Pencil size={16} color={colors.primary} /></Pressable>
      </View>

      {budget.isError && <View className="mt-4"><FormBanner message={getErrorMessage(budget.error)} /></View>}
      {activity.isError && <View className="mt-3"><FormBanner message={getErrorMessage(activity.error)} /></View>}
      {budget.isPending ? <View className="mt-5 rounded-[20px] bg-card p-6"><Text className="text-center text-xs text-muted">Loading category budget…</Text></View> : category ? <>
        <Text className="mt-5 text-[10px] text-muted">{prettyDate(budget.data!.start_date)} – {prettyDate(budget.data!.end_date)}, {new Date(`${budget.data!.end_date}T12:00:00`).getFullYear()}</Text>
        <View className={`mt-3 self-start rounded-full px-3 py-1.5 ${isNearLimit ? 'bg-[#FFF0D8]' : 'bg-accent-light'}`}><Text className={`text-[9px] font-semibold ${isNearLimit ? 'text-[#8B5B14]' : 'text-primary'}`}>{isNearLimit ? `Near limit · ${Math.round(used)}%` : `${Math.round(used)}% of limit used`}</Text></View>

        <Text className="mt-5 text-[9px] font-semibold uppercase tracking-[1px] text-muted">Left to spend</Text>
        <Text className={`mt-1 text-[34px] font-bold tracking-tight ${remaining < 0 ? 'text-error' : 'text-primary'}`}>{remaining < 0 ? money(Math.abs(remaining), currency) : money(remaining, currency)}</Text>
        {remaining < 0 && <Text className="mt-1 text-[9px] font-semibold text-error">Over this category limit</Text>}
        <View className="mt-3 h-[9px] overflow-hidden rounded-full bg-border">
          <View className="h-full rounded-full" style={{ width: `${used}%`, backgroundColor: remaining < 0 ? '#D55F6D' : isNearLimit ? '#D98B32' : colors.accent }} />
          <View className="absolute bottom-0 top-0 w-[2px] bg-ink/60" style={{ left: '80%' }} />
        </View>
        <View className="mt-2 flex-row justify-between"><Text className="text-[8px] text-muted">{money(0, currency)}</Text><Text className="text-[8px] font-medium text-muted">80% alert · {money(thresholdAmount, currency)}</Text><Text className="text-[8px] text-muted">{money(limit, currency)}</Text></View>
        <Text className="mt-2 text-[9px] text-muted">{money(spent, currency)} spent of your {money(limit, currency)} limit</Text>

        {isNearLimit && <View className="mt-4 flex-row rounded-[16px] border-l-[3px] border-[#D98B32] bg-[#FFF7E9] px-3.5 py-3"><View className="mr-2.5 mt-0.5"><TrendingUp size={15} color="#A36A1D" /></View><View className="flex-1"><Text className="text-[10px] font-bold text-ink">Keep an eye on this category</Text><Text className="mt-1 text-[9px] leading-[15px] text-muted">You’ve used {Math.round(used)}% of this limit. You have {money(Math.max(0, remaining), currency)} left for this budget period.</Text></View></View>}

        <View className="mb-2 mt-6 flex-row items-center justify-between"><Text className="text-[15px] font-bold text-primary">Category activity</Text><Text className="text-[9px] font-semibold text-primary">{transactions.length}{activity.hasNextPage ? '+' : ''} expense{transactions.length === 1 ? '' : 's'}</Text></View>
        <View className="overflow-hidden rounded-[20px] border border-border bg-card px-4">
          {activity.isPending ? <Text className="py-5 text-center text-[10px] text-muted">Loading activity…</Text> : transactions.length ? transactions.map((transaction, index) => <View key={`${transaction.type}-${transaction.id}`} className={`flex-row items-center py-3.5 ${index < transactions.length - 1 ? 'border-b border-border' : ''}`}>
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-accent-light"><ShoppingBasket size={15} color={colors.primary} /></View>
            <View className="flex-1"><Text numberOfLines={1} className="text-[10px] font-semibold text-ink">{transaction.description || category.category_name}</Text><Text className="mt-1 text-[8px] text-muted">{category.category_name} · {prettyDate(transaction.date)}</Text></View>
            <Text className="ml-2 text-[10px] font-semibold text-ink">−{money(transaction.amount, currency)}</Text>
          </View>) : <View className="items-center py-6"><Text className="text-[10px] font-semibold text-primary">No expenses in this period yet</Text><Text className="mt-1 text-center text-[9px] text-muted">New expenses in this category will show here.</Text></View>}
          {activity.hasNextPage && <Pressable accessibilityRole="button" onPress={() => void activity.fetchNextPage()} disabled={activity.isFetchingNextPage} className="flex-row items-center justify-center gap-1 border-t border-border py-3"><Text className="text-[9px] font-semibold text-primary">{activity.isFetchingNextPage ? 'Loading…' : 'Load more activity'}</Text><ChevronRight size={13} color={colors.primary} /></Pressable>}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/category-budget-form', params: { budgetId: String(budgetId), categoryId: String(categoryId) } })} className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-primary active:opacity-80"><Text className="text-[10px] font-semibold text-white">Adjust category budget</Text><Pencil size={14} color="white" /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'expense', categoryId: String(categoryId) } })} className="mt-2.5 h-12 flex-row items-center justify-center gap-2 rounded-[14px] border border-border bg-card active:opacity-70"><Text className="text-[10px] font-semibold text-primary">Add an expense</Text><ChevronRight size={14} color={colors.primary} /></Pressable>
      </> : <View className="mt-5 rounded-[20px] bg-card p-6"><Text className="text-center text-[11px] font-semibold text-primary">This category limit is unavailable.</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}
