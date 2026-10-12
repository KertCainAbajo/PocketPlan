import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CalendarDays, CalendarRange, Lock, Sparkles, TriangleAlert } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { budgetApi } from '@/features/dashboard/api';
import { budgetFrequencies, getBudgetFrequencyPreference, type BudgetFrequencyPreference } from '@/features/profile/budget-preferences';
import { daysBetween, endDateFor, fromDateString, longDate, PERIOD_LABEL, PERIOD_WORD, QUICK_AMOUNTS, shortDate, toDateString } from '@/features/budgets/period';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const DEFAULT_NAME = /^(daily|weekly|monthly|yearly) (budget|plan)$/i;

export default function BudgetFormScreen() {
  useStatusBarStyle('dark');
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ budgetId?: string }>();
  const budgetId = Number(params.budgetId);
  const isEditing = Number.isInteger(budgetId) && budgetId > 0;
  const user = useAuthStore((state) => state.user);
  const currency = user?.currency ?? 'PHP';
  const existing = useQuery({ queryKey: ['budget', budgetId], queryFn: () => budgetApi.get(budgetId), enabled: isEditing });

  // Untouched fields show the saved budget (or sensible defaults); anything the student changes replaces them.
  const [typedName, setName] = useState<string | null>(null);
  const [typedAmount, setAmount] = useState<string | null>(null);
  const [pickedFrequency, setFrequency] = useState<BudgetFrequencyPreference | null>(null);
  const [preferredFrequency, setPreferredFrequency] = useState<BudgetFrequencyPreference>('weekly');
  const [pickedStart, setStart] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = existing.data;
  const savedFrequency = saved && saved.frequency !== 'custom' ? saved.frequency as BudgetFrequencyPreference : undefined;
  const frequency = pickedFrequency ?? savedFrequency ?? preferredFrequency;
  const word = PERIOD_WORD[frequency];
  const amount = typedAmount ?? (saved ? Number(saved.spending_limit).toFixed(2) : '');
  const startDate = pickedStart ?? saved?.start_date ?? toDateString(new Date());
  const endDate = endDateFor(startDate, frequency);
  const days = daysBetween(startDate, endDate);
  // Keep auto names in step with the period; a name the student wrote stays as it is.
  const savedName = saved?.name && !DEFAULT_NAME.test(saved.name) ? saved.name : null;
  const name = typedName ?? savedName ?? `${PERIOD_LABEL[frequency]} budget`;

  const value = Number(amount || 0);
  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && value > 0;
  const perDay = validAmount ? value / days : 0;
  const assigned = Math.round((saved?.category_limits ?? []).reduce((sum, item) => sum + Number(item.limit_amount), 0) * 100) / 100;
  const belowAssigned = validAmount && value < assigned;

  const money = (number: number) => {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number); }
    catch { return `${currency} ${number.toFixed(2)}`; }
  };

  useEffect(() => {
    let active = true;
    if (user?.id && !isEditing) void getBudgetFrequencyPreference(user.id).then((preference) => { if (active) setPreferredFrequency(preference); }).catch(() => { /* Keep the weekly fallback if local preferences are unavailable. */ });
    return () => { active = false; };
  }, [user?.id, isEditing]);

  const save = useMutation({
    mutationFn: (input: { name: string; spending_limit: string; frequency: BudgetFrequencyPreference; start_date: string; category_limits?: [] }) =>
      // end_date is left out: the server derives it from the period, exactly as previewed here.
      isEditing ? budgetApi.update(budgetId, input) : budgetApi.create(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['budget', budgetId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      if (isEditing) router.back(); else router.replace('/budgets');
    },
    onError: (cause) => setError(getErrorMessage(cause)),
  });

  const submit = (clearCategories = false) => {
    setError(null);
    if (!validAmount) { setError(`Enter how much you want to spend this ${word}, with up to two decimal places.`); return; }
    if (!name.trim()) { setError('Give your budget a name.'); return; }
    if (belowAssigned && !clearCategories) return;
    save.mutate({ name: name.trim(), spending_limit: amount.trim(), frequency, start_date: startDate, ...(clearCategories ? { category_limits: [] as [] } : {}) });
  };

  const changeFrequency = (next: BudgetFrequencyPreference) => {
    setFrequency(next);
    setError(null);
  };

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:opacity-70"><ArrowLeft size={19} color={colors.primary} /></Pressable>
      <View className="flex-1"><Text className="text-[19px] font-bold text-primary">{isEditing ? 'Change budget' : 'New budget'}</Text><Text className="text-[11px] text-muted">Pick a period, then the exact amount.</Text></View>
    </View>

    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-8">
      {existing.isError && <View className="mt-3"><FormBanner message={getErrorMessage(existing.error)} /></View>}
      {isEditing && existing.isPending ? <View className="mt-4 rounded-3xl bg-card p-6"><Text className="text-center text-xs text-muted">Loading budget…</Text></View> : <>

        {/* Period */}
        <View className="mt-3 flex-row rounded-2xl border border-border bg-card p-1">
          {budgetFrequencies.map((option) => {
            const active = option === frequency;
            return <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => changeFrequency(option)} className={`h-10 flex-1 items-center justify-center rounded-xl ${active ? 'bg-primary' : 'active:bg-accent-light'}`}>
              <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>{PERIOD_LABEL[option]}</Text>
            </Pressable>;
          })}
        </View>

        {/* Amount */}
        <View className="mt-4 overflow-hidden rounded-[28px] bg-primary px-5 pb-5 pt-5">
          <View className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <Text className="text-[10px] font-semibold uppercase tracking-[1.2px] text-white/70">How much for this {word}?</Text>
          <View className="mt-2 flex-row items-end">
            <Text className="mb-3 mr-1 text-[24px] font-bold text-white/80">{money(0).replace(/[\d.,\s]/g, '') || currency}</Text>
            <TextInput accessibilityLabel={`Budget amount per ${word}`} value={amount} onChangeText={(text) => { setAmount(text.replace(',', '.').replace(/[^\d.]/g, '')); setError(null); }} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="rgba(255,255,255,0.35)" selectionColor="white" className="min-w-[60px] flex-1 p-0 text-[40px] font-bold text-white" />
            <Text className="mb-2.5 text-[13px] font-semibold text-white/70">/ {word}</Text>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {QUICK_AMOUNTS[frequency].map((quick) => {
              const active = value === quick;
              return <Pressable key={quick} accessibilityRole="button" onPress={() => { setAmount(quick.toFixed(2)); setError(null); }} className={`rounded-full px-3 py-1.5 ${active ? 'bg-white' : 'bg-white/15 active:bg-white/25'}`}>
                <Text className={`text-[11px] font-semibold ${active ? 'text-primary' : 'text-white'}`}>{money(quick).replace(/\.00$/, '')}</Text>
              </Pressable>;
            })}
          </View>
          <View className="mt-4 flex-row items-center gap-2 border-t border-white/15 pt-3">
            <Sparkles size={13} color="#8BC9B4" />
            <Text className="flex-1 text-[11px] text-white/80">{validAmount ? (frequency === 'daily' ? `${money(value)} to spend today.` : `About ${money(perDay)} a day for ${days} days.`) : `Type the exact amount you want to spend in one ${word}.`}</Text>
          </View>
        </View>

        {/* Dates */}
        <View className="mt-4 rounded-3xl border border-border bg-card p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2"><CalendarRange size={16} color={colors.primary} /><Text className="text-[13px] font-bold text-primary">Dates</Text></View>
            <View className="rounded-full bg-accent-light px-2.5 py-1"><Text className="text-[10px] font-semibold text-primary">{days} {days === 1 ? 'day' : 'days'}</Text></View>
          </View>
          <View className="mt-3 flex-row items-stretch gap-2">
            <Pressable accessibilityRole="button" accessibilityLabel={`Start date ${longDate(startDate)}. Tap to change.`} onPress={() => setShowPicker(true)} className="flex-1 rounded-2xl border border-primary bg-background p-3 active:opacity-70">
              <View className="flex-row items-center gap-1.5"><CalendarDays size={12} color={colors.primary} /><Text className="text-[9px] font-semibold uppercase tracking-wider text-primary">Starts</Text></View>
              <Text className="mt-1.5 text-[14px] font-bold text-ink">{shortDate(startDate)}</Text>
              <Text className="mt-0.5 text-[10px] font-medium text-accent">Tap to change</Text>
            </Pressable>
            <View className="items-center justify-center"><ArrowRight size={15} color={colors.textSecondary} /></View>
            <View accessibilityLabel={`Ends ${longDate(endDate)}, set automatically`} className="flex-1 rounded-2xl bg-background p-3">
              <View className="flex-row items-center gap-1.5"><Lock size={11} color={colors.textSecondary} /><Text className="text-[9px] font-semibold uppercase tracking-wider text-muted">Ends</Text></View>
              <Text className="mt-1.5 text-[14px] font-bold text-ink">{shortDate(endDate)}</Text>
              <Text className="mt-0.5 text-[10px] text-muted">Set automatically</Text>
            </View>
          </View>
          {startDate !== toDateString(new Date()) && <Pressable accessibilityRole="button" onPress={() => setStart(toDateString(new Date()))} className="mt-3 self-start rounded-full bg-accent-light px-3 py-1.5 active:opacity-70"><Text className="text-[10px] font-semibold text-primary">Start today instead</Text></Pressable>}
          <Text className="mt-3 text-[10px] leading-4 text-muted">A {word} from {longDate(startDate)} to {longDate(endDate)}. It can’t overlap another budget.</Text>
        </View>

        {/* Name */}
        <View className="mt-4 rounded-3xl border border-border bg-card p-4">
          <Text className="text-[11px] font-semibold text-ink">Name <Text className="font-normal text-muted">· optional</Text></Text>
          <TextInput value={name} onChangeText={setName} placeholder={`${PERIOD_LABEL[frequency]} budget`} placeholderTextColor={colors.textSecondary} className="mt-2 h-12 rounded-2xl border border-border bg-background px-3.5 text-[13px] text-ink" />
        </View>

        {belowAssigned && <View className="mt-4 rounded-3xl border border-[#F2D3A5] bg-warning-bg p-4">
          <View className="flex-row gap-2.5"><TriangleAlert size={17} color={colors.warningText} /><View className="flex-1">
            <Text className="text-[12px] font-bold text-warning-text">Your categories use more than this</Text>
            <Text className="mt-1 text-[11px] leading-4 text-warning-text">You already assigned {money(assigned)} to categories, but this budget is {money(value)}. Raise the amount, or clear the categories and assign them again.</Text>
          </View></View>
          <View className="mt-3 flex-row gap-2">
            <Pressable accessibilityRole="button" onPress={() => { setAmount(assigned.toFixed(2)); setError(null); }} className="h-10 flex-1 items-center justify-center rounded-xl bg-card active:opacity-70"><Text className="text-[11px] font-semibold text-primary">Use {money(assigned)}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={save.isPending} onPress={() => submit(true)} className="h-10 flex-1 items-center justify-center rounded-xl bg-warning-text active:opacity-80"><Text className="text-[11px] font-semibold text-white">Clear categories & save</Text></Pressable>
          </View>
        </View>}
      </>}

      {error && <View className="mt-4"><FormBanner message={error} /></View>}

      <Pressable accessibilityRole="button" disabled={save.isPending || (isEditing && !saved) || belowAssigned} onPress={() => submit()} className={`mt-5 h-[56px] items-center justify-center rounded-2xl bg-primary active:opacity-80 ${belowAssigned || (isEditing && !saved) ? 'opacity-40' : ''}`}>
        <Text className="text-[14px] font-bold text-white">{save.isPending ? 'Saving…' : validAmount ? `${isEditing ? 'Save' : 'Create'} · ${money(value)} / ${word}` : isEditing ? 'Save changes' : 'Create budget'}</Text>
      </Pressable>
    </ScrollView>

    {showPicker && <DateTimePicker value={fromDateString(startDate)} onValueChange={(_event, date) => { setShowPicker(false); if (date) { setStart(toDateString(date)); setError(null); } }} onDismiss={() => setShowPicker(false)} mode="date" presentation="dialog" accentColor={colors.primary} />}
  </SafeAreaView>;
}
