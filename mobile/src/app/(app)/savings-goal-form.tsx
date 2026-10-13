import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BellRing,
  CalendarDays,
  Check,
  ChevronRight,
  Flag,
  GraduationCap,
  House,
  Laptop,
  Plane,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { cardShadow, Field, IconTile, InfoNote, PrimaryButton, SectionLabel, SettingsCard, SettingsHeader } from '@/components/settings-ui';
import { FormBanner } from '@/components/ui/form-banner';
import { currencySymbol } from '@/features/budgets/period';
import { savingsGoalsApi, type SavingsGoal } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { cachedDateTimeFormat, cachedNumberFormat } from '@/lib/intl';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const AMOUNT_PATTERN = /^\d+(\.\d{0,2})?$/;

/** Keeps only digits and one decimal point, so the symbol is never typed into the value. */
const cleanAmount = (text: string) => text.replace(',', '.').replace(/[^\d.]/g, '');

/** Same colours and icons as the Goals screen, so a goal looks the same everywhere. */
const GOAL_TYPES: { value: SavingsGoal['icon']; label: string; Icon: LucideIcon; color: string; example: string }[] = [
  { value: 'laptop', label: 'Gadget', Icon: Laptop, color: '#6C7CF7', example: 'New laptop' },
  { value: 'home', label: 'Home', Icon: House, color: '#F59E0B', example: 'Dorm essentials' },
  { value: 'travel', label: 'Travel', Icon: Plane, color: '#0EA5E9', example: 'Summer trip' },
  { value: 'emergency', label: 'Emergency', Icon: ShieldCheck, color: '#10B981', example: 'Emergency fund' },
  { value: 'education', label: 'Education', Icon: GraduationCap, color: '#8B5CF6', example: 'Tuition fee' },
];

const QUICK_AMOUNTS = [1000, 5000, 10000, 20000];
const QUICK_DATES = [{ label: '3 months', months: 3 }, { label: '6 months', months: 6 }, { label: '1 year', months: 12 }];

function dateToString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthsFromNow(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return dateToString(date);
}

/** Default for the date picker: tomorrow. */
function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return cachedDateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day, 12));
}

function formatMoney(value: number, currency: string, fractionDigits = 2) {
  try {
    return cachedNumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
  } catch {
    return `${currency} ${value.toFixed(fractionDigits)}`;
  }
}

export default function SavingsGoalFormScreen() {
  useStatusBarStyle('dark');
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const editingId = Number(goalId);
  const isEditing = Number.isInteger(editingId) && editingId > 0;
  const user = useAuthStore((state) => state.user);
  const currency = user?.currency ?? 'PHP';
  const symbol = currencySymbol(currency);
  const queryClient = useQueryClient();
  const existing = useQuery({ queryKey: ['savings-goal', editingId], queryFn: () => savingsGoalsApi.get(editingId), enabled: isEditing });
  const [icon, setIcon] = useState<SavingsGoal['icon']>('laptop');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [startingAmount, setStartingAmount] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [initializedId, setInitializedId] = useState<number | null>(null);

  // Fill the form once when the goal being edited arrives (state adjusted during render, no effect needed).
  const loadedGoal = existing.data?.goal;
  if (loadedGoal && initializedId !== loadedGoal.id) {
    setInitializedId(loadedGoal.id);
    setIcon(loadedGoal.icon);
    setName(loadedGoal.name);
    setTarget(loadedGoal.target_amount);
    setTargetDate(loadedGoal.target_date ?? '');
    setReminderEnabled(loadedGoal.reminder_enabled);
  }

  const create = useMutation({
    mutationFn: (input: { name: string; icon: SavingsGoal['icon']; target_amount: string; starting_amount: string; target_date?: string; reminder_enabled: boolean }) => isEditing
      ? savingsGoalsApi.update(editingId, { name: input.name, icon: input.icon, target_amount: input.target_amount, target_date: input.target_date ?? null, reminder_enabled: input.reminder_enabled })
      : savingsGoalsApi.create(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['savings-goals'] }),
        ...(isEditing ? [queryClient.invalidateQueries({ queryKey: ['savings-goal', editingId] })] : []),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      router.back();
    },
  });

  const type = GOAL_TYPES.find((option) => option.value === icon) ?? GOAL_TYPES[0];
  const targetValid = AMOUNT_PATTERN.test(target.trim()) && Number(target) > 0;
  const startingValid = startingAmount.trim() === '' || AMOUNT_PATTERN.test(startingAmount.trim());
  const targetValue = targetValid ? Number(target) : 0;
  const startingValue = isEditing ? Number(existing.data?.goal.saved_amount ?? 0) : startingValid ? Number(startingAmount || 0) : 0;
  const monthsUntilTarget = targetDate
    ? Math.max(1, (Number(targetDate.slice(0, 4)) - new Date().getFullYear()) * 12 + Number(targetDate.slice(5, 7)) - (new Date().getMonth() + 1))
    : 0;
  const remaining = Math.max(0, targetValue - startingValue);
  const monthlyAmount = monthsUntilTarget > 0 ? remaining / monthsUntilTarget : 0;
  const progress = targetValue > 0 ? Math.max(0, Math.min(100, (startingValue / targetValue) * 100)) : 0;
  const startingTooHigh = !isEditing && targetValue > 0 && startingValue > targetValue;
  const canSubmit = !create.isPending && name.trim().length > 0 && targetValid && startingValid && !startingTooHigh && !(isEditing && existing.isPending);

  function submit() {
    create.mutate({
      icon,
      name: name.trim(),
      target_amount: target.trim(),
      starting_amount: startingAmount.trim() || '0',
      ...(targetDate ? { target_date: targetDate } : {}),
      reminder_enabled: reminderEnabled,
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-10">
        <SettingsHeader
          title={isEditing ? 'Edit your goal' : 'Create a savings goal'}
          subtitle={isEditing ? 'Update your target and details.' : 'Give your savings something to move toward.'}
        />

        {/* Live preview */}
        <View className="mt-6 overflow-hidden rounded-[28px]">
          <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
            <View pointerEvents="none" className="absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-30" style={{ backgroundColor: type.color }} />
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${type.color}40` }}>
                <type.Icon size={22} color="white" strokeWidth={2} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-white/60">{type.label} goal</Text>
                <Text numberOfLines={1} className="mt-0.5 text-[18px] font-bold text-white">{name.trim() || type.example}</Text>
              </View>
            </View>

            <View className="mt-5 flex-row items-center">
              <View className="flex-1 pr-3">
                <Text className="text-[11px] text-white/60">Target</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit className="mt-0.5 text-[30px] font-extrabold tracking-tight text-white">
                  {targetValue > 0 ? formatMoney(targetValue, currency) : formatMoney(0, currency)}
                </Text>
                <Text className="mt-1 text-[12px] text-white/70">
                  {targetDate ? `By ${formatDate(targetDate)}` : 'No deadline · Save at your own pace'}
                </Text>
              </View>
              <Ring percent={progress} color={type.color} />
            </View>
          </LinearGradient>
        </View>

        {/* Goal type */}
        <SectionLabel>Goal type</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerClassName="gap-2.5 px-5 pb-1">
          {GOAL_TYPES.map((option) => {
            const selected = option.value === icon;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label} goal`}
                accessibilityState={{ checked: selected }}
                onPress={() => setIcon(option.value)}
                style={[cardShadow, selected ? { borderColor: option.color } : null]}
                className={`w-[92px] items-center rounded-3xl border-2 bg-card py-4 ${selected ? '' : 'border-transparent'}`}>
                {selected && (
                  <View className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: option.color }}>
                    <Check size={12} color="white" strokeWidth={3} />
                  </View>
                )}
                <IconTile Icon={option.Icon} color={option.color} size={44} />
                <Text className={`mt-2 text-[12px] ${selected ? 'font-bold text-ink' : 'font-semibold text-muted'}`}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Details */}
        <SectionLabel>Details</SectionLabel>
        <SettingsCard className="px-4 pb-5 pt-1">
          <Field label="Goal name" Icon={Flag} value={name} onChangeText={setName} placeholder={`e.g. ${type.example}`} maxLength={100} returnKeyType="next" />

          <Field
            label="Target amount"
            prefix={symbol}
            value={target}
            onChangeText={(text) => setTarget(cleanAmount(text))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={target.trim() && !targetValid ? 'Enter an amount above zero, with up to 2 decimals.' : undefined}
          />
          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amount) => {
              const selected = Number(target) === amount;
              return (
                <Pressable
                  key={amount}
                  accessibilityRole="button"
                  onPress={() => setTarget(amount.toFixed(2))}
                  className={`rounded-full px-3.5 py-2 ${selected ? 'bg-primary' : 'bg-accent-light'}`}>
                  <Text className={`text-[12px] font-bold ${selected ? 'text-white' : 'text-primary'}`}>{formatMoney(amount, currency, 0)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-1.5 ml-0.5 mt-5 text-[13px] font-semibold text-ink">Target date <Text className="font-normal text-muted">· Optional</Text></Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={targetDate ? `Target date ${formatDate(targetDate)}. Change` : 'Choose target date'}
            onPress={() => setShowDatePicker(true)}
            className="h-[52px] flex-row items-center rounded-2xl border-[1.5px] border-border bg-background px-3.5 active:opacity-80">
            <CalendarDays size={18} color={targetDate ? colors.accent : colors.textSecondary} />
            <Text className={`ml-2.5 flex-1 text-[15px] ${targetDate ? 'text-ink' : 'text-muted'}`}>{targetDate ? formatDate(targetDate) : 'Choose a date'}</Text>
            {targetDate ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear target date" hitSlop={8} onPress={() => setTargetDate('')} className="h-7 w-7 items-center justify-center rounded-full bg-card">
                <X size={14} color={colors.textSecondary} />
              </Pressable>
            ) : (
              <ChevronRight size={18} color={colors.textSecondary} />
            )}
          </Pressable>
          <View className="mt-2.5 flex-row gap-2">
            {QUICK_DATES.map((option) => {
              const value = monthsFromNow(option.months);
              const selected = targetDate === value;
              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  onPress={() => setTargetDate(value)}
                  className={`rounded-full px-3.5 py-2 ${selected ? 'bg-primary' : 'bg-accent-light'}`}>
                  <Text className={`text-[12px] font-bold ${selected ? 'text-white' : 'text-primary'}`}>In {option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {!isEditing && (
            <Field
              label="Already saved"
              prefix={symbol}
              value={startingAmount}
              onChangeText={(text) => setStartingAmount(cleanAmount(text))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              hint="Money you already have for this goal. It won't count as income."
              error={!startingValid ? 'Use numbers with up to 2 decimals.' : startingTooHigh ? 'This is more than your target.' : undefined}
            />
          )}
        </SettingsCard>

        {/* Plan */}
        <SectionLabel>Your saving plan</SectionLabel>
        <SettingsCard className="p-5">
          {targetDate && targetValue > 0 && remaining === 0 ? (
            <PlanMessage Icon={Check} color={colors.positiveText} title="You already have enough" body="What you've saved meets this target. You can raise it anytime." />
          ) : targetDate && targetValue > 0 ? (
            <>
              <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-muted">Save about</Text>
              <View className="mt-1 flex-row items-end">
                <Text className="text-[30px] font-extrabold tracking-tight text-ink">{formatMoney(monthlyAmount, currency, 0)}</Text>
                <Text className="mb-1.5 ml-1 text-[14px] font-semibold text-muted">/ month</Text>
              </View>
              <Text className="mt-1 text-[13px] leading-5 text-muted">
                For {monthsUntilTarget} month{monthsUntilTarget === 1 ? '' : 's'} · about {formatMoney(monthlyAmount / 4.33, currency, 0)} a week
              </Text>
              <View className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#ECEEF5]">
                <View className="h-full rounded-full" style={{ width: `${Math.max(progress, 2)}%`, backgroundColor: type.color }} />
              </View>
              <View className="mt-2 flex-row justify-between">
                <Text className="text-[12px] text-muted">{formatMoney(startingValue, currency, 0)} saved</Text>
                <Text className="text-[12px] font-semibold text-ink">{formatMoney(remaining, currency, 0)} to go</Text>
              </View>
            </>
          ) : (
            <PlanMessage Icon={CalendarDays} color={colors.accent} title="Set a target and a date" body="We'll work out how much to put aside each month to get there on time." />
          )}
        </SettingsCard>

        {/* Reminder */}
        <SettingsCard className="mt-4 flex-row items-center p-4">
          <IconTile Icon={BellRing} color="#F59E0B" />
          <View className="ml-3 flex-1">
            <Text className="text-[14px] font-semibold text-ink">Monthly reminder</Text>
            <Text className="mt-0.5 text-[12px] text-muted">On the 1st · A nudge, not an auto-transfer</Text>
          </View>
          <Switch accessibilityLabel="Monthly saving reminder" value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ false: '#D6DBE6', true: colors.primary }} thumbColor="#FFFFFF" ios_backgroundColor="#D6DBE6" />
        </SettingsCard>

        {create.isError && <View className="mt-4"><FormBanner message={getErrorMessage(create.error)} /></View>}
        {existing.isError && <View className="mt-4"><FormBanner message={getErrorMessage(existing.error)} /></View>}

        <PrimaryButton title={create.isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create my goal'} Icon={isEditing ? Check : Flag} onPress={submit} disabled={!canSubmit} />
        <InfoNote text="Your targets are flexible. Adjust them whenever life changes." />
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={targetDate ? new Date(`${targetDate}T12:00:00`) : tomorrow()}
          onValueChange={(_event, date) => { setShowDatePicker(false); if (date) setTargetDate(dateToString(date)); }}
          onDismiss={() => setShowDatePicker(false)}
          mode="date"
          presentation="dialog"
          minimumDate={tomorrow()}
          accentColor={colors.primary}
        />
      )}
    </SafeAreaView>
  );
}

function PlanMessage({ Icon, color, title, body }: { Icon: LucideIcon; color: string; title: string; body: string }) {
  return (
    <View className="flex-row items-center">
      <IconTile Icon={Icon} color={color} size={44} />
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-bold text-ink">{title}</Text>
        <Text className="mt-0.5 text-[12px] leading-[17px] text-muted">{body}</Text>
      </View>
    </View>
  );
}

/** Circular gauge of how much of the target is already saved. */
function Ring({ percent, color, size = 76, stroke = 8 }: { percent: number; color: string; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${Math.round(percent)} percent already saved`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - percent / 100)} />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-[15px] font-extrabold text-white">{Math.round(percent)}%</Text>
        <Text className="text-[9px] font-medium text-white/60">saved</Text>
      </View>
    </View>
  );
}
