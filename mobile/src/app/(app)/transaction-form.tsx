import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { ArrowLeft, CalendarDays, ChevronDown, Paperclip } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { dashboardApi, transactionApi, type TransactionDetails, type TransactionInput } from '@/features/dashboard/api';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const paymentMethods = ['cash', 'gcash', 'maya', 'card', 'bank_transfer', 'other'] as const;

const todayString = (timezone?: string) => {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find((value) => value.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
};

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatMoney = (amount: string | number | undefined, currency: string) => {
  if (amount === undefined || amount === '') return `0.00 ${currency}`;
  const value = Number(amount);
  if (!Number.isFinite(value)) return `0.00 ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

export default function TransactionFormScreen() {
  useStatusBarStyle('dark');
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const type: 'expense' | 'income' = params.type === 'income' ? 'income' : 'expense';
  const user = useAuthStore((state) => state.user);
  const rawId = params.id ? Number(params.id) : undefined;
  const id = Number.isInteger(rawId) && Number(rawId) > 0 ? Number(rawId) : undefined;
  const detail = useQuery({
    queryKey: ['transaction', type, id],
    queryFn: () => transactionApi.get(type, id!),
    enabled: Boolean(id),
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-4 pb-7">
        <View className="flex-row items-center pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-1 h-9 w-9 items-center justify-center">
            <ArrowLeft size={18} color={colors.primary} />
          </Pressable>
          <View>
            <Text className="text-[17px] font-bold text-primary">{id ? `Edit ${type}` : `Add ${type}`}</Text>
            <Text className="mt-0.5 text-[9px] text-muted">{id ? 'Update your transaction details' : 'New transaction · Not saved yet'}</Text>
          </View>
        </View>

        {detail.isError && <View className="mt-3"><FormBanner message={getErrorMessage(detail.error)} /></View>}
        {id && detail.isPending ? (
          <Text className="mt-8 text-center text-xs text-muted">Loading transaction…</Text>
        ) : (
          <TransactionFields key={`${type}-${id ?? 'new'}`} initialType={type} id={id} initial={detail.data} timezone={user?.timezone} currency={user?.currency ?? 'USD'} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TransactionFields({
  initialType,
  id,
  initial,
  timezone,
  currency,
}: {
  initialType: 'expense' | 'income';
  id?: number;
  initial?: TransactionDetails;
  timezone?: string;
  currency: string;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState(initialType);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [date, setDate] = useState(initial?.spent_on ?? initial?.received_on ?? todayString(timezone));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category.id ?? null);
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>(
    paymentMethods.find((method) => method === initial?.payment_method) ?? 'cash',
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const categories = useQuery({ queryKey: ['categories', type], queryFn: () => transactionApi.categories(type) });
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
  const selectedCategoryId = categoryId ?? categories.data?.[0]?.id ?? null;
  const selectedCategory = categories.data?.find((category) => category.id === selectedCategoryId);
  const budgetLimit = dashboard.data?.budget?.category_limits.find((limit) => limit.category_id === selectedCategoryId);
  const categoryLeft = budgetLimit ? Number(budgetLimit.limit) - Number(budgetLimit.spent) : undefined;
  const dateValue = new Date(`${date}T12:00:00`);
  const displayDate = Number.isNaN(dateValue.getTime())
    ? date
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(dateValue);
  const invalidAmount = !amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount.trim());
  const validationMessage = !description.trim() || invalidAmount || !date.trim() || !selectedCategoryId
    ? 'Enter a description, a valid amount, date, and category.'
    : undefined;

  const save = useMutation({
    mutationFn: () => {
      if (!selectedCategoryId) throw new Error('Choose a category to continue.');
      const input: TransactionInput = {
        category_id: selectedCategoryId,
        amount: amount.trim(),
        description: description.trim(),
        notes: notes.trim() || null,
        ...(type === 'expense' ? { spent_on: date, payment_method: paymentMethod } : { received_on: date }),
      };
      return transactionApi.save(type, input, id);
    },
    onSuccess: async (transaction) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['budget'] }),
        queryClient.invalidateQueries({ queryKey: ['transaction', type, transaction.id] }),
      ]);
      if (id) router.back();
      else router.replace({ pathname: '/transaction-details', params: { type, id: String(transaction.id) } });
    },
  });

  const submit = () => {
    setAttemptedSubmit(true);
    if (!validationMessage) save.mutate();
  };

  return (
    <>
      {!id && (
        <View className="mt-3 flex-row rounded-xl bg-card p-1">
          {(['expense', 'income'] as const).map((option) => {
            const active = type === option;
            return <Pressable key={option} accessibilityRole="button" onPress={() => { setType(option); setCategoryId(null); setShowCategories(false); }} className={`h-9 flex-1 items-center justify-center rounded-lg ${active ? 'bg-primary' : ''}`}>
              <Text className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>{option === 'expense' ? 'Expense' : 'Income'}</Text>
            </Pressable>;
          })}
        </View>
      )}

      <View className="mt-3 rounded-[18px] bg-accent-light px-4 py-3.5">
        <Text className="text-[9px] font-medium text-primary">{type === 'expense' ? 'Expense' : 'Income'} amount · {currency}</Text>
        <View className="mt-1 flex-row items-center">
          <Text className="mr-1 text-[26px] font-bold text-primary">{currencySymbol(currency)}</Text>
          <TextInput accessibilityLabel="Transaction amount" value={amount} onChangeText={(value) => { setAmount(value.replace(',', '.')); save.reset(); }} placeholder="0.00" placeholderTextColor="#8692B0" keyboardType="decimal-pad" className="flex-1 py-0 text-[26px] font-bold tracking-tight text-primary" />
        </View>
      </View>

      <View className="mt-3">
        <Field label="Merchant or description">
          <TextInput value={description} onChangeText={(value) => { setDescription(value); save.reset(); }} placeholder="What was this for?" placeholderTextColor={colors.textSecondary} maxLength={150} className="h-10 rounded-xl border border-border bg-white px-3 text-[11px] text-ink" />
        </Field>

        <Field label="Category">
          <Pressable accessibilityRole="button" onPress={() => setShowCategories((shown) => !shown)} className="h-10 flex-row items-center justify-between rounded-xl border border-border bg-white px-3">
            <Text className={`text-[11px] ${selectedCategory ? 'text-ink' : 'text-muted'}`}>{categories.isPending ? 'Loading categories…' : selectedCategory?.name ?? 'Choose a category'}</Text>
            <ChevronDown size={15} color={colors.primary} />
          </Pressable>
          {showCategories && categories.data && (
            <View className="mt-1 rounded-xl border border-border bg-white p-1">
              {categories.data.map((category) => <Pressable key={category.id} onPress={() => { setCategoryId(category.id); setShowCategories(false); }} className={`rounded-lg px-3 py-2.5 ${category.id === selectedCategoryId ? 'bg-accent-light' : ''}`}><Text className="text-[11px] text-primary">{category.name}</Text></Pressable>)}
            </View>
          )}
          {budgetLimit && <Text className="mt-1.5 text-[8px] text-muted">{formatMoney(categoryLeft, currency)} left in {selectedCategory?.name} budget.</Text>}
          {categories.isError && <Text className="mt-1.5 text-[9px] text-error">Couldn’t load categories. Pull down to retry.</Text>}
          {!categories.isPending && !categories.isError && categories.data?.length === 0 && <Text className="mt-1.5 text-[9px] text-error">No {type} categories are available yet.</Text>}
        </Field>

        <View className="flex-row gap-2">
          <Field label="Date" className="flex-1">
            <Pressable accessibilityRole="button" onPress={() => setShowDatePicker(true)} className="h-10 flex-row items-center justify-between rounded-xl border border-border bg-white px-2.5">
              <Text numberOfLines={1} className="text-[10px] text-ink">{displayDate}</Text><CalendarDays size={14} color={colors.primary} />
            </Pressable>
          </Field>
          {type === 'expense' && (
            <Field label="Payment" className="flex-1">
              <Pressable accessibilityRole="button" onPress={() => setShowPayments((shown) => !shown)} className="h-10 flex-row items-center justify-between rounded-xl border border-border bg-white px-2.5">
                <Text numberOfLines={1} className="text-[10px] text-ink">{paymentMethod === 'card' ? 'Debit · 4821' : paymentMethodLabel(paymentMethod)}</Text><ChevronDown size={14} color={colors.primary} />
              </Pressable>
            </Field>
          )}
        </View>
        {showPayments && type === 'expense' && (
          <View className="-mt-1 mb-3 rounded-xl border border-border bg-white p-1">
            {paymentMethods.map((method) => <Pressable key={method} onPress={() => { setPaymentMethod(method); setShowPayments(false); }} className={`rounded-lg px-3 py-2.5 ${method === paymentMethod ? 'bg-accent-light' : ''}`}><Text className="text-[10px] text-primary">{paymentMethodLabel(method)}</Text></Pressable>)}
          </View>
        )}

        {type === 'expense' && (
          <Field label="From account">
            <View className="h-10 flex-row items-center justify-between rounded-xl border border-border bg-white px-3">
              <Text className="text-[10px] text-ink">Everyday account{dashboard.data ? ` · ${formatMoney(dashboard.data.available_balance, currency)}` : ''}</Text>
              <ChevronDown size={14} color={colors.primary} />
            </View>
          </Field>
        )}

        <Field label="Note · Optional">
          <TextInput value={notes} onChangeText={setNotes} placeholder="Add a note" placeholderTextColor={colors.textSecondary} multiline maxLength={1000} textAlignVertical="top" className="min-h-10 rounded-xl border border-border bg-white px-3 py-2.5 text-[10px] text-ink" />
        </Field>

        <Pressable onPress={() => Alert.alert('Receipt attachment', 'Receipt uploads are not available yet.')} className="h-10 flex-row items-center gap-2 rounded-xl border border-dashed border-border bg-white px-3">
          <Paperclip size={14} color={colors.primary} /><Text className="text-[10px] font-medium text-primary">Attach receipt</Text><Text className="text-[8px] text-muted">Optional · Coming soon</Text>
        </Pressable>

        {type === 'expense' && (
          <View className="mt-3 flex-row items-center justify-between py-1">
            <View><Text className="text-[10px] text-ink">Repeat this expense</Text><Text className="mt-0.5 text-[8px] text-muted">Recurring expenses aren’t available yet.</Text></View>
            <View className="h-5 w-9 justify-center rounded-full border border-muted px-0.5"><View className="h-3.5 w-3.5 rounded-full bg-muted" /></View>
          </View>
        )}

        {validationMessage && attemptedSubmit && <View className="mt-2"><FormBanner message={validationMessage} /></View>}
        {categories.isError && <View className="mt-2"><FormBanner message={getErrorMessage(categories.error)} /></View>}
        {save.isError && <View className="mt-2"><FormBanner message={getErrorMessage(save.error)} /></View>}

        <Pressable disabled={save.isPending || categories.isPending || !categories.data?.length} onPress={submit} className="mt-3 h-11 flex-row items-center justify-center rounded-xl bg-primary active:opacity-80">
          <Text className="text-[10px] font-semibold text-white">{save.isPending ? 'Saving…' : `Save ${type} · ${formatMoney(amount || 0, currency)}`}</Text>
        </Pressable>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={Number.isNaN(dateValue.getTime()) ? new Date() : dateValue}
          onValueChange={(_event, selectedDate) => { setShowDatePicker(false); setDate(toDateString(selectedDate)); }}
          onDismiss={() => setShowDatePicker(false)}
          mode="date"
          presentation="dialog"
          maximumDate={new Date()}
          accentColor={colors.primary}
        />
      )}
    </>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <View className={`mb-3 ${className}`}><Text className="mb-1.5 text-[9px] font-semibold text-ink">{label}</Text>{children}</View>;
}

function paymentMethodLabel(method: (typeof paymentMethods)[number]) {
  return method.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function currencySymbol(currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? `${currency} `;
  } catch {
    return `${currency} `;
  }
}
