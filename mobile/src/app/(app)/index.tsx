import { useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  ChevronRight,
  Flag,
  House,
  Plus,
  ShoppingBasket,
  Sprout,
  UserRound,
  WalletCards,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { FormBanner } from '@/components/ui/form-banner';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';
import { dashboardApi, type DashboardTransaction } from '@/features/dashboard/api';

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

const monthLabel = (date: string | undefined) => {
  const parsed = date ? new Date(`${date}T12:00:00`) : new Date();
  return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(parsed);
};

const greeting = (timezone?: string) => {
  let hour = new Date().getHours();
  if (timezone) {
    try {
      const hourPart = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: timezone,
      })
        .formatToParts(new Date())
        .find((part) => part.type === 'hour')?.value;
      if (hourPart !== undefined) hour = Number(hourPart);
    } catch {
      // Fall back to the device's local time if the saved timezone is invalid.
    }
  }
  return hour < 12 ? 'Morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

export default function HomeScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [signingOut, setSigningOut] = useState(false);

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    enabled: user?.is_onboarded ?? false,
  });

  const data = dashboard.data;
  const currency = data?.currency ?? user?.currency;
  const budget = data?.budget;
  const percentUsed = Math.min(100, Math.max(0, budget?.summary.percent_used ?? 0));
  const name = data?.greeting_name ?? user?.name.split(' ')[0] ?? 'there';
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(
    data?.today ? new Date(`${data.today}T12:00:00`) : new Date(),
  );

  if (user && !user.is_onboarded) return <Redirect href="/onboarding" />;

  const openComingSoon = (feature: string) => Alert.alert(feature, `${feature} is coming soon.`);
  const openProfile = () =>
    Alert.alert('PocketPlan profile', user?.email ?? 'Your profile', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: signingOut ? 'Signing out…' : 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-5"
        refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={dashboard.refetch} tintColor={colors.accent} />}>
        <View className="flex-row items-center justify-between pt-1">
          <BrandMark size={30} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => openComingSoon('Notifications')}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-accent-light">
            <Bell size={19} color={colors.primary} strokeWidth={1.7} />
          </Pressable>
        </View>

        <View className="mt-5">
          <Text className="text-[23px] font-bold tracking-tight text-primary">
            {greeting(user?.timezone)}, {name}
          </Text>
          <Text className="mt-1 text-[13px] leading-5 text-muted">{dateLabel} · A little clarity goes a long way.</Text>
        </View>

        {dashboard.isError && <View className="mt-4"><FormBanner message={getErrorMessage(dashboard.error)} /></View>}

        <View className="mt-5 overflow-hidden rounded-[26px] bg-primary px-5 pb-5 pt-4">
          <View className="absolute -right-5 -top-12 h-36 w-36 rounded-full bg-white/5" />
          <View className="flex-row items-center justify-between">
            <Text className="text-[12px] font-medium text-white/80">Available balance</Text>
            <WalletCards size={19} color="#DCE4FF" strokeWidth={1.7} />
          </View>
          <Text className="mt-2 text-[34px] font-bold tracking-tight text-white">
            {money(data?.available_balance, currency)}
          </Text>
          <Text className="mt-1 text-[11px] text-white/75">After expenses and savings contributions</Text>
          <View className="mt-4 flex-row">
            <View className="flex-1">
              <Text className="text-[10px] font-medium text-white/70">Income this month</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <ArrowDownLeft size={14} color="#BFC8FF" />
                <Text className="text-[14px] font-semibold text-white">{money(data?.this_month.income, currency)}</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-medium text-white/70">Expenses this month</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <ArrowUpRight size={14} color="#FFC6CB" />
                <Text className="text-[14px] font-semibold text-white">{money(data?.this_month.expenses, currency)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row gap-2.5">
          <ActionButton label="Add expense" onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'expense' } })} />
          <ActionButton label="Add income" secondary onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'income' } })} />
        </View>

        <View className="mb-2 mt-5 flex-row items-center justify-between">
          <Text className="text-[16px] font-semibold text-primary">Your {monthLabel(data?.today)} plan</Text>
          <Pressable onPress={() => router.navigate('/budgets')} className="flex-row items-center gap-0.5 py-1">
            <Text className="text-[11px] font-semibold text-primary">View budgets</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        {budget ? (
          <View className="rounded-[20px] bg-card p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[22px] font-bold text-primary">
                {money(budget.summary.spending_limit, currency)}
              </Text>
              <View className="rounded-full bg-accent-light px-2.5 py-1">
                <Text className="text-[10px] font-semibold text-primary">{budget.summary.percent_used}% used</Text>
              </View>
            </View>
            <View className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-[#ECEEFF]">
              <View className="h-full rounded-full bg-accent" style={{ width: `${percentUsed}%` }} />
            </View>
            <Text className="mt-2.5 text-[10px] text-muted">
              {money(budget.summary.spent_total, currency)} spent of {money(budget.summary.spending_limit, currency)} ·{' '}
              {monthLabel(data?.today)} {new Date().getDate()}–{new Date(`${budget.end_date}T12:00:00`).getDate()}
            </Text>
          </View>
        ) : (
          <Pressable onPress={() => router.navigate('/budgets')} className="rounded-[20px] bg-card p-4 active:opacity-80">
            <Text className="text-base font-semibold text-primary">No active plan yet</Text>
            <Text className="mt-1 text-xs leading-5 text-muted">Create a budget to set a spending limit for this period.</Text>
          </Pressable>
        )}

        <Pressable onPress={() => openComingSoon('Savings goals')} className="mt-3 flex-row items-start gap-3 rounded-[20px] bg-accent-light px-4 py-4 active:opacity-80">
          <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-white/75">
            <Sprout size={17} color={colors.accent} strokeWidth={1.8} />
          </View>
          <View className="flex-1">
            <Text className="text-[12px] font-semibold text-primary">Small steps add up</Text>
            <Text className="mt-1 text-[11px] leading-[16px] text-primary/75">
              Set a savings goal and follow your progress as you build a little more security.
            </Text>
            <View className="mt-2 flex-row items-center gap-1">
              <Text className="text-[10px] font-semibold text-primary">Explore savings goals</Text>
              <ArrowRight size={12} color={colors.primary} />
            </View>
          </View>
        </Pressable>

        <View className="mb-2 mt-5 flex-row items-center justify-between">
          <Text className="text-[16px] font-semibold text-primary">Recent activity</Text>
          <Pressable onPress={() => router.navigate('/activity')} className="py-1">
            <Text className="text-[11px] font-semibold text-primary">See all</Text>
          </Pressable>
        </View>

        <View className="rounded-[20px] bg-card px-3.5 py-1">
          {data?.recent_transactions.length ? (
            data.recent_transactions.slice(0, 4).map((transaction, index) => (
              <TransactionRow
                key={`${transaction.type}-${transaction.id}`}
                transaction={transaction}
                currency={currency}
                last={index === Math.min(data.recent_transactions.length, 4) - 1}
              />
            ))
          ) : (
            <View className="items-center py-6">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-light">
                <ArrowLeftRight size={18} color={colors.accent} />
              </View>
              <Text className="mt-2 text-[12px] font-semibold text-primary">Nothing to show yet</Text>
              <Text className="mt-1 text-center text-[10px] text-muted">Your recent income and expenses will appear here.</Text>
            </View>
          )}
        </View>

        {data && budget && (
          <Text className="mb-1 mt-3 text-[9px] leading-[14px] text-muted">
            Balance {money(data.available_balance, currency)} · Income {money(data.this_month.income, currency)} · Expenses{' '}
            {money(data.this_month.expenses, currency)} · Plan remaining {money(budget.summary.remaining, currency)}.
          </Text>
        )}
      </ScrollView>

      <View className="flex-row border-t border-border bg-card px-1 pb-1 pt-2">
        <TabItem label="Home" active icon={<House size={17} color={colors.primary} />} onPress={() => undefined} />
        <TabItem label="Activity" icon={<ArrowLeftRight size={17} color={colors.textSecondary} />} onPress={() => router.navigate('/activity')} />
        <TabItem label="Budgets" icon={<ChartNoAxesColumn size={17} color={colors.textSecondary} />} onPress={() => openComingSoon('Budgets')} />
        <TabItem label="Goals" icon={<Flag size={17} color={colors.textSecondary} />} onPress={() => openComingSoon('Savings goals')} />
        <TabItem label="Profile" icon={<UserRound size={17} color={colors.textSecondary} />} onPress={openProfile} />
      </View>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  secondary = false,
  onPress,
}: {
  label: string;
  secondary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl active:opacity-80 ${secondary ? 'bg-accent-light' : 'bg-primary'}`}>
      <Text className={`text-[12px] font-semibold ${secondary ? 'text-primary' : 'text-white'}`}>{label}</Text>
      <Plus size={15} color={secondary ? colors.primary : '#FFFFFF'} />
    </Pressable>
  );
}

function TransactionRow({
  transaction,
  currency,
  last,
}: {
  transaction: DashboardTransaction;
  currency: string | undefined;
  last: boolean;
}) {
  const income = transaction.type === 'income';
  const Icon = income ? BriefcaseBusiness : ShoppingBasket;
  const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(`${transaction.date}T12:00:00`),
  );

  return (
    <View className={`flex-row items-center py-3 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <View className={`mr-2.5 h-9 w-9 items-center justify-center rounded-xl ${income ? 'bg-[#DDF7E8]' : 'bg-accent-light'}`}>
        <Icon size={16} color={income ? '#388867' : colors.accent} strokeWidth={1.7} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[11px] font-semibold text-ink">{transaction.description}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[9px] text-muted">{transaction.category.name} · {date}</Text>
      </View>
      <Text className={`ml-2 text-[11px] font-medium ${income ? 'text-[#2F8064]' : 'text-primary'}`}>
        {income ? '+' : '−'}{money(transaction.amount, currency)}
      </Text>
    </View>
  );
}

function TabItem({ label, icon, active = false, onPress }: { label: string; icon: React.ReactNode; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-12 flex-1 items-center justify-center gap-0.5">
      <View className={`h-7 min-w-8 items-center justify-center rounded-full px-2 ${active ? 'bg-accent-light' : ''}`}>{icon}</View>
      <Text className={`text-[9px] ${active ? 'font-semibold text-primary' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}
