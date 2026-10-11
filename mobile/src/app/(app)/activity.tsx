import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, House, Plus, Search, ShoppingBasket, SlidersHorizontal, ChartNoAxesColumn, Flag, UserRound, WalletCards, X, TrendingDown, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { FormBanner } from '@/components/ui/form-banner';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { accountApi, activityApi, dashboardApi, type ActivityTransaction } from '@/features/dashboard/api';
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
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list });
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
  const accountNames = new Map((accounts.data ?? []).map((account) => [account.id, account.name]));

  const addTransaction = () => Alert.alert('Add a transaction', 'Choose a transaction type.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Expense', onPress: () => router.push({ pathname: '/transaction-form', params: { type: 'expense' } }) },
    { text: 'Income', onPress: () => router.push({ pathname: '/transaction-form', params: { type: 'income' } }) },
  ]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-6"
        refreshControl={<RefreshControl refreshing={activity.isRefetching} onRefresh={() => { void activity.refetch(); void dashboard.refetch(); }} tintColor={colors.accent} />}>
        <View className="flex-row items-center justify-between pt-2">
          <BrandMark size={32} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            onPress={addTransaction}
            className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80">
            <Plus size={19} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-end justify-between">
          <View><Text className="text-[26px] font-bold tracking-tight text-primary">Activity</Text><Text className="mt-1 text-[11px] text-muted">Your money, clearly accounted for.</Text></View>
          <View className="mb-0.5 rounded-full bg-accent-light px-2.5 py-1"><Text className="text-[9px] font-semibold text-primary">{currentMonth}</Text></View>
        </View>

        <View className="mt-5 flex-row items-center gap-2.5">
          <View className="h-12 flex-1 flex-row items-center rounded-[15px] border border-[#E7EAF1] bg-white px-3.5">
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              accessibilityLabel="Search transactions"
              value={search}
              onChangeText={setSearch}
              placeholder="Search transactions"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              className="ml-2.5 flex-1 py-0 text-[12px] text-ink"
            />
            {search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} className="h-7 w-7 items-center justify-center"><X size={15} color={colors.textSecondary} /></Pressable>}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sort transactions"
            onPress={() => setShowSort((visible) => !visible)}
            className={`h-12 w-12 items-center justify-center rounded-[15px] border ${showSort ? 'border-primary bg-accent-light' : 'border-transparent bg-accent-light'}`}>
            <SlidersHorizontal size={16} color={colors.primary} />
          </Pressable>
        </View>

        {showSort && (
          <View className="mt-2 flex-row items-center justify-between rounded-[15px] border border-[#E8EBF3] bg-white px-3.5 py-3">
            <Text className="text-[11px] font-medium text-muted">Sort by date</Text>
            <View className="flex-row gap-2">
              {(['Newest', 'Oldest'] as const).map((label) => {
                const active = (label === 'Oldest') === oldestFirst;
                return <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setOldestFirst(label === 'Oldest')} className={`rounded-[10px] px-3.5 py-2 ${active ? 'bg-primary' : 'bg-accent-light'}`}>
                  <Text className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-primary'}`}>{label}</Text>
                </Pressable>;
              })}
            </View>
          </View>
        )}

        <View className="mt-3 flex-row gap-1 rounded-[15px] border border-[#E8EBF3] bg-white p-1.5">
          {filters.map((option) => {
            const active = filter === option;
            return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(option)} className={`h-9 flex-1 items-center justify-center rounded-[11px] ${active ? 'bg-primary' : ''}`}>
              <Text className={`text-[10px] ${active ? 'font-semibold text-white' : 'font-medium text-muted'}`}>{option}</Text>
            </Pressable>;
          })}
        </View>

        <View className="mt-4 rounded-[20px] border border-[#E8EBF3] bg-white px-3.5 py-3.5">
          <View className="mb-3 flex-row items-center justify-between"><Text className="text-[11px] font-bold text-primary">Monthly overview</Text><Text className="text-[9px] text-muted">{currentMonth}</Text></View>
          <View className="flex-row">
            <Summary label="Income" value={money(month?.income, currency)} icon={<TrendingUp size={13} color="#388867" />} />
            <Summary label="Expenses" value={money(month?.expenses, currency)} icon={<TrendingDown size={13} color="#C15B68" />} />
            <Summary label="Net" value={money(month?.net, currency)} />
          </View>
        </View>

        {activity.isError && <View className="mt-3"><FormBanner message={getErrorMessage(activity.error)} /></View>}
        {dashboard.isError && <View className="mt-3"><FormBanner message={getErrorMessage(dashboard.error)} /></View>}

        {activity.isPending ? (
          <View className="mt-5 rounded-[20px] border border-[#E8EBF3] bg-white p-6"><Text className="text-center text-xs font-medium text-muted">Loading your activity…</Text></View>
        ) : groups.length ? groups.map((group) => (
          <View key={group.title} className="mt-4">
            <View className="mb-2 flex-row items-center justify-between"><Text className="text-[12px] font-bold text-primary">{group.title}</Text><Text className="text-[9px] text-muted">{group.rows.length} {group.rows.length === 1 ? 'transaction' : 'transactions'}</Text></View>
            <View className="rounded-[20px] border border-[#E8EBF3] bg-white px-3.5 py-1">
              {group.rows.map((transaction, index) => (
                <ActivityRow key={`${transaction.type}-${transaction.id}`} transaction={transaction} currency={currency} accountName={accountNames.get(transaction.account_id ?? -1)} last={index === group.rows.length - 1} />
              ))}
            </View>
          </View>
        )) : (
          <View className="mt-4 items-center rounded-[20px] border border-[#E8EBF3] bg-white px-5 py-9">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-light"><CalendarDays size={21} color={colors.accent} /></View>
            <Text className="mt-3 text-[13px] font-bold text-primary">{search || filter !== 'All' ? 'No matching transactions' : 'Your activity starts here'}</Text>
            <Text className="mt-1 text-center text-[10px] leading-4 text-muted">{search || filter !== 'All' ? 'Try another search or choose a different filter.' : 'Add income or an expense to see your money flow.'}</Text>
            {!search && filter === 'All' && <Pressable onPress={addTransaction} className="mt-4 rounded-xl bg-primary px-4 py-2.5"><Text className="text-[10px] font-semibold text-white">Add your first transaction</Text></Pressable>}
          </View>
        )}

        {activity.hasNextPage && (
          <Pressable disabled={activity.isFetchingNextPage} onPress={() => void activity.fetchNextPage()} className="mt-3 h-11 items-center justify-center rounded-[14px] border border-[#E8EBF3] bg-white active:opacity-80">
            <Text className="text-[11px] font-semibold text-primary">{activity.isFetchingNextPage ? 'Loading earlier activity…' : 'Load earlier transactions'}</Text>
          </Pressable>
        )}

        <Pressable onPress={addTransaction} className="mt-4 h-[50px] flex-row items-center justify-center gap-2 rounded-[15px] bg-primary active:opacity-80">
          <Plus size={16} color="#FFFFFF" /><Text className="text-[12px] font-bold text-white">Add a transaction</Text>
        </Pressable>
      </ScrollView>

      <View className="flex-row border-t border-border bg-card px-1 pb-1 pt-2">
        <TabItem label="Home" icon={<House size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/')} />
        <TabItem label="Activity" active icon={<ArrowLeftRight size={16} color={colors.primary} />} onPress={() => undefined} />
        <TabItem label="Budgets" icon={<ChartNoAxesColumn size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/budgets')} />
        <TabItem label="Goals" icon={<Flag size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/savings')} />
        <TabItem label="Profile" icon={<UserRound size={16} color={colors.textSecondary} />} onPress={() => Alert.alert('Profile', user?.email ?? 'Your profile')} />
      </View>
    </SafeAreaView>
  );
}

function Summary({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <View className="min-w-0 flex-1 px-1.5">{icon && <View className="mb-1.5 h-6 w-6 items-center justify-center rounded-lg bg-background">{icon}</View>}<Text className="text-[9px] font-medium text-muted">{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit className="mt-1 text-[12px] font-bold text-primary">{value}</Text></View>;
}

function ActivityRow({ transaction, currency, accountName, last }: { transaction: ActivityTransaction; currency: string | undefined; accountName?: string; last: boolean }) {
  const income = transaction.type === 'income';
  const savings = transaction.category.name.toLowerCase().includes('saving');
  const Icon = income ? BriefcaseBusiness : savings ? WalletCards : ShoppingBasket;
  const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(dateAtNoon(transaction.date));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${transaction.description}`} onPress={() => router.push({ pathname: '/transaction-details', params: { type: transaction.type, id: String(transaction.id) } })} className={`min-h-[68px] flex-row items-center py-3 ${last ? '' : 'border-b border-[#EEF0F5]'}`}>
      <View className={`mr-3 h-10 w-10 items-center justify-center rounded-[13px] ${income ? 'bg-[#E2F6EC]' : 'bg-accent-light'}`}><Icon size={17} color={income ? '#388867' : colors.accent} strokeWidth={1.8} /></View>
      <View className="flex-1"><Text numberOfLines={1} className="text-[11px] font-semibold text-ink">{transaction.description}</Text><Text numberOfLines={1} className="mt-1 text-[9px] text-muted">{transaction.category.name} · {accountName ?? (income ? 'Income' : savings ? 'Savings' : 'Expense')} · {date}</Text></View>
      <View className="ml-2 items-end"><View className="flex-row items-center gap-0.5">{income ? <ArrowDownLeft size={12} color="#388867" /> : <ArrowUpRight size={12} color="#B85A68" />}<Text className={`text-[11px] font-bold ${income ? 'text-[#2F8064]' : 'text-primary'}`}>{income ? '+' : '−'}{money(transaction.amount, currency)}</Text></View><Text className="mt-1 text-[8px] text-muted">{income ? 'Income' : 'Expense'}</Text></View>
    </Pressable>
  );
}

function TabItem({ label, icon, active = false, onPress }: { label: string; icon: React.ReactNode; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-12 flex-1 items-center justify-center gap-0.5"><View className={`h-7 min-w-8 items-center justify-center rounded-full px-2 ${active ? 'bg-accent-light' : ''}`}>{icon}</View><Text className={`text-[9px] ${active ? 'font-semibold text-primary' : 'text-muted'}`}>{label}</Text></Pressable>;
}
