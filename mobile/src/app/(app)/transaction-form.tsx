import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarDays, Check, ChevronDown, CreditCard, FileText, Paperclip, Tag, WalletCards } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { accountApi, dashboardApi, transactionApi, type TransactionDetails, type TransactionInput } from '@/features/dashboard/api';
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
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8">
        <View className="flex-row items-center pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-card">
            <ArrowLeft size={19} color={colors.primary} />
          </Pressable>
          <View>
            <Text className="text-[19px] font-bold capitalize tracking-tight text-primary">{id ? `Edit ${type}` : `Add ${type}`}</Text>
            <Text className="mt-0.5 text-[11px] text-muted">{id ? 'Update the details below' : 'Record money in or money out'}</Text>
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
  const [accountId, setAccountId] = useState<number | null>(initial?.account_id ?? null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const categories = useQuery({ queryKey: ['categories', type], queryFn: () => transactionApi.categories(type) });
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list });
  const selectedAccountId = accountId ?? accounts.data?.find((account) => account.is_default)?.id ?? accounts.data?.[0]?.id ?? null;
  const selectedAccount = accounts.data?.find((account) => account.id === selectedAccountId);
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
      if (!selectedAccountId) throw new Error('Choose an account to continue.');
      const input: TransactionInput = {
        account_id: selectedAccountId,
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
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
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
        <View className="mt-5 flex-row rounded-2xl border border-border bg-white p-1.5">
          {(['expense', 'income'] as const).map((option) => {
            const active = type === option;
            const Icon = option === 'expense' ? ArrowUpRight : ArrowDownLeft;
            return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { setType(option); setCategoryId(null); setShowCategories(false); }} className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${active ? 'bg-primary' : ''}`}>
              <Icon size={15} color={active ? '#FFFFFF' : colors.textSecondary} />
              <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-muted'}`}>{option === 'expense' ? 'Expense' : 'Income'}</Text>
              {active && <Check size={13} color="#FFFFFF" />}
            </Pressable>;
          })}
        </View>
      )}

      <View className="mt-4 overflow-hidden rounded-[26px] bg-primary px-5 pb-5 pt-4">
        <View pointerEvents="none" className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/[0.06]" />
        <View pointerEvents="none" className="absolute -bottom-20 right-16 h-32 w-32 rounded-full bg-white/[0.04]" />
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/10">
              {type === 'expense' ? <ArrowUpRight size={17} color="#FFD1D5" /> : <ArrowDownLeft size={17} color="#BDF5DC" />}
            </View>
            <Text className="text-[10px] font-semibold uppercase tracking-[1.4px] text-white/75">{type} amount</Text>
          </View>
          <View className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
            <Text className="text-[10px] font-bold tracking-wide text-white">{currency}</Text>
          </View>
        </View>
        <View className="mt-4 flex-row items-center border-b border-white/20 pb-3">
          <Text className="mr-2 text-[30px] font-semibold text-white/70">{currencySymbol(currency)}</Text>
          <TextInput accessibilityLabel="Transaction amount" value={amount} onChangeText={(value) => { setAmount(value.replace(',', '.')); save.reset(); }} placeholder="0.00" placeholderTextColor="rgba(255,255,255,0.45)" keyboardType="decimal-pad" className="flex-1 py-0 text-[42px] font-bold tracking-tight text-white" />
        </View>
        <Text className="mt-3 text-[10px] text-white/65">{type === 'expense' ? 'How much did you spend?' : 'How much did you receive?'}</Text>
      </View>

      <View className="mb-2 mt-6 flex-row items-end justify-between">
        <View><Text className="text-[16px] font-bold text-primary">Transaction details</Text><Text className="mt-0.5 text-[10px] text-muted">Add the information you want to remember.</Text></View>
        <View className="mb-0.5 rounded-full bg-accent-light px-2 py-1"><Text className="text-[9px] font-semibold text-primary">{id ? 'EDITING' : 'NEW'}</Text></View>
      </View>

      <View className="rounded-[22px] border border-[#E8EBF3] bg-white px-4 pt-4">
        <Field label={type === 'expense' ? 'Merchant or description' : 'Source or description'} icon={<FileText size={14} color={colors.textSecondary} />}>
          <TextInput value={description} onChangeText={(value) => { setDescription(value); save.reset(); }} placeholder={type === 'expense' ? 'What did you spend on?' : 'Where did this money come from?'} placeholderTextColor={colors.textSecondary} maxLength={150} className="h-12 rounded-[14px] border border-[#E7EAF1] bg-[#FAFBFD] px-3.5 text-[12px] text-ink" />
        </Field>

        <Field label="Category" icon={<Tag size={14} color={colors.textSecondary} />}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCategories }} onPress={() => setShowCategories((shown) => !shown)} className="h-12 flex-row items-center justify-between rounded-[14px] border border-[#E7EAF1] bg-[#FAFBFD] px-3.5">
            <Text className={`flex-1 text-[12px] ${selectedCategory ? 'font-medium text-ink' : 'text-muted'}`}>{categories.isPending ? 'Loading categories…' : selectedCategory?.name ?? 'Choose a category'}</Text>
            <ChevronDown size={16} color={colors.primary} />
          </Pressable>
          {showCategories && categories.data && (
            <View className="mt-1 rounded-[14px] border border-[#E7EAF1] bg-white p-1.5">
              {categories.data.map((category) => <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected: category.id === selectedCategoryId }} onPress={() => { setCategoryId(category.id); setShowCategories(false); }} className={`flex-row items-center justify-between rounded-[10px] px-3.5 py-3 ${category.id === selectedCategoryId ? 'bg-accent-light' : ''}`}><Text className="text-[12px] font-medium text-primary">{category.name}</Text>{category.id === selectedCategoryId && <Check size={14} color={colors.primary} />}</Pressable>)}
            </View>
          )}
          {budgetLimit && <View className="mt-2 flex-row items-center justify-between rounded-xl bg-accent-light/70 px-3 py-2"><Text className="text-[9px] text-primary">Budget left · {selectedCategory?.name}</Text><Text className="text-[10px] font-bold text-primary">{formatMoney(categoryLeft, currency)}</Text></View>}
          {categories.isError && <Pressable onPress={() => void categories.refetch()} className="mt-1.5 self-start"><Text className="text-[10px] font-medium text-error">Couldn’t load categories. Tap to retry.</Text></Pressable>}
          {!categories.isPending && !categories.isError && categories.data?.length === 0 && <Text className="mt-1.5 text-[10px] text-error">No {type} categories are available yet.</Text>}
        </Field>

        <View className="flex-row gap-3">
          <Field label="Date" icon={<CalendarDays size={14} color={colors.textSecondary} />} className="flex-1">
            <Pressable accessibilityRole="button" onPress={() => setShowDatePicker(true)} className="h-12 flex-row items-center justify-between rounded-[14px] border border-[#E7EAF1] bg-[#FAFBFD] px-3">
              <Text numberOfLines={1} className="text-[11px] font-medium text-ink">{displayDate}</Text><CalendarDays size={15} color={colors.primary} />
            </Pressable>
          </Field>
          {type === 'expense' && (
            <Field label="Payment" icon={<CreditCard size={14} color={colors.textSecondary} />} className="flex-1">
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPayments }} onPress={() => setShowPayments((shown) => !shown)} className="h-12 flex-row items-center justify-between rounded-[14px] border border-[#E7EAF1] bg-[#FAFBFD] px-3">
                <Text numberOfLines={1} className="flex-1 text-[10px] font-medium text-ink">{paymentMethod === 'card' ? 'Debit · 4821' : paymentMethodLabel(paymentMethod)}</Text><ChevronDown size={15} color={colors.primary} />
              </Pressable>
            </Field>
          )}
        </View>
        {showPayments && type === 'expense' && (
          <View className="-mt-1 mb-3 rounded-[14px] border border-[#E7EAF1] bg-white p-1.5">
            {paymentMethods.map((method) => <Pressable key={method} accessibilityRole="button" accessibilityState={{ selected: method === paymentMethod }} onPress={() => { setPaymentMethod(method); setShowPayments(false); }} className={`flex-row items-center justify-between rounded-[10px] px-3.5 py-3 ${method === paymentMethod ? 'bg-accent-light' : ''}`}><Text className="text-[11px] font-medium text-primary">{paymentMethodLabel(method)}</Text>{method === paymentMethod && <Check size={14} color={colors.primary} />}</Pressable>)}
          </View>
        )}

        <Field label={type === 'expense' ? 'From account' : 'Deposit to'} icon={<WalletCards size={14} color={colors.textSecondary} />}>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose account" accessibilityState={{ expanded: showAccounts }} onPress={() => setShowAccounts((shown) => !shown)} className="h-12 flex-row items-center justify-between rounded-[14px] border border-[#E7EAF1] bg-[#FAFBFD] px-3.5">
            <Text numberOfLines={1} className="flex-1 text-[11px] font-medium text-ink">{accounts.isPending ? 'Loading accounts…' : selectedAccount ? selectedAccount.name : 'Choose an account'}</Text>
            {selectedAccount && <Text className="mr-2 text-[10px] font-semibold text-muted">{formatMoney(selectedAccount.balance, currency)}</Text>}
            <ChevronDown size={15} color={colors.primary} />
          </Pressable>
          {showAccounts && accounts.data && <View className="mt-1 rounded-[14px] border border-[#E7EAF1] bg-white p-1.5">
            {accounts.data.map((account) => <Pressable key={account.id} accessibilityRole="button" accessibilityState={{ selected: account.id === selectedAccountId }} onPress={() => { setAccountId(account.id); setShowAccounts(false); }} className={`flex-row items-center justify-between rounded-[10px] px-3.5 py-3 ${account.id === selectedAccountId ? 'bg-accent-light' : ''}`}>
              <Text className="text-[11px] font-medium text-primary">{account.name}</Text>
              <View className="flex-row items-center gap-2"><Text className="text-[10px] text-muted">{formatMoney(account.balance, currency)}</Text>{account.id === selectedAccountId && <Check size={14} color={colors.primary} />}</View>
            </Pressable>)}
          </View>}
          {accounts.isError && <Pressable onPress={() => void accounts.refetch()} className="mt-1.5 self-start"><Text className="text-[9px] font-medium text-error">Couldn’t load accounts. Tap to retry.</Text></Pressable>}
        </Field>
      </View>

      <View className="mb-2 mt-5 flex-row items-end justify-between">
        <View><Text className="text-[15px] font-bold text-primary">Extra details</Text><Text className="mt-0.5 text-[10px] text-muted">Optional, but useful later.</Text></View>
        <Text className="mb-0.5 text-[9px] font-medium text-muted">OPTIONAL</Text>
      </View>
      <View className="rounded-[22px] border border-[#E8EBF3] bg-white p-4">
        <Field label="Note" icon={<FileText size={14} color={colors.textSecondary} />} className="mb-0">
          <TextInput value={notes} onChangeText={setNotes} placeholder="Add a note or reminder" placeholderTextColor={colors.textSecondary} multiline maxLength={1000} textAlignVertical="top" className="min-h-12 rounded-[14px] border border-[#E7EAF1] bg-[#FAFBFD] px-3.5 py-3 text-[11px] text-ink" />
        </Field>

        <Pressable accessibilityRole="button" onPress={() => Alert.alert('Receipt attachment', 'Receipt uploads are not available yet.')} className="mt-3 h-12 flex-row items-center gap-2.5 rounded-[14px] border border-dashed border-[#D8DEEA] bg-[#FAFBFD] px-3.5">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-accent-light"><Paperclip size={14} color={colors.primary} /></View><View className="flex-1"><Text className="text-[10px] font-semibold text-primary">Attach a receipt</Text><Text className="mt-0.5 text-[9px] text-muted">Receipt uploads coming soon</Text></View><ChevronDown size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      {validationMessage && attemptedSubmit && <View className="mt-4"><FormBanner message={validationMessage} /></View>}
      {save.isError && <View className="mt-4"><FormBanner message={getErrorMessage(save.error)} /></View>}

      <Pressable accessibilityRole="button" disabled={save.isPending || categories.isPending || accounts.isPending || !categories.data?.length || !selectedAccountId} onPress={submit} className="mt-5 h-[54px] flex-row items-center justify-center rounded-2xl bg-primary active:opacity-80">
        <Text className="text-[13px] font-bold text-white">{save.isPending ? 'Saving transaction…' : `Save ${type} · ${formatMoney(amount || 0, currency)}`}</Text>
      </Pressable>
      <Text className="mb-2 mt-2 text-center text-[9px] text-muted">Your transaction is saved securely to your PocketPlan account.</Text>

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

function Field({ label, icon, children, className = '' }: { label: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <View className={`mb-4 ${className}`}><View className="mb-2 flex-row items-center gap-1.5">{icon}<Text className="text-[10px] font-semibold text-ink">{label}</Text></View>{children}</View>;
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
