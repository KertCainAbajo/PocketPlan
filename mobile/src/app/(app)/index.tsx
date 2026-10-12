import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  CheckCircle2,
  ChevronRight,
  Flag,
  Lightbulb,
  Minus,
  Plus,
  Sprout,
  TriangleAlert,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomBar } from '@/components/app-bottom-bar';
import { BrandMark } from '@/components/brand-mark';
import { CategoryIcon } from '@/components/category-icon';
import { FormBanner } from '@/components/ui/form-banner';
import { dashboardApi, type DashboardData, type DashboardTransaction } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const LIGHT_ACCENT = '#AEB8FF';

const money = (amount: string | null | undefined, currency: string | undefined) => {
  if (amount === undefined || amount === null || !currency) return '—';
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

/** Calendar dates from the API are plain YYYY-MM-DD; read them at midday so no timezone shifts the day. */
const day = (date: string) => new Date(`${date}T12:00:00`);
const shortDate = (date: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(day(date));

const greeting = (timezone?: string) => {
  let hour = new Date().getHours();
  if (timezone) {
    try {
      const part = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone })
        .formatToParts(new Date())
        .find((p) => p.type === 'hour')?.value;
      if (part !== undefined) hour = Number(part);
    } catch {
      // Invalid saved timezone: fall back to the device clock.
    }
  }
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

type Status = 'safe' | 'watch' | 'over';

/** Status is always shown with an icon and a word, never colour alone. */
const STATUS: Record<Status, { label: string; Icon: LucideIcon; text: string; bg: string; bar: string }> = {
  safe: { label: 'Safe', Icon: CheckCircle2, text: colors.positiveText, bg: colors.positive, bar: '#4ADE80' },
  watch: { label: 'Watch your spending', Icon: TriangleAlert, text: colors.warningText, bg: colors.warningBg, bar: colors.warning },
  over: { label: 'Over today’s limit', Icon: XCircle, text: colors.error, bg: colors.errorBg, bar: '#F87171' },
};

export default function HomeScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    enabled: user?.is_onboarded ?? false,
  });

  if (user && !user.is_onboarded) return <Redirect href="/onboarding" />;

  const data = dashboard.data;
  const currency = data?.currency ?? user?.currency;
  const name = data?.greeting_name ?? user?.name.split(' ')[0] ?? 'there';
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(
    data?.today ? day(data.today) : new Date(),
  );
  const openComingSoon = (feature: string) => Alert.alert(feature, `${feature} is coming soon.`);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={dashboard.refetch} tintColor={colors.accent} />}>
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2">
          <BrandMark size={34} />
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => openComingSoon('Notifications')}
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:bg-accent-light">
              <Bell size={18} color={colors.primary} strokeWidth={1.8} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => router.navigate('/profile')}
              className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80">
              <Text className="text-[15px] font-bold text-white">{name.charAt(0).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-5">
          <Text className="text-xs text-muted">{dateLabel}</Text>
          <Text numberOfLines={1} className="mt-0.5 text-[22px] font-bold tracking-tight text-ink">
            {greeting(user?.timezone)}, {name}
          </Text>
        </View>

        {dashboard.isError && (
          <View className="mt-4">
            <FormBanner message={getErrorMessage(dashboard.error)} />
          </View>
        )}

        <View className="mt-5">
          <HeroCard data={data} currency={currency} loading={dashboard.isPending} />
        </View>

        {/* Shown while the student is still getting started (few transactions so far). */}
        {data && data.recent_transactions.length < 3 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/how-it-works')}
            className="mt-4 flex-row items-center gap-3 rounded-3xl border border-accent/40 bg-accent-light p-4 active:opacity-80">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
              <Lightbulb size={20} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-primary">New here? See how PocketPlan works</Text>
              <Text className="mt-0.5 text-xs leading-[17px] text-primary/75">A 1-minute guide to your allowance, budget and daily limit.</Text>
            </View>
            <ChevronRight size={18} color={colors.primary} />
          </Pressable>
        )}

        {/* Quick actions */}
        <View className="mt-5 flex-row justify-between">
          <QuickAction label="Expense" Icon={Minus} tone="primary" onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'expense' } })} />
          <QuickAction label="Income" Icon={Plus} tone="positive" onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'income' } })} />
          <QuickAction label="Budget" Icon={ChartNoAxesColumn} onPress={() => router.navigate('/budgets')} />
          <QuickAction label="Goal" Icon={Flag} onPress={() => router.navigate('/savings')} />
        </View>

        {/* This month */}
        <SectionTitle title="This month" />
        <View className="flex-row gap-3">
          <MonthTile label="Income" amount={money(data?.this_month.income, currency)} Icon={ArrowDownLeft} iconColor={colors.positiveText} iconBg={colors.positive} />
          <MonthTile label="Expenses" amount={money(data?.this_month.expenses, currency)} Icon={ArrowUpRight} iconColor={colors.error} iconBg={colors.errorBg} />
        </View>

        {/* Plan */}
        <SectionTitle title="Your plan" action="View budgets" onAction={() => router.navigate('/budgets')} />
        <PlanCard budget={data?.budget ?? null} currency={currency} />

        {/* Top categories */}
        {data && data.category_breakdown.length > 0 && (
          <>
            <SectionTitle title="Where your money goes" />
            <View className="rounded-3xl border border-border bg-card px-4 py-1">
              {data.category_breakdown.slice(0, 3).map((category, index) => (
                <CategoryRow
                  key={category.category_id}
                  name={category.name}
                  icon={category.icon}
                  amount={money(category.total, currency)}
                  percent={category.percent}
                  last={index === Math.min(data.category_breakdown.length, 3) - 1}
                />
              ))}
            </View>
          </>
        )}

        {/* Savings */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/savings')}
          className="mt-6 flex-row items-center gap-3.5 rounded-3xl bg-accent-light p-4 active:opacity-80">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
            <Sprout size={22} color={colors.accent} strokeWidth={1.9} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-medium text-primary/70">Savings so far</Text>
            <Text className="mt-0.5 text-xl font-bold text-primary">{money(data?.savings_total, currency)}</Text>
            <Text className="mt-0.5 text-xs text-primary/70">See what you saved in each allowance period</Text>
          </View>
          <ArrowRight size={18} color={colors.primary} />
        </Pressable>

        {/* Recent activity */}
        <SectionTitle title="Recent activity" action="See all" onAction={() => router.navigate('/activity')} />
        <View className="rounded-3xl border border-border bg-card px-4 py-1">
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
            <View className="items-center py-7">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-light">
                <ArrowLeftRight size={20} color={colors.accent} />
              </View>
              <Text className="mt-3 text-sm font-semibold text-ink">No activity yet</Text>
              <Text className="mt-1 text-center text-xs text-muted">Your income and expenses will appear here.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AppBottomBar active="home" />
    </SafeAreaView>
  );
}

/**
 * The app's main answer: how much can I still safely spend today?
 * Without an active budget it falls back to the available balance.
 */
function HeroCard({ data, currency, loading }: { data: DashboardData | undefined; currency: string | undefined; loading: boolean }) {
  const summary = data?.budget?.summary;
  const hasDaily = summary?.daily_target !== undefined && summary?.daily_target !== null;
  const status = (summary?.status ?? null) as Status | null;
  const statusStyle = status ? STATUS[status] : null;

  const target = Number(summary?.daily_target ?? 0);
  const spentToday = Number(summary?.spent_today ?? data?.today_spending ?? 0);
  const leftToday = Number(summary?.today_remaining ?? 0);
  const usedPercent = target > 0 ? Math.min(100, (spentToday / target) * 100) : spentToday > 0 ? 100 : 0;

  return (
    <View className="overflow-hidden rounded-[28px]">
      <LinearGradient colors={['#2E4A85', colors.primary, '#1A2C55']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <View pointerEvents="none" className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-accent opacity-20" />

        {hasDaily ? (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-white/75">Safe to spend today</Text>
              {statusStyle && (
                <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: statusStyle.bg }}>
                  <statusStyle.Icon size={13} color={statusStyle.text} strokeWidth={2.4} />
                  <Text className="text-[11px] font-bold" style={{ color: statusStyle.text }}>{statusStyle.label}</Text>
                </View>
              )}
            </View>

            <Text className="mt-2 text-[38px] font-extrabold tracking-tight text-white">
              {money(String(Math.max(0, leftToday)), currency)}
            </Text>
            <Text className="text-[13px] text-white/70">
              {leftToday < 0
                ? `${money(String(Math.abs(leftToday)), currency)} over today’s ${money(summary?.daily_target, currency)} limit`
                : `left of your ${money(summary?.daily_target, currency)} daily limit`}
            </Text>

            <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <View className="h-full rounded-full" style={{ width: `${usedPercent}%`, backgroundColor: statusStyle?.bar ?? LIGHT_ACCENT }} />
            </View>
            <Text className="mt-2 text-xs text-white/60">{money(String(spentToday), currency)} spent today</Text>
          </>
        ) : (
          <>
            <Text className="text-sm font-medium text-white/75">Available balance</Text>
            <Text className="mt-2 text-[38px] font-extrabold tracking-tight text-white">
              {loading ? '—' : money(data?.available_balance, currency)}
            </Text>
            <Text className="text-[13px] text-white/70">
              {data?.budget ? 'Your plan has no days left. Start a new one for a daily limit.' : 'Create a budget to see how much you can safely spend each day.'}
            </Text>
          </>
        )}

        <View className="my-4 h-px bg-white/10" />

        <View className="flex-row">
          <HeroStat Icon={Wallet} label="Balance" value={money(data?.available_balance, currency)} />
          <HeroStat
            Icon={CalendarDays}
            label="Days left"
            value={summary?.days_remaining !== undefined ? String(summary.days_remaining) : '—'}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

function HeroStat({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/10">
        <Icon size={17} color={LIGHT_ACCENT} />
      </View>
      <View>
        <Text className="text-[11px] text-white/60">{label}</Text>
        <Text className="text-sm font-bold text-white">{value}</Text>
      </View>
    </View>
  );
}

function QuickAction({
  label,
  Icon,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  Icon: LucideIcon;
  tone?: 'primary' | 'positive' | 'neutral';
  onPress: () => void;
}) {
  const bg = tone === 'primary' ? 'bg-primary' : tone === 'positive' ? 'bg-positive' : 'bg-card border border-border';
  const iconColor = tone === 'primary' ? colors.card : tone === 'positive' ? colors.positiveText : colors.primary;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()}`} onPress={onPress} className="w-[22%] items-center active:opacity-70">
      <View className={`h-14 w-14 items-center justify-center rounded-2xl ${bg}`}>
        <Icon size={22} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text className="mt-1.5 text-xs font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-base font-bold text-ink">{title}</Text>
      {action && onAction && (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8} className="flex-row items-center gap-0.5">
          <Text className="text-[13px] font-semibold text-accent">{action}</Text>
          <ChevronRight size={15} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

function MonthTile({ label, amount, Icon, iconColor, iconBg }: { label: string; amount: string; Icon: LucideIcon; iconColor: string; iconBg: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-3 rounded-3xl border border-border bg-card px-3.5 py-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: iconBg }}>
        <Icon size={18} color={iconColor} strokeWidth={2.2} />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-muted">{label}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit className="text-[15px] font-bold text-ink">{amount}</Text>
      </View>
    </View>
  );
}

function PlanCard({ budget, currency }: { budget: DashboardData['budget']; currency: string | undefined }) {
  if (!budget) {
    return (
      <Pressable onPress={() => router.navigate('/budgets')} className="flex-row items-center gap-3 rounded-3xl border border-dashed border-accent bg-card p-4 active:opacity-80">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-light">
          <ChartNoAxesColumn size={20} color={colors.accent} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-ink">No active plan yet</Text>
          <Text className="mt-0.5 text-xs leading-[18px] text-muted">Set a spending limit for this period to get a daily guide.</Text>
        </View>
        <ChevronRight size={18} color={colors.accent} />
      </Pressable>
    );
  }

  const { summary } = budget;
  const percent = Math.min(100, Math.max(0, summary.percent_used));
  const barColor = summary.is_overspent ? colors.error : percent >= 80 ? colors.warning : colors.accent;

  return (
    <View className="rounded-3xl border border-border bg-card p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text numberOfLines={1} className="text-sm font-bold text-ink">{budget.name}</Text>
          <Text className="mt-0.5 text-xs text-muted">
            {shortDate(budget.start_date)} – {shortDate(budget.end_date)}
          </Text>
        </View>
        <View className="rounded-full bg-accent-light px-2.5 py-1">
          <Text className="text-[11px] font-bold text-primary">{summary.percent_used}% used</Text>
        </View>
      </View>

      <View className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#ECEEFF]">
        <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: barColor }} />
      </View>

      <View className="mt-3 flex-row justify-between">
        <View>
          <Text className="text-[11px] text-muted">Spent</Text>
          <Text className="text-sm font-bold text-ink">{money(summary.spent_total, currency)}</Text>
        </View>
        <View className="items-center">
          <Text className="text-[11px] text-muted">{summary.is_overspent ? 'Over by' : 'Remaining'}</Text>
          <Text className={`text-sm font-bold ${summary.is_overspent ? 'text-error' : 'text-ink'}`}>
            {money(summary.is_overspent ? String(Math.abs(Number(summary.remaining))) : summary.remaining, currency)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[11px] text-muted">Limit</Text>
          <Text className="text-sm font-bold text-ink">{money(summary.spending_limit, currency)}</Text>
        </View>
      </View>

      {summary.pace_exceeds_limit && !summary.is_overspent && (
        <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-warning-bg px-3 py-2.5">
          <TriangleAlert size={15} color={colors.warningText} />
          <Text className="flex-1 text-xs leading-[17px] text-warning-text">At your current pace, this plan may run out before it ends.</Text>
        </View>
      )}
    </View>
  );
}

function CategoryRow({ name, icon, amount, percent, last }: { name: string; icon: string; amount: string; percent: number; last: boolean }) {
  return (
    <View className={`py-3 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <View className="flex-row items-center">
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-accent-light">
          <CategoryIcon icon={icon} size={17} color={colors.accent} strokeWidth={1.9} />
        </View>
        <Text numberOfLines={1} className="flex-1 text-[13px] font-semibold text-ink">{name}</Text>
        <Text className="text-[13px] font-bold text-ink">{amount}</Text>
      </View>
      <View className="ml-12 mt-2 flex-row items-center gap-2">
        <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ECEEFF]">
          <View className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, percent)}%` }} />
        </View>
        <Text className="w-9 text-right text-[11px] text-muted">{percent}%</Text>
      </View>
    </View>
  );
}

function TransactionRow({ transaction, currency, last }: { transaction: DashboardTransaction; currency: string | undefined; last: boolean }) {
  const income = transaction.type === 'income';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/transaction-details', params: { type: transaction.type, id: String(transaction.id) } })}
      className={`flex-row items-center py-3 active:opacity-70 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <View className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${income ? 'bg-positive' : 'bg-accent-light'}`}>
        <CategoryIcon icon={transaction.category.icon} size={18} color={income ? colors.positiveText : colors.accent} strokeWidth={1.9} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[13px] font-semibold text-ink">{transaction.description}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[11px] text-muted">
          {transaction.category.name} · {shortDate(transaction.date)}
        </Text>
      </View>
      <Text className={`ml-2 text-[13px] font-bold ${income ? 'text-positive-text' : 'text-ink'}`}>
        {income ? '+' : '−'}{money(transaction.amount, currency)}
      </Text>
    </Pressable>
  );
}
