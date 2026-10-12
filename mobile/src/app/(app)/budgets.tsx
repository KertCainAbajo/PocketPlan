import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  PiggyBank,
  Plus,
  Receipt,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomBar } from '@/components/app-bottom-bar';
import { BrandMark } from '@/components/brand-mark';
import { CategoryIcon } from '@/components/category-icon';
import { FormBanner } from '@/components/ui/form-banner';
import { budgetApi, type BudgetItem } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const LIGHT_ACCENT = '#AEB8FF';

/** Distinct hues for categories; the same colour is used in the allocation bar and the list. */
const CATEGORY_COLORS = ['#8B9BFF', '#38BDF8', '#FBBF24', '#34D399', '#F472B6', '#A78BFA', '#FB923C'];

/** Soft, navy-tinted elevation shared by the floating cards. */
const cardShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

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

function periodTiming(budget: BudgetItem, today: string): { label: string; text: string; bg: string } {
  if (budget.start_date > today) return { label: 'Upcoming', text: colors.primary, bg: colors.accentLight };
  if (budget.end_date < today || budget.status === 'completed') return { label: 'Past period', text: colors.textSecondary, bg: colors.border };
  return { label: 'Current period', text: colors.positiveText, bg: colors.positive };
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
  const assignCategory = () => budget && router.push({ pathname: '/category-budget-form', params: { budgetId: String(budget.id) } });
  const frequencyLabel = budget ? budget.frequency[0].toUpperCase() + budget.frequency.slice(1) : '';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow px-5 pb-8"
        refreshControl={<RefreshControl refreshing={budgets.isRefetching || detail.isRefetching} onRefresh={() => { void budgets.refetch(); if (selected) void detail.refetch(); }} tintColor={colors.accent} />}>
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2">
          <BrandMark size={34} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create budget"
            onPress={createBudget}
            style={[cardShadow, { shadowOpacity: 0.25 }]}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-primary active:opacity-80">
            <Plus size={20} color="white" strokeWidth={2.4} />
          </Pressable>
        </View>

        <View className="mt-5">
          <Text className="text-[26px] font-extrabold tracking-tight text-ink">Budgets</Text>
          <Text className="mt-0.5 text-[13px] text-muted">One spending plan for each allowance period.</Text>
        </View>

        {/* Period switcher */}
        <View style={cardShadow} className="mt-5 flex-row items-center justify-between rounded-2xl bg-card p-2">
          <PeriodArrow Icon={ChevronLeft} label="Previous budget period" disabled={!older} onPress={() => older && setPickedId(older.id)} />
          <View className="items-center">
            <View className="flex-row items-center gap-1.5">
              <CalendarDays size={15} color={colors.primary} />
              <Text className="text-[15px] font-bold text-ink">{selected ? periodLabel(selected) : 'No budget periods'}</Text>
            </View>
            {timing && (
              <View className="mt-1 flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: timing.bg }}>
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: timing.text }} />
                <Text className="text-[11px] font-semibold" style={{ color: timing.text }}>{timing.label}</Text>
              </View>
            )}
          </View>
          <PeriodArrow Icon={ChevronRight} label="Next budget period" disabled={!newer} onPress={() => newer && setPickedId(newer.id)} />
        </View>

        {budgets.isError && <View className="mt-4"><FormBanner message={getErrorMessage(budgets.error)} /></View>}
        {detail.isError && <View className="mt-4"><FormBanner message={getErrorMessage(detail.error)} /></View>}

        {budgets.isPending ? (
          <View className="mt-5 h-[260px] rounded-[30px] bg-[#E6E9F2]" />
        ) : budget ? (
          <>
            {/* Plan hero */}
            <View className="mt-5 overflow-hidden rounded-[30px]">
              <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
                <View pointerEvents="none" className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-accent opacity-25" />
                <View pointerEvents="none" className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-white opacity-[0.04]" />

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                      <ChartNoAxesColumn size={16} color="white" />
                    </View>
                    <Text className="text-[13px] font-semibold text-white/85">{frequencyLabel} spending plan</Text>
                  </View>
                  <View className="rounded-full bg-white/15 px-2.5 py-1">
                    <Text className="text-[11px] font-bold text-white">{assignedPercent}% assigned</Text>
                  </View>
                </View>

                <Text className="mt-5 text-[12px] font-semibold uppercase tracking-[1px] text-white/60">{overAssigned ? 'Over-assigned by' : 'Left to assign'}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit className={`mt-1 text-[38px] font-extrabold tracking-tight ${overAssigned ? 'text-[#FCA5A5]' : 'text-white'}`}>
                  {money(Math.abs(leftToAssign), currency)}
                </Text>
                <Text className="mt-0.5 text-[13px] leading-[18px] text-white/70">
                  {overAssigned
                    ? 'Your categories add up to more than this budget. Lower one of them.'
                    : leftToAssign === 0
                      ? 'Every peso has a job. Nice!'
                      : `Split your ${money(budgetAmount, currency)} into categories below.`}
                </Text>

                {/* Allocation bar: one segment per category, the rest is unassigned. */}
                <View className="mt-5 h-2.5 flex-row overflow-hidden rounded-full bg-white/15">
                  {overAssigned ? (
                    <View className="h-full w-full bg-[#F87171]" />
                  ) : (
                    categoryLimits.map((category, i) => (
                      <View
                        key={category.category_id}
                        className="h-full"
                        style={{
                          width: `${budgetAmount > 0 ? (Number(category.limit_amount) / budgetAmount) * 100 : 0}%`,
                          backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          marginLeft: i === 0 ? 0 : 2,
                        }}
                      />
                    ))
                  )}
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[11px] text-white/70">{money(limitTotal, currency)} assigned</Text>
                  <Text className="text-[11px] text-white/70">of {money(budgetAmount, currency)}</Text>
                </View>

                {budget.status !== 'completed' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Change the ${budget.frequency} budget amount`}
                    onPress={() => router.push({ pathname: '/budget-form', params: { budgetId: String(budget.id) } })}
                    className="mt-4 h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 active:opacity-70">
                    <Pencil size={14} color="white" />
                    <Text className="text-[13px] font-semibold text-white">Change {budget.frequency} amount</Text>
                  </Pressable>
                )}

                <View className="mt-4 flex-row rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3">
                  <HeroStat Icon={Receipt} label="Spent" value={money(budget.summary.spent_total, currency)} />
                  <View className="mx-2 w-px bg-white/10" />
                  <HeroStat
                    Icon={Wallet}
                    label={budget.summary.is_overspent ? 'Over by' : 'Remaining'}
                    value={money(Math.abs(Number(budget.summary.remaining)), currency)}
                  />
                  <View className="mx-2 w-px bg-white/10" />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={13} color={LIGHT_ACCENT} strokeWidth={2.2} />
                      <Text className="text-[11px] text-white/60">Elapsed</Text>
                    </View>
                    <Text className="mt-1 text-sm font-bold text-white">{periodProgress}%</Text>
                    <View className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/15">
                      <View className="h-full rounded-full bg-[#AEB8FF]" style={{ width: `${periodProgress}%` }} />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {budget.savings_rollover && (
              <View style={cardShadow} className="mt-4 flex-row items-center rounded-3xl bg-card p-4">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-positive">
                  <PiggyBank size={20} color={colors.positiveText} />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-ink">
                    {Number(budget.savings_rollover.amount) > 0 ? `${money(budget.savings_rollover.amount, currency)} moved to savings` : 'No unspent allowance to save'}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-muted">Period closed · {budget.savings_rollover.saved_on}</Text>
                </View>
              </View>
            )}

            {/* Categories */}
            <View className="mb-3 mt-7 flex-row items-center justify-between">
              <View>
                <Text className="text-[17px] font-bold tracking-tight text-ink">Your categories</Text>
                <Text className="mt-0.5 text-[12px] text-muted">How you split this period’s money.</Text>
              </View>
              <Pressable accessibilityRole="link" onPress={() => router.navigate('/activity')} hitSlop={8} className="flex-row items-center gap-0.5 rounded-full bg-accent-light px-3 py-1.5 active:opacity-70">
                <Text className="text-xs font-semibold text-accent">Insights</Text>
                <ArrowRight size={13} color={colors.accent} />
              </Pressable>
            </View>

            {detail.isPending ? (
              <View style={cardShadow} className="rounded-3xl bg-card px-4 py-1">
                {[0, 1, 2].map((i) => <SkeletonRow key={i} last={i === 2} />)}
              </View>
            ) : categoryLimits.length ? (
              <View style={cardShadow} className="rounded-3xl bg-card px-4 py-1">
                {categoryLimits.map((category, i) => {
                  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  const used = Math.min(100, Math.max(0, category.percent_used));
                  const remaining = Number(category.remaining);
                  const over = remaining < 0;
                  const barColor = over ? colors.error : used >= 80 ? colors.warning : color;
                  return (
                    <Pressable
                      key={category.category_id}
                      accessibilityRole="button"
                      accessibilityLabel={`${category.category_name} budget details`}
                      onPress={() => router.push({ pathname: '/category-budget-details', params: { budgetId: String(budget.id), categoryId: String(category.category_id) } })}
                      className={`py-4 active:opacity-70 ${i < categoryLimits.length - 1 ? 'border-b border-[#F1F2F7]' : ''}`}>
                      <View className="flex-row items-center">
                        <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}26` }}>
                          <CategoryIcon icon={category.category_icon} size={19} color={color} strokeWidth={2} />
                        </View>
                        <View className="flex-1 pr-2">
                          <Text numberOfLines={1} className="text-[14px] font-semibold text-ink">{category.category_name}</Text>
                          <Text className="mt-0.5 text-[12px] text-muted">
                            {money(category.spent, currency)} of {money(category.limit_amount, currency)}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className={`text-[14px] font-bold ${over ? 'text-error' : 'text-ink'}`}>{money(Math.abs(remaining), currency)}</Text>
                          <Text className={`mt-0.5 text-[11px] font-medium ${over ? 'text-error' : 'text-muted'}`}>{over ? 'over limit' : 'left'}</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                      </View>
                      <View className="ml-14 mt-3 flex-row items-center gap-2.5">
                        <View className="h-2 flex-1 overflow-hidden rounded-full bg-[#ECEEF5]">
                          <View className="h-full rounded-full" style={{ width: `${used}%`, backgroundColor: barColor }} />
                        </View>
                        <Text className="w-10 text-right text-[11px] font-semibold text-muted">{category.percent_used}%</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={cardShadow} className="items-center rounded-3xl bg-card px-6 py-9">
                <View className="h-16 w-16 items-center justify-center rounded-3xl bg-accent-light">
                  <Sparkles size={26} color={colors.accent} />
                </View>
                <Text className="mt-4 text-base font-bold text-ink">Nothing assigned yet</Text>
                <Text className="mt-1.5 text-center text-[13px] leading-5 text-muted">
                  Give your {money(budgetAmount, currency)} a job. Try starting with one of these:
                </Text>
                <View className="mt-4 flex-row flex-wrap justify-center gap-2">
                  {[
                    { label: 'Food', icon: 'utensils' },
                    { label: 'Transportation', icon: 'bus' },
                    { label: 'School supplies', icon: 'pencil' },
                  ].map((idea, i) => (
                    <Pressable
                      key={idea.label}
                      accessibilityRole="button"
                      accessibilityLabel={`Assign money to ${idea.label}`}
                      onPress={assignCategory}
                      className="flex-row items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 active:opacity-70">
                      <CategoryIcon icon={idea.icon} size={14} color={CATEGORY_COLORS[i]} strokeWidth={2.2} />
                      <Text className="text-[12px] font-semibold text-ink">{idea.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={assignCategory}
              style={[cardShadow, { shadowOpacity: 0.25 }]}
              className="mt-5 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-80">
              <Plus size={18} color="white" strokeWidth={2.4} />
              <Text className="text-[14px] font-bold text-white">Assign money to a category</Text>
            </Pressable>
            {categoryLimits.length > 0 && (
              <Text className="mt-3 px-1 text-center text-[12px] leading-[18px] text-muted">
                {money(limitTotal, currency)} of {money(budgetAmount, currency)} assigned
                {leftToAssign > 0 ? ` · ${money(leftToAssign, currency)} still free` : ''}. Tap a category to change it.
              </Text>
            )}
          </>
        ) : (
          <View style={cardShadow} className="mt-5 items-center rounded-3xl bg-card px-6 py-10">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-accent-light">
              <ChartNoAxesColumn size={26} color={colors.accent} />
            </View>
            <Text className="mt-4 text-base font-bold text-ink">No budget yet</Text>
            <Text className="mt-1.5 text-center text-[13px] leading-5 text-muted">
              A budget is how much you plan to spend in one period. Create one to get your daily safe-to-spend amount.
            </Text>
            <Pressable onPress={createBudget} className="mt-5 flex-row items-center gap-1.5 rounded-full bg-primary px-5 py-3 active:opacity-80">
              <Plus size={15} color="white" strokeWidth={2.4} />
              <Text className="text-[13px] font-bold text-white">Create a budget</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <AppBottomBar active="budgets" />
    </SafeAreaView>
  );
}

function PeriodArrow({ Icon, label, disabled, onPress }: { Icon: LucideIcon; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-xl bg-accent-light active:opacity-70 ${disabled ? 'opacity-30' : ''}`}>
      <Icon size={18} color={colors.primary} strokeWidth={2.2} />
    </Pressable>
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

function SkeletonRow({ last }: { last: boolean }) {
  return (
    <View className={`flex-row items-center py-4 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <View className="mr-3 h-11 w-11 rounded-2xl bg-[#EEF0F6]" />
      <View className="flex-1 gap-2">
        <View className="h-3 w-1/2 rounded-full bg-[#EEF0F6]" />
        <View className="h-2.5 w-1/3 rounded-full bg-[#F3F4F8]" />
      </View>
      <View className="h-3 w-16 rounded-full bg-[#EEF0F6]" />
    </View>
  );
}
