import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowDownUp,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Plus,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/app-alert';
import { AppBottomBar } from '@/components/app-bottom-bar';
import { BrandMark } from '@/components/brand-mark';
import { CategoryIcon } from '@/components/category-icon';
import { FormBanner } from '@/components/ui/form-banner';
import { accountApi, activityApi, dashboardApi, type ActivityTransaction } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

type Filter = 'All' | 'Expenses' | 'Income' | 'Savings';
const filters: Filter[] = ['All', 'Expenses', 'Income', 'Savings'];

/** Soft, navy-tinted elevation shared by the floating cards. */
const cardShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const money = (amount: string | number | undefined, currency: string | undefined) => {
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
const isSavings = (transaction: ActivityTransaction) => transaction.category.name.toLowerCase().includes('saving');

function matchesFilter(transaction: ActivityTransaction, filter: Filter) {
  if (filter === 'Expenses') return transaction.type === 'expense' && !isSavings(transaction);
  if (filter === 'Income') return transaction.type === 'income';
  if (filter === 'Savings') return isSavings(transaction);
  return true;
}

/** "Today", "Yesterday" or the weekday, plus the calendar date underneath. */
function dayLabel(date: string) {
  const transactionDate = dateAtNoon(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const subtitle = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(transactionDate);
  if (dateKey(transactionDate) === dateKey(today)) return { title: 'Today', subtitle };
  if (dateKey(transactionDate) === dateKey(yesterday)) return { title: 'Yesterday', subtitle };
  return { title: new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(transactionDate), subtitle };
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

  const counts = useMemo(
    () => Object.fromEntries(filters.map((option) => [option, allTransactions.filter((t) => matchesFilter(t, option)).length])) as Record<Filter, number>,
    [allTransactions],
  );

  const filtered = useMemo(() => {
    const rows = allTransactions.filter((transaction) => matchesFilter(transaction, filter));
    return oldestFirst ? [...rows].reverse() : rows;
  }, [allTransactions, filter, oldestFirst]);

  const groups = useMemo(() => {
    const result: { date: string; rows: ActivityTransaction[]; income: number; expenses: number }[] = [];
    for (const transaction of filtered) {
      let last = result[result.length - 1];
      if (!last || last.date !== transaction.date) {
        last = { date: transaction.date, rows: [], income: 0, expenses: 0 };
        result.push(last);
      }
      last.rows.push(transaction);
      if (transaction.type === 'income') last.income += Number(transaction.amount) || 0;
      else last.expenses += Number(transaction.amount) || 0;
    }
    return result;
  }, [filtered]);

  const currentMonth = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date());
  const data = dashboard.data;
  const currency = data?.currency ?? user?.currency;
  const accountNames = new Map((accounts.data ?? []).map((account) => [account.id, account.name]));
  const filtering = search.trim().length > 0 || filter !== 'All';

  const addTransaction = () => showAlert('Add a transaction', 'Choose a transaction type.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Expense', onPress: () => router.push({ pathname: '/transaction-form', params: { type: 'expense' } }) },
    { text: 'Income', onPress: () => router.push({ pathname: '/transaction-form', params: { type: 'income' } }) },
  ], { icon: ArrowLeftRight });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-8"
        refreshControl={<RefreshControl refreshing={activity.isRefetching} onRefresh={() => { void activity.refetch(); void dashboard.refetch(); }} tintColor={colors.accent} />}>
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2">
          <BrandMark size={34} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            onPress={addTransaction}
            style={[cardShadow, { shadowOpacity: 0.25 }]}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-primary active:opacity-80">
            <Plus size={20} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-end justify-between">
          <View>
            <Text className="text-[26px] font-extrabold tracking-tight text-ink">Activity</Text>
            <Text className="mt-0.5 text-[13px] text-muted">Your money, clearly accounted for.</Text>
          </View>
          <View className="mb-1 flex-row items-center gap-1 rounded-full bg-card px-2.5 py-1.5" style={cardShadow}>
            <CalendarDays size={12} color={colors.primary} />
            <Text className="text-[11px] font-semibold text-primary">{currentMonth}</Text>
          </View>
        </View>

        <View className="mt-5">
          <OverviewCard
            income={data?.this_month.income}
            expenses={data?.this_month.expenses}
            net={data?.this_month.net}
            currency={currency}
            loading={dashboard.isPending}
          />
        </View>

        {/* Search + sort */}
        <View className="mt-5 flex-row items-center gap-2.5">
          <View style={cardShadow} className="h-12 flex-1 flex-row items-center rounded-2xl bg-card px-3.5">
            <Search size={17} color={colors.textSecondary} />
            <TextInput
              accessibilityLabel="Search transactions"
              value={search}
              onChangeText={setSearch}
              placeholder="Search transactions"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              className="ml-2.5 flex-1 py-0 text-[14px] text-ink"
            />
            {search.length > 0 && (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} className="h-7 w-7 items-center justify-center rounded-full bg-background">
                <X size={14} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sort transactions"
            accessibilityState={{ expanded: showSort }}
            onPress={() => setShowSort((visible) => !visible)}
            style={showSort ? undefined : cardShadow}
            className={`h-12 w-12 items-center justify-center rounded-2xl ${showSort ? 'bg-primary' : 'bg-card'}`}>
            <SlidersHorizontal size={17} color={showSort ? '#FFFFFF' : colors.primary} />
          </Pressable>
        </View>

        {showSort && (
          <View style={cardShadow} className="mt-2.5 rounded-2xl bg-card p-1.5">
            {(['Newest', 'Oldest'] as const).map((label) => {
              const active = (label === 'Oldest') === oldestFirst;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => { setOldestFirst(label === 'Oldest'); setShowSort(false); }}
                  className={`flex-row items-center gap-3 rounded-xl px-3 py-3 ${active ? 'bg-accent-light' : ''}`}>
                  <ArrowDownUp size={16} color={active ? colors.primary : colors.textSecondary} />
                  <Text className={`flex-1 text-[13px] ${active ? 'font-bold text-primary' : 'font-medium text-ink'}`}>{label} first</Text>
                  {active && <Check size={16} color={colors.primary} strokeWidth={2.6} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mt-4" contentContainerClassName="gap-2 px-5">
          {filters.map((option) => {
            const active = filter === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(option)}
                style={active ? undefined : cardShadow}
                className={`h-10 flex-row items-center gap-2 rounded-full px-4 ${active ? 'bg-primary' : 'bg-card'}`}>
                <Text className={`text-[13px] ${active ? 'font-bold text-white' : 'font-semibold text-ink'}`}>{option}</Text>
                {!activity.isPending && (
                  <View className={`min-w-[22px] items-center rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20' : 'bg-background'}`}>
                    <Text className={`text-[11px] font-bold ${active ? 'text-white' : 'text-muted'}`}>{counts[option]}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {activity.isError && <View className="mt-4"><FormBanner message={getErrorMessage(activity.error)} /></View>}
        {dashboard.isError && <View className="mt-4"><FormBanner message={getErrorMessage(dashboard.error)} /></View>}

        {activity.isPending ? (
          <View style={cardShadow} className="mt-5 rounded-3xl bg-card px-4 py-1">
            {[0, 1, 2].map((index) => <SkeletonRow key={index} last={index === 2} />)}
          </View>
        ) : groups.length ? (
          groups.map((group) => {
            const label = dayLabel(group.date);
            const net = group.income - group.expenses;
            return (
              <View key={group.date} className="mt-6">
                <View className="mb-2.5 flex-row items-end justify-between px-1">
                  <View>
                    <Text className="text-[15px] font-bold text-ink">{label.title}</Text>
                    <Text className="mt-0.5 text-[11px] text-muted">{label.subtitle} · {group.rows.length} {group.rows.length === 1 ? 'transaction' : 'transactions'}</Text>
                  </View>
                  <Text className={`text-[13px] font-bold ${net > 0 ? 'text-positive-text' : net < 0 ? 'text-error' : 'text-muted'}`}>
                    {net > 0 ? '+' : net < 0 ? '−' : ''}{money(Math.abs(net), currency)}
                  </Text>
                </View>
                <View style={cardShadow} className="rounded-3xl bg-card px-4 py-1">
                  {group.rows.map((transaction, index) => (
                    <ActivityRow
                      key={`${transaction.type}-${transaction.id}`}
                      transaction={transaction}
                      currency={currency}
                      accountName={accountNames.get(transaction.account_id ?? -1)}
                      last={index === group.rows.length - 1}
                    />
                  ))}
                </View>
              </View>
            );
          })
        ) : (
          <View style={cardShadow} className="mt-5 items-center rounded-3xl bg-card px-6 py-10">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-accent-light">
              {filtering ? <SearchX size={26} color={colors.accent} /> : <CalendarDays size={26} color={colors.accent} />}
            </View>
            <Text className="mt-4 text-base font-bold text-ink">{filtering ? 'No matching transactions' : 'Your activity starts here'}</Text>
            <Text className="mt-1.5 text-center text-[13px] leading-5 text-muted">
              {filtering ? 'Try another search or choose a different filter.' : 'Add income or an expense to see your money flow.'}
            </Text>
            {filtering ? (
              <Pressable onPress={() => { setSearch(''); setFilter('All'); }} className="mt-5 rounded-full bg-accent-light px-5 py-2.5 active:opacity-80">
                <Text className="text-[13px] font-bold text-primary">Clear filters</Text>
              </Pressable>
            ) : (
              <Pressable onPress={addTransaction} className="mt-5 flex-row items-center gap-1.5 rounded-full bg-primary px-5 py-3 active:opacity-80">
                <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text className="text-[13px] font-bold text-white">Add your first transaction</Text>
              </Pressable>
            )}
          </View>
        )}

        {activity.hasNextPage && (
          <Pressable
            disabled={activity.isFetchingNextPage}
            onPress={() => void activity.fetchNextPage()}
            className="mt-4 h-12 flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-accent/50 bg-accent-light/60 active:opacity-80">
            <Text className="text-[13px] font-semibold text-primary">{activity.isFetchingNextPage ? 'Loading earlier activity…' : 'Load earlier transactions'}</Text>
            {!activity.isFetchingNextPage && <ChevronDown size={16} color={colors.primary} />}
          </Pressable>
        )}

        {groups.length > 0 && (
          <Pressable
            onPress={addTransaction}
            style={[cardShadow, { shadowOpacity: 0.25 }]}
            className="mt-6 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-80">
            <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
            <Text className="text-[14px] font-bold text-white">Add a transaction</Text>
          </Pressable>
        )}
      </ScrollView>

      <AppBottomBar active="activity" />
    </SafeAreaView>
  );
}

/** Navy summary of the month: net flow, the income/expense split and both totals. */
function OverviewCard({ income, expenses, net, currency, loading }: { income?: string; expenses?: string; net?: string; currency: string | undefined; loading: boolean }) {
  const incomeValue = Number(income ?? 0);
  const expenseValue = Number(expenses ?? 0);
  const netValue = Number(net ?? incomeValue - expenseValue);
  const total = incomeValue + expenseValue;
  const incomeShare = total > 0 ? (incomeValue / total) * 100 : 0;
  const savedRate = incomeValue > 0 ? Math.max(0, Math.round((netValue / incomeValue) * 100)) : null;

  return (
    <View className="overflow-hidden rounded-[28px]">
      <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <View pointerEvents="none" className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-accent opacity-25" />
        <View pointerEvents="none" className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-white opacity-[0.04]" />

        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-white/60">Net this month</Text>
          {savedRate !== null && (
            <View className="rounded-full bg-white/15 px-2.5 py-1">
              <Text className="text-[11px] font-bold text-white">{savedRate}% kept</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit className="mt-2 text-[34px] font-extrabold tracking-tight text-white">
          {loading ? '—' : `${netValue > 0 ? '+' : netValue < 0 ? '−' : ''}${money(Math.abs(netValue), currency)}`}
        </Text>

        <View className="mt-4 h-2 flex-row overflow-hidden rounded-full bg-white/15">
          {total > 0 && (
            <>
              <View className="h-full bg-[#4ADE80]" style={{ width: `${incomeShare}%` }} />
              <View className="h-full bg-[#F87171]" style={{ width: `${100 - incomeShare}%`, marginLeft: incomeShare > 0 && incomeShare < 100 ? 2 : 0 }} />
            </>
          )}
        </View>

        <View className="mt-4 flex-row rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3">
          <OverviewStat Icon={ArrowDownLeft} iconColor="#4ADE80" label="Income" value={money(income, currency)} />
          <View className="mx-3 w-px bg-white/10" />
          <OverviewStat Icon={ArrowUpRight} iconColor="#F87171" label="Expenses" value={money(expenses, currency)} />
        </View>
      </LinearGradient>
    </View>
  );
}

function OverviewStat({ Icon, iconColor, label, value }: { Icon: LucideIcon; iconColor: string; label: string; value: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/10">
        <Icon size={17} color={iconColor} strokeWidth={2.4} />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-white/60">{label}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit className="text-sm font-bold text-white">{value}</Text>
      </View>
    </View>
  );
}

function ActivityRow({ transaction, currency, accountName, last }: { transaction: ActivityTransaction; currency: string | undefined; accountName?: string; last: boolean }) {
  const income = transaction.type === 'income';
  const savings = isSavings(transaction);
  const tint = income ? colors.positiveText : savings ? '#0E7490' : colors.accent;
  const bg = income ? colors.positive : savings ? '#CFFAFE' : colors.accentLight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${transaction.description}`}
      onPress={() => router.push({ pathname: '/transaction-details', params: { type: transaction.type, id: String(transaction.id) } })}
      className={`min-h-[72px] flex-row items-center py-3.5 active:opacity-70 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: bg }}>
        <CategoryIcon icon={transaction.category.icon} size={19} color={tint} strokeWidth={1.9} />
      </View>
      <View className="flex-1 pr-2">
        <Text numberOfLines={1} className="text-[14px] font-semibold text-ink">{transaction.description}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[12px] text-muted">
          {transaction.category.name}{accountName ? ` · ${accountName}` : ''}
        </Text>
      </View>
      <View className="items-end">
        <View className={`rounded-lg px-2 py-1 ${income ? 'bg-positive' : ''}`}>
          <Text className={`text-[14px] font-bold ${income ? 'text-positive-text' : 'text-ink'}`}>
            {income ? '+' : '−'}{money(transaction.amount, currency)}
          </Text>
        </View>
        <Text className="mr-2 mt-0.5 text-[11px] text-muted">{income ? 'Income' : savings ? 'Savings' : 'Expense'}</Text>
      </View>
    </Pressable>
  );
}

function SkeletonRow({ last }: { last: boolean }) {
  return (
    <View className={`flex-row items-center py-3.5 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <View className="mr-3 h-11 w-11 rounded-2xl bg-[#EEF0F6]" />
      <View className="flex-1 gap-2">
        <View className="h-3 w-2/3 rounded-full bg-[#EEF0F6]" />
        <View className="h-2.5 w-1/3 rounded-full bg-[#F3F4F8]" />
      </View>
      <View className="h-3 w-16 rounded-full bg-[#EEF0F6]" />
    </View>
  );
}
