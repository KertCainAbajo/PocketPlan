import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CalendarDays, GraduationCap, House, Laptop, Plane, ShieldCheck, Flag } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { savingsGoalsApi, type SavingsGoal } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const iconOptions: { value: SavingsGoal['icon']; Icon: typeof Laptop }[] = [
  { value: 'laptop', Icon: Laptop },
  { value: 'home', Icon: House },
  { value: 'travel', Icon: Plane },
  { value: 'emergency', Icon: ShieldCheck },
  { value: 'education', Icon: GraduationCap },
];

function dateToString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day, 12));
}

function formatMoney(value: number, currency: string, fractionDigits = 2) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
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
  const queryClient = useQueryClient();
  const existing = useQuery({ queryKey: ['savings-goal', editingId], queryFn: () => savingsGoalsApi.get(editingId), enabled: isEditing });
  const [icon, setIcon] = useState<SavingsGoal['icon']>('laptop');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [startingAmount, setStartingAmount] = useState('0.00');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [initializedId, setInitializedId] = useState<number | null>(null);

  useEffect(() => {
    const goal = existing.data?.goal;
    if (goal && initializedId !== goal.id) {
      setIcon(goal.icon);
      setName(goal.name);
      setTarget(goal.target_amount);
      setTargetDate(goal.target_date ?? '');
      setReminderEnabled(goal.reminder_enabled);
      setInitializedId(goal.id);
    }
  }, [existing.data, initializedId]);

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

  const targetValue = Number(target);
  const startingValue = Number(startingAmount || 0);
  const monthsUntilTarget = targetDate
    ? Math.max(1, (Number(targetDate.slice(0, 4)) - new Date().getFullYear()) * 12 + Number(targetDate.slice(5, 7)) - (new Date().getMonth() + 1))
    : 0;
  const monthlyAmount = monthsUntilTarget > 0 && Number.isFinite(targetValue) && Number.isFinite(startingValue)
    ? Math.max(0, (targetValue - startingValue) / monthsUntilTarget)
    : 0;
  const PreviewIcon = iconOptions.find((option) => option.value === icon)?.Icon ?? Laptop;
  const previewProgress = targetValue > 0 ? Math.max(0, Math.min(100, startingValue / targetValue * 100)) : 0;

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

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <View className="flex-1 px-4">
      <View className="flex-row items-center pt-1">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white"><ArrowLeft size={18} color={colors.primary} /></Pressable>
        <View><Text className="text-[8px] font-semibold uppercase tracking-[1px] text-muted">Make a plan for your future</Text><Text className="mt-0.5 text-[17px] font-bold tracking-tight text-primary">{isEditing ? 'Edit your goal' : 'Create a savings goal'}</Text></View>
      </View>
      <Text className="ml-1 mt-1 text-[10px] text-muted">{isEditing ? 'Update your target and details.' : 'Give your savings something to move toward.'}</Text>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="pb-4">
        <Text className="mb-2 mt-4 text-[10px] font-bold text-primary">Choose a goal type</Text>
        <View className="flex-row justify-between gap-1.5">
          {iconOptions.map(({ value, Icon }) => {
            const selected = icon === value;
            return <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} icon`} accessibilityState={{ selected }} onPress={() => setIcon(value)} className={`min-h-[58px] flex-1 items-center justify-center rounded-[13px] border ${selected ? 'border-primary bg-[#EEF1FF]' : 'border-white bg-white'}`}><Icon size={16} color={selected ? colors.primary : '#8190AE'} strokeWidth={1.5} /><Text className={`mt-1 text-[7px] capitalize ${selected ? 'font-bold text-primary' : 'text-muted'}`}>{value === 'travel' ? 'Travel' : value}</Text></Pressable>;
          })}
        </View>

        <LinearGradient colors={['#243B6B', '#3D5797']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="mt-3 flex-row items-center justify-between overflow-hidden rounded-[19px] px-4 py-3.5">
          <View className="flex-1 pr-2"><Text className="text-[8px] font-semibold uppercase tracking-[1px] text-white/65">GOAL PREVIEW</Text><Text numberOfLines={1} className="mt-1 text-[13px] font-bold text-white">{name.trim() || 'Your next big thing'}</Text><Text className="mt-1 text-[9px] text-white/75">Target · {targetValue > 0 ? formatMoney(targetValue, currency) : 'Set your amount'}</Text><View className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-white/20"><View className="h-full rounded-full bg-[#BFC9FF]" style={{ width: `${previewProgress}%` }} /></View><Text className="mt-1 text-[7px] text-white/65">{startingValue > 0 ? `${Math.floor(previewProgress)}% already saved` : 'Your progress begins with the first contribution'}</Text></View>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><PreviewIcon size={22} color="white" strokeWidth={1.6} /></View>
        </LinearGradient>

        <Field label="Goal name">
          <TextInput value={name} onChangeText={setName} placeholder="New laptop" placeholderTextColor="#68758F" maxLength={100} returnKeyType="next" className="h-[42px] rounded-[11px] border border-[#E5E8EF] bg-white px-3 text-[11px] text-ink" />
        </Field>
        <Field label="Target amount">
          <TextInput value={target} onChangeText={setTarget} placeholder={formatMoney(1800, currency)} placeholderTextColor="#68758F" keyboardType="decimal-pad" className="h-[42px] rounded-[11px] border border-[#E5E8EF] bg-white px-3 text-[11px] text-ink" />
        </Field>
        <Field label="Target date · Optional">
          <Pressable accessibilityRole="button" accessibilityLabel="Choose target date" onPress={() => setShowDatePicker(true)} className="h-[42px] flex-row items-center justify-between rounded-[11px] border border-[#E5E8EF] bg-white px-3">
            <Text className={`text-[11px] ${targetDate ? 'text-ink' : 'text-muted'}`}>{targetDate ? formatDate(targetDate) : 'Choose a date'}</Text><CalendarDays size={15} color={colors.primary} />
          </Pressable>
        </Field>
        {!isEditing && <Field label="Starting amount">
          <TextInput value={startingAmount} onChangeText={setStartingAmount} placeholder="0.00" placeholderTextColor="#68758F" keyboardType="decimal-pad" className="h-[42px] rounded-[11px] border border-[#E5E8EF] bg-white px-3 text-[11px] text-ink" />
          <Text className="mt-1.5 text-[8px] text-muted">Already saved? Record it without counting it as income.</Text>
        </Field>}

        <View className="mt-3 rounded-[16px] border border-[#E5E9FF] bg-[#EEF0FF] px-3.5 py-3">
          <Text className="text-[10px] font-bold text-primary">A clear path to your goal</Text>
          {targetDate && monthlyAmount > 0 ? <Text className="mt-1 text-[9px] leading-[14px] text-ink">{formatMoney(monthlyAmount, currency, 0)} a month for the next {monthsUntilTarget} month{monthsUntilTarget === 1 ? '' : 's'} will get you to {formatMoney(targetValue, currency, 0)} by {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${targetDate}T12:00:00`))}.</Text>
            : targetDate && targetValue > 0 && startingValue >= targetValue ? <Text className="mt-1 text-[9px] leading-[14px] text-ink">Your starting amount already meets this target. You can adjust your target anytime.</Text>
              : <Text className="mt-1 text-[9px] leading-[14px] text-ink">Choose a target amount and date to see a monthly savings plan.</Text>}
        </View>

        <View className="mt-4 flex-row items-center justify-between rounded-[15px] bg-white px-3.5 py-3">
          <View><Text className="text-[10px] font-medium text-ink">Monthly saving reminder</Text><Text className="mt-0.5 text-[8px] text-muted">On the 1st · A nudge, not an auto-transfer.</Text></View>
          <Switch value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ false: '#D6DBE6', true: '#243B6B' }} thumbColor="#FFFFFF" ios_backgroundColor="#D6DBE6" />
        </View>

        {create.isError && <View className="mt-3"><FormBanner message={getErrorMessage(create.error)} /></View>}

        {existing.isError && <View className="mt-3"><FormBanner message={getErrorMessage(existing.error)} /></View>}
        <Pressable accessibilityRole="button" disabled={create.isPending || !name.trim() || !target.trim() || (isEditing && existing.isPending)} onPress={submit} className="mt-4 h-[49px] flex-row items-center justify-center gap-2 rounded-[14px] bg-primary shadow-sm shadow-primary/20 active:opacity-80"><Text className="text-[11px] font-bold text-white">{create.isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create my goal'}</Text>{!create.isPending && <Flag size={14} color="white" />}</Pressable>
        <Text className="mt-3 text-center text-[8px] text-muted">Your targets are flexible. Adjust them whenever life changes.</Text>
      </ScrollView>
    </View>

    {showDatePicker && <DateTimePicker value={targetDate ? new Date(`${targetDate}T12:00:00`) : new Date(Date.now() + 86400000)} onValueChange={(_event, date) => { setShowDatePicker(false); if (date) setTargetDate(dateToString(date)); }} onDismiss={() => setShowDatePicker(false)} mode="date" presentation="dialog" minimumDate={new Date()} accentColor={colors.primary} />}
  </SafeAreaView>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View className="mt-3"><Text className="mb-1.5 text-[10px] font-semibold text-ink">{label}</Text>{children}</View>;
}
