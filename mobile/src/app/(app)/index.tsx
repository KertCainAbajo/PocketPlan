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
  PieChart,
  Plus,
  Receipt,
  Sparkles,
  Sprout,
  TriangleAlert,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { showAlert } from '@/components/app-alert';
import { AppBottomBar } from '@/components/app-bottom-bar';
import { BrandMark } from '@/components/brand-mark';
import { CategoryIcon } from '@/components/category-icon';
import { FormBanner } from '@/components/ui/form-banner';
import { dashboardApi, type DashboardData, type DashboardTransaction } from '@/features/dashboard/api';
import { getLockSettings, hasDismissedSecurePrompt, isLockEnabled } from '@/features/security/app-lock';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const LIGHT_ACCENT = '#AEB8FF';
const DAY_MS = 86_400_000;

/** Distinct, brand-friendly hues for the spending breakdown (largest category first). */
const CATEGORY_COLORS = [colors.accent, '#38BDF8', colors.warning, '#34D399', '#F472B6'];

/** Soft, navy-tinted elevation shared by the floating cards. */
const cardShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

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
const daysBetween = (from: string, to: string) => Math.round((day(to).getTime() - day(from).getTime()) / DAY_MS);

const relativeDate = (date: string, today: string | undefined) => {
  if (today) {
    const diff = daysBetween(date, today);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
  }
  return shortDate(date);
};

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

  // Once per launch after sign-in: suggest a PIN + fingerprint / Face ID if the app has no lock yet.
  const suggestedLock = useRef(false);
  const onboarded = user?.is_onboarded ?? false;
  useEffect(() => {
    if (!onboarded || suggestedLock.current) return;
    suggestedLock.current = true;
    void Promise.all([getLockSettings(), hasDismissedSecurePrompt()]).then(([lock, dismissed]) => {
      if (!isLockEnabled(lock) && !dismissed) router.push('/secure-app');
    });
  }, [onboarded]);

  if (user && !user.is_onboarded) return <Redirect href="/onboarding" />;

  const data = dashboard.data;
  const currency = data?.currency ?? user?.currency;
  const name = data?.greeting_name ?? user?.name.split(' ')[0] ?? 'there';
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(
    data?.today ? day(data.today) : new Date(),
  );
  const openComingSoon = (feature: string) => showAlert(feature, 'We’re still building this. It will be ready soon.', undefined, { icon: Sparkles });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={dashboard.refetch} tintColor={colors.accent} />}>
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2">
          <BrandMark size={34} />
          <View className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => openComingSoon('Notifications')}
              style={cardShadow}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-card active:bg-accent-light">
              <Bell size={19} color={colors.primary} strokeWidth={1.9} />
              <View className="absolute right-[11px] top-[10px] h-2 w-2 rounded-full border border-white bg-accent" />
            </Pressable>
            <View className="overflow-hidden rounded-full">
              <LinearGradient colors={[colors.accent, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  onPress={() => router.navigate('/profile')}
                  className="h-11 w-11 items-center justify-center active:opacity-80">
                  <Text className="text-[16px] font-bold text-white">{name.charAt(0).toUpperCase()}</Text>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </View>

        <View className="mt-5">
          <Text className="text-xs font-medium text-muted">{dateLabel}</Text>
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

        {/* Quick actions float over the bottom edge of the hero. */}
        <View style={cardShadow} className="mx-2 -mt-9 flex-row justify-between rounded-3xl bg-card px-3 py-3.5">
          <QuickAction label="Expense" a11y="Add expense" Icon={Minus} tint={colors.primary} bg="#E8ECF6" onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'expense' } })} />
          <QuickAction label="Income" a11y="Add income" Icon={Plus} tint={colors.positiveText} bg={colors.positive} onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'income' } })} />
          <QuickAction label="Budget" a11y="Open budgets" Icon={ChartNoAxesColumn} tint={colors.accent} bg={colors.accentLight} onPress={() => router.navigate('/budgets')} />
          <QuickAction label="Goals" a11y="Open goals" Icon={Flag} tint={colors.warningText} bg={colors.warningBg} onPress={() => router.navigate('/savings')} />
        </View>

        {/* Shown while the student is still getting started (few transactions so far). */}
        {data && data.recent_transactions.length < 3 && (
          <View className="mt-5 overflow-hidden rounded-3xl">
            <LinearGradient colors={['#EEF0FF', '#E2E6FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Pressable accessibilityRole="button" onPress={() => router.push('/how-it-works')} className="flex-row items-center gap-3 p-4 active:opacity-80">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                  <Lightbulb size={20} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-primary">New here? See how PocketPlan works</Text>
                  <Text className="mt-0.5 text-xs leading-[17px] text-primary/70">A 1-minute guide to your allowance, budget and daily limit.</Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-white/80">
                  <ChevronRight size={16} color={colors.primary} />
                </View>
              </Pressable>
            </LinearGradient>
          </View>
        )}

        {/* This month */}
        <SectionTitle title="This month" />
        <MonthCard data={data} currency={currency} />

        {/* Plan */}
        <SectionTitle title="Your plan" action="View budgets" onAction={() => router.navigate('/budgets')} />
        <PlanCard budget={data?.budget ?? null} currency={currency} today={data?.today} />

        {/* Top categories */}
        {data && data.category_breakdown.length > 0 && (
          <>
            <SectionTitle title="Where your money goes" />
            <BreakdownCard categories={data.category_breakdown} currency={currency} />
          </>
        )}

        {/* Savings */}
        <View className="mt-7 overflow-hidden rounded-3xl">
          <LinearGradient colors={['#1F7A55', '#166534']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/savings')} className="p-[18px] active:opacity-85">
              <View pointerEvents="none" className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white opacity-10" />
              <View pointerEvents="none" className="absolute -bottom-16 right-14 h-28 w-28 rounded-full bg-white opacity-5" />
              <View className="flex-row items-center gap-3.5">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Sprout size={22} color="#BBF7D0" strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-white/75">Savings so far</Text>
                  <Text className="mt-0.5 text-[22px] font-extrabold tracking-tight text-white">{money(data?.savings_total, currency)}</Text>
                </View>
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <ArrowRight size={17} color="white" />
                </View>
              </View>
              <Text className="mt-3 text-xs text-white/70">See what you saved in each allowance period</Text>
            </Pressable>
          </LinearGradient>
        </View>

        {/* Recent activity */}
        <SectionTitle title="Recent activity" action="See all" onAction={() => router.navigate('/activity')} />
        <View style={cardShadow} className="rounded-3xl bg-card px-4 py-1">
          {data?.recent_transactions.length ? (
            data.recent_transactions.slice(0, 4).map((transaction, index) => (
              <TransactionRow
                key={`${transaction.type}-${transaction.id}`}
                transaction={transaction}
                currency={currency}
                today={data.today}
                last={index === Math.min(data.recent_transactions.length, 4) - 1}
              />
            ))
          ) : (
            <EmptyState Icon={ArrowLeftRight} title="No activity yet" body="Your income and expenses will appear here." />
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
    <View className="overflow-hidden rounded-[30px]">
      <LinearGradient
        colors={['#34539A', colors.primary, '#16254A']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 52 }}>
        {/* Decorative depth */}
        <View pointerEvents="none" className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-accent opacity-25" />
        <View pointerEvents="none" className="absolute -left-20 bottom-[-90px] h-56 w-56 rounded-full bg-white opacity-[0.04]" />

        {hasDaily ? (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold uppercase tracking-[1px] text-white/60">Safe to spend today</Text>
              {statusStyle && (
                <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: statusStyle.bg }}>
                  <statusStyle.Icon size={13} color={statusStyle.text} strokeWidth={2.4} />
                  <Text className="text-[11px] font-bold" style={{ color: statusStyle.text }}>{statusStyle.label}</Text>
                </View>
              )}
            </View>

            <View className="mt-3 flex-row items-center">
              <View className="flex-1 pr-3">
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-[40px] font-extrabold tracking-tight text-white">
                  {money(String(Math.max(0, leftToday)), currency)}
                </Text>
                <Text className="mt-0.5 text-[13px] leading-[18px] text-white/70">
                  {leftToday < 0
                    ? `${money(String(Math.abs(leftToday)), currency)} over today’s ${money(summary?.daily_target, currency)} limit`
                    : `left of your ${money(summary?.daily_target, currency)} daily limit`}
                </Text>
              </View>
              <ProgressRing percent={usedPercent} color={statusStyle?.bar ?? LIGHT_ACCENT} />
            </View>
          </>
        ) : (
          <>
            <Text className="text-[13px] font-semibold uppercase tracking-[1px] text-white/60">Available balance</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit className="mt-3 text-[40px] font-extrabold tracking-tight text-white">
              {loading ? '—' : money(data?.available_balance, currency)}
            </Text>
            <Text className="mt-0.5 text-[13px] leading-[18px] text-white/70">
              {data?.budget ? 'Your plan has no days left. Start a new one for a daily limit.' : 'Create a budget to see how much you can safely spend each day.'}
            </Text>
          </>
        )}

        <View className="mt-5 flex-row rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3">
          <HeroStat Icon={Wallet} label="Balance" value={money(data?.available_balance, currency)} />
          <View className="mx-2 w-px bg-white/10" />
          <HeroStat Icon={Receipt} label="Spent today" value={money(String(spentToday), currency)} />
          <View className="mx-2 w-px bg-white/10" />
          <HeroStat Icon={CalendarDays} label="Days left" value={summary?.days_remaining !== undefined ? String(summary.days_remaining) : '—'} />
        </View>
      </LinearGradient>
    </View>
  );
}

/** Circular gauge of how much of today's limit is used. */
function ProgressRing({ percent, color, size = 84, stroke = 8 }: { percent: number; color: string; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${Math.round(percent)} percent of today’s limit used`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-base font-extrabold text-white">{Math.round(percent)}%</Text>
        <Text className="text-[10px] font-medium text-white/60">used</Text>
      </View>
    </View>
  );
}

function HeroStat({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-1.5">
        <Icon size={13} color={LIGHT_ACCENT} strokeWidth={2.2} />
        <Text className="text-[11px] text-white/60">{label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit className="mt-1 text-sm font-bold text-white">{value}</Text>
    </View>
  );
}

function QuickAction({ label, a11y, Icon, tint, bg, onPress }: { label: string; a11y: string; Icon: LucideIcon; tint: string; bg: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} className="flex-1 items-center active:opacity-70">
      <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px]" style={{ backgroundColor: bg }}>
        <Icon size={22} color={tint} strokeWidth={2.2} />
      </View>
      <Text className="mt-2 text-xs font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="mb-3 mt-7 flex-row items-center justify-between">
      <Text className="text-[17px] font-bold tracking-tight text-ink">{title}</Text>
      {action && onAction && (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8} className="flex-row items-center gap-0.5 rounded-full bg-accent-light px-3 py-1.5 active:opacity-70">
          <Text className="text-xs font-semibold text-accent">{action}</Text>
          <ChevronRight size={14} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

function EmptyState({ Icon, title, body }: { Icon: LucideIcon; title: string; body: string }) {
  return (
    <View className="items-center py-8">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-light">
        <Icon size={22} color={colors.accent} />
      </View>
      <Text className="mt-3 text-sm font-semibold text-ink">{title}</Text>
      <Text className="mt-1 text-center text-xs text-muted">{body}</Text>
    </View>
  );
}

/** Net cash flow for the month with an income vs. expenses split. */
function MonthCard({ data, currency }: { data: DashboardData | undefined; currency: string | undefined }) {
  const income = Number(data?.this_month.income ?? 0);
  const expenses = Number(data?.this_month.expenses ?? 0);
  const net = Number(data?.this_month.net ?? income - expenses);
  const total = income + expenses;
  const incomeShare = total > 0 ? (income / total) * 100 : 0;
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(data?.today ? day(data.today) : new Date());

  return (
    <View style={cardShadow} className="rounded-3xl bg-card p-4">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-xs font-medium text-muted">Net cash flow</Text>
          <Text className={`mt-1 text-2xl font-extrabold tracking-tight ${net < 0 ? 'text-error' : 'text-ink'}`}>
            {data ? `${net > 0 ? '+' : net < 0 ? '−' : ''}${money(String(Math.abs(net)), currency)}` : '—'}
          </Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-background px-2.5 py-1">
          <CalendarDays size={12} color={colors.textSecondary} />
          <Text className="text-[11px] font-semibold text-muted">{monthLabel}</Text>
        </View>
      </View>

      <View className="mt-4 h-2.5 flex-row overflow-hidden rounded-full bg-[#ECEEF5]">
        {total > 0 && (
          <>
            <View className="h-full bg-[#4ADE80]" style={{ width: `${incomeShare}%` }} />
            <View className="h-full bg-[#F87171]" style={{ width: `${100 - incomeShare}%`, marginLeft: incomeShare > 0 && incomeShare < 100 ? 2 : 0 }} />
          </>
        )}
      </View>

      <View className="mt-4 flex-row gap-3">
        <FlowTile label="Income" amount={money(data?.this_month.income, currency)} Icon={ArrowDownLeft} iconColor={colors.positiveText} iconBg={colors.positive} />
        <FlowTile label="Expenses" amount={money(data?.this_month.expenses, currency)} Icon={ArrowUpRight} iconColor={colors.error} iconBg={colors.errorBg} />
      </View>
    </View>
  );
}

function FlowTile({ label, amount, Icon, iconColor, iconBg }: { label: string; amount: string; Icon: LucideIcon; iconColor: string; iconBg: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-2.5 rounded-2xl bg-background px-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: iconBg }}>
        <Icon size={17} color={iconColor} strokeWidth={2.3} />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-muted">{label}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit className="text-sm font-bold text-ink">{amount}</Text>
      </View>
    </View>
  );
}

function PlanCard({ budget, currency, today }: { budget: DashboardData['budget']; currency: string | undefined; today: string | undefined }) {
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

  // Where "today" falls in the period, so spending can be compared with time elapsed.
  const periodDays = daysBetween(budget.start_date, budget.end_date) + 1;
  const elapsed = today ? Math.min(periodDays, Math.max(0, daysBetween(budget.start_date, today) + 1)) : null;
  const timePercent = elapsed !== null && periodDays > 0 ? (elapsed / periodDays) * 100 : null;

  return (
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/budgets')} style={cardShadow} className="rounded-3xl bg-card p-4 active:opacity-90">
      <View className="flex-row items-center">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-accent-light">
          <PieChart size={20} color={colors.accent} strokeWidth={2} />
        </View>
        <View className="flex-1 pr-3">
          <Text numberOfLines={1} className="text-[15px] font-bold text-ink">{budget.name}</Text>
          <Text className="mt-0.5 text-xs text-muted">
            {shortDate(budget.start_date)} – {shortDate(budget.end_date)}
            {elapsed !== null ? `  ·  Day ${elapsed} of ${periodDays}` : ''}
          </Text>
        </View>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: summary.is_overspent ? colors.errorBg : colors.accentLight }}>
          <Text className="text-[11px] font-bold" style={{ color: summary.is_overspent ? colors.error : colors.primary }}>{summary.percent_used}% used</Text>
        </View>
      </View>

      <View className="mt-5">
        <View className="h-3 overflow-hidden rounded-full bg-[#ECEEFF]">
          <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: barColor }} />
        </View>
        {timePercent !== null && (
          <View pointerEvents="none" className="absolute -top-1 h-5 w-[3px] rounded-full bg-primary" style={{ left: `${timePercent}%`, marginLeft: -1.5 }} />
        )}
      </View>
      {timePercent !== null && <Text className="mt-2 text-[11px] text-muted">The marker shows where today falls in your plan.</Text>}

      <View className="mt-4 flex-row rounded-2xl bg-background px-3 py-3">
        <PlanStat label="Spent" value={money(summary.spent_total, currency)} />
        <View className="mx-2 w-px bg-border" />
        <PlanStat
          label={summary.is_overspent ? 'Over by' : 'Remaining'}
          value={money(summary.is_overspent ? String(Math.abs(Number(summary.remaining))) : summary.remaining, currency)}
          danger={summary.is_overspent}
        />
        <View className="mx-2 w-px bg-border" />
        <PlanStat label="Limit" value={money(summary.spending_limit, currency)} />
      </View>

      {summary.pace_exceeds_limit && !summary.is_overspent && (
        <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-warning-bg px-3 py-2.5">
          <TriangleAlert size={15} color={colors.warningText} />
          <Text className="flex-1 text-xs leading-[17px] text-warning-text">At your current pace, this plan may run out before it ends.</Text>
        </View>
      )}
    </Pressable>
  );
}

function PlanStat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] text-muted">{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className={`mt-0.5 text-sm font-bold ${danger ? 'text-error' : 'text-ink'}`}>{value}</Text>
    </View>
  );
}

function BreakdownCard({ categories, currency }: { categories: DashboardData['category_breakdown']; currency: string | undefined }) {
  const top = categories.slice(0, 4);

  return (
    <View style={cardShadow} className="rounded-3xl bg-card p-4">
      <View className="h-3 flex-row overflow-hidden rounded-full bg-[#ECEEF5]">
        {top.map((category, index) => (
          <View
            key={category.category_id}
            className="h-full"
            style={{ width: `${Math.min(100, category.percent)}%`, backgroundColor: CATEGORY_COLORS[index], marginLeft: index === 0 ? 0 : 2 }}
          />
        ))}
      </View>

      <View className="mt-2">
        {top.map((category, index) => (
          <View key={category.category_id} className={`flex-row items-center py-3 ${index === top.length - 1 ? '' : 'border-b border-[#F1F2F7]'}`}>
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${CATEGORY_COLORS[index]}22` }}>
              <CategoryIcon icon={category.icon} size={18} color={CATEGORY_COLORS[index]} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-[13px] font-semibold text-ink">{category.name}</Text>
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index] }} />
                <Text className="text-[11px] text-muted">{category.percent}% of spending</Text>
              </View>
            </View>
            <Text className="text-[13px] font-bold text-ink">{money(category.total, currency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TransactionRow({ transaction, currency, today, last }: { transaction: DashboardTransaction; currency: string | undefined; today: string | undefined; last: boolean }) {
  const income = transaction.type === 'income';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/transaction-details', params: { type: transaction.type, id: String(transaction.id) } })}
      className={`flex-row items-center py-3.5 active:opacity-70 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <View className={`mr-3 h-11 w-11 items-center justify-center rounded-2xl ${income ? 'bg-positive' : 'bg-accent-light'}`}>
        <CategoryIcon icon={transaction.category.icon} size={19} color={income ? colors.positiveText : colors.accent} strokeWidth={1.9} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[14px] font-semibold text-ink">{transaction.description}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[11px] text-muted">
          {transaction.category.name} · {relativeDate(transaction.date, today)}
        </Text>
      </View>
      <View className={`ml-2 rounded-lg px-2 py-1 ${income ? 'bg-positive' : ''}`}>
        <Text className={`text-[13px] font-bold ${income ? 'text-positive-text' : 'text-ink'}`}>
          {income ? '+' : '−'}{money(transaction.amount, currency)}
        </Text>
      </View>
    </Pressable>
  );
}
