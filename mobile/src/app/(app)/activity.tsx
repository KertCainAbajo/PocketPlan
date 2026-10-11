import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, House, Plus, Search, ShoppingBasket, SlidersHorizontal, ChartNoAxesColumn, Flag, UserRound, WalletCards } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { FormBanner } from '@/components/ui/form-banner';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { activityApi, dashboardApi, type ActivityTransaction } from '@/features/dashboard/api';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

type Filter = 'All' | 'Expenses' | 'Income' | 'Savings';
const filters: Filter[] = ['All', 'Expenses', 'Income', 'Savings'];

const money = (amount: string | undefined, currency: string | undefined) => {
  if (amount === undefined || !currency) return '—';
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const dateAtNoon = (date: string) => new Date(`${date}T12:00:00`);
const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function sectionTitle(date: string) {
  const transactionDate = dateAtNoon(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey(transactionDate) === dateKey(today)) return `Today · ${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(transactionDate)}`;
  if (dateKey(transactionDate) === dateKey(yesterday)) return `Yesterday · ${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(transactionDate)}`;
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(transactionDate);
}

export default function ActivityScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [showSort, setShowSort] = useState(false);
  const [oldestFirst, setOldestFirst] = useState(false);

  const activity = useInfiniteQuery({
    queryKey: ['activity', search.trim()],
    queryFn: ({ pageParam }) => activityApi.getPage(pageParam, search),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.length + 1 : undefined,
  });
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
  const allTransactions = useMemo(() => activity.data?.pages.flatMap((page) => page.transactions) ?? [], [activity.data]);
  const filtered = useMemo(() => {
    const rows = allTransactions.filter((transaction) => {
      const isSavings = transaction.category.name.toLowerCase().includes('saving');
      if (filter === 'Expenses') return transaction.type === 'expense' && !isSavings;
      if (filter === 'Income') return transaction.type === 'income';
      if (filter === 'Savings') return isSavings;
      return true;
    });
    return oldestFirst ? [...rows].reverse() : rows;
  }, [allTransactions, filter, oldestFirst]);

  const groups = useMemo(() => {
    const result: { title: string; rows: ActivityTransaction[] }[] = [];
    for (const transaction of filtered) {
      const title = sectionTitle(transaction.date);
      const last = result[result.length - 1];
      if (last?.title === title) last.rows.push(transaction);
      else result.push({ title, rows: [transaction] });
    }
    return result;
  }, [filtered]);

  const currentMonth = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date());
  const data = dashboard.data;
  const currency = data?.currency ?? user?.currency;
  const month = data?.this_month;

  const addTransaction = () => Alert.alert('Add a transaction', 'Choose a transaction type.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Expense', onPress: () => router.push({ pathname: '/transaction-form', params: { type: 'expense' } }) },
    { text: 'Income', onPress: () => router.push({ pathname: '/transaction-form', params: { type: 'income' } }) },
  ]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-5"
        refreshControl={<RefreshControl refreshing={activity.isRefetching} onRefresh={() => { void activity.refetch(); void dashboard.refetch(); }} tintColor={colors.accent} />}>
        <View className="flex-row items-center justify-between pt-1">
          <BrandMark size={28} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            onPress={addTransaction}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-accent-light">
            <Plus size={20} color={colors.accent} />
          </Pressable>
        </View>

        <Text className="mt-3 text-[23px] font-bold tracking-tight text-primary">Activity</Text>
        <Text className="mt-0.5 text-[11px] text-muted">{currentMonth} · {filtered.length} transactions loaded</Text>

        <View className="mt-3 flex-row items-center gap-2">
          <View className="h-10 flex-1 flex-row items-center rounded-xl bg-card px-3">
            <Search size={15} color={colors.textSecondary} />
            <TextInput
              accessibilityLabel="Search transactions"
              value={search}
              onChangeText={setSearch}
              placeholder="Search transactions"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              className="ml-2 flex-1 py-0 text-[11px] text-ink"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sort transactions"
            onPress={() => setShowSort((visible) => !visible)}
            className="h-10 w-10 items-center justify-center rounded-xl bg-accent-light">
            <SlidersHorizontal size={16} color={colors.primary} />
          </Pressable>
        </View>

        {showSort && (
          <View className="mt-2 flex-row items-center justify-between rounded-xl bg-card px-3 py-2">
            <Text className="text-[11px] text-muted">Sort by date</Text>
            <View className="flex-row gap-2">
              {(['Newest', 'Oldest'] as const).map((label) => {
                const active = (label === 'Oldest') === oldestFirst;
                return <Pressable key={label} onPress={() => setOldestFirst(label === 'Oldest')} className={`rounded-lg px-3 py-1.5 ${active ? 'bg-primary' : 'bg-accent-light'}`}>
                  <Text className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-primary'}`}>{label}</Text>
                </Pressable>;
              })}
            </View>
          </View>
        )}

        <View className="mt-3 flex-row gap-1 rounded-xl bg-card p-1">
          {filters.map((option) => {
            const active = filter === option;
            return <Pressable key={option} onPress={() => setFilter(option)} className={`h-8 flex-1 items-center justify-center rounded-lg ${active ? 'bg-primary' : ''}`}>
              <Text className={`text-[9px] ${active ? 'font-semibold text-white' : 'text-muted'}`}>{option}</Text>
            </Pressable>;
          })}
        </View>

        <View className="mt-3 flex-row rounded-[18px] bg-card px-3 py-3.5">
          <Summary label="Income" value={money(month?.income, currency)} />
          <Summary label="Expenses" value={money(month?.expenses, currency)} />
          <Summary label="Net this month" value={money(month?.net, currency)} />
        </View>

        {activity.isError && <View className="mt-3"><FormBanner message={getErrorMessage(activity.error)} /></View>}
        {dashboard.isError && <View className="mt-3"><FormBanner message={getErrorMessage(dashboard.error)} /></View>}

        {activity.isPending ? (
          <View className="mt-5 rounded-[18px] bg-card p-5"><Text className="text-center text-xs text-muted">Loading transactions…</Text></View>
        ) : groups.length ? groups.map((group) => (
          <View key={group.title} className="mt-3">
            <Text className="mb-1.5 text-[12px] font-medium text-primary">{group.title}</Text>
            <View className="rounded-[18px] bg-card px-3 py-1">
              {group.rows.map((transaction, index) => (
                <ActivityRow key={`${transaction.type}-${transaction.id}`} transaction={transaction} currency={currency} last={index === group.rows.length - 1} />
              ))}
            </View>
          </View>
        )) : (
          <View className="mt-4 items-center rounded-[18px] bg-card px-5 py-8">
            <CalendarDays size={22} color={colors.accent} />
            <Text className="mt-2 text-[12px] font-semibold text-primary">No transactions found</Text>
            <Text className="mt-1 text-center text-[10px] text-muted">Try a different search or activity filter.</Text>
          </View>
        )}

        {activity.hasNextPage && (
          <Pressable disabled={activity.isFetchingNextPage} onPress={() => void activity.fetchNextPage()} className="mt-3 h-10 items-center justify-center rounded-xl bg-accent-light active:opacity-80">
            <Text className="text-[10px] font-semibold text-primary">{activity.isFetchingNextPage ? 'Loading…' : 'View 10 earlier transactions'}</Text>
          </Pressable>
        )}

        <Pressable onPress={addTransaction} className="mt-2 h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-80">
          <Text className="text-[11px] font-semibold text-white">Add a transaction</Text><Plus size={14} color="#FFFFFF" />
        </Pressable>
      </ScrollView>

      <View className="flex-row border-t border-border bg-card px-1 pb-1 pt-2">
        <TabItem label="Home" icon={<House size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/')} />
        <TabItem label="Activity" active icon={<ArrowLeftRight size={16} color={colors.primary} />} onPress={() => undefined} />
        <TabItem label="Budgets" icon={<ChartNoAxesColumn size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/budgets')} />
        <TabItem label="Goals" icon={<Flag size={16} color={colors.textSecondary} />} onPress={() => Alert.alert('Savings goals', 'Savings goals are coming soon.')} />
        <TabItem label="Profile" icon={<UserRound size={16} color={colors.textSecondary} />} onPress={() => Alert.alert('Profile', user?.email ?? 'Your profile')} />
      </View>
    </SafeAreaView>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <View className="flex-1"><Text className="text-[9px] text-muted">{label}</Text><Text numberOfLines={1} className="mt-0.5 text-[13px] font-bold text-primary">{value}</Text></View>;
}

function ActivityRow({ transaction, currency, last }: { transaction: ActivityTransaction; currency: string | undefined; last: boolean }) {
  const income = transaction.type === 'income';
  const savings = transaction.category.name.toLowerCase().includes('saving');
  const Icon = income ? BriefcaseBusiness : savings ? WalletCards : ShoppingBasket;
  const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(dateAtNoon(transaction.date));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${transaction.description}`} onPress={() => router.push({ pathname: '/transaction-details', params: { type: transaction.type, id: String(transaction.id) } })} className={`flex-row items-center py-3 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <View className={`mr-2.5 h-9 w-9 items-center justify-center rounded-xl ${income ? 'bg-[#DDF7E8]' : 'bg-accent-light'}`}><Icon size={15} color={income ? '#388867' : colors.accent} strokeWidth={1.7} /></View>
      <View className="flex-1"><Text numberOfLines={1} className="text-[10px] font-semibold text-ink">{transaction.description}</Text><Text numberOfLines={1} className="mt-0.5 text-[8px] text-muted">{transaction.category.name} · {income ? 'Income' : savings ? 'Savings transfer' : 'Everyday account'} · {date}</Text></View>
      <View className="ml-2 flex-row items-center"><>{income ? <ArrowDownLeft size={11} color="#388867" /> : <ArrowUpRight size={11} color={colors.primary} />}</><Text className={`text-[10px] font-medium ${income ? 'text-[#2F8064]' : 'text-primary'}`}>{income ? '+' : '−'}{money(transaction.amount, currency)}</Text></View>
    </Pressable>
  );
}

function TabItem({ label, icon, active = false, onPress }: { label: string; icon: React.ReactNode; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-12 flex-1 items-center justify-center gap-0.5"><View className={`h-7 min-w-8 items-center justify-center rounded-full px-2 ${active ? 'bg-accent-light' : ''}`}>{icon}</View><Text className={`text-[9px] ${active ? 'font-semibold text-primary' : 'text-muted'}`}>{label}</Text></Pressable>;
}
