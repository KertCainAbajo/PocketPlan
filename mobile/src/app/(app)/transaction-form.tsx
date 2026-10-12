import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  CircleEllipsis,
  CreditCard,
  FileText,
  Landmark,
  Paperclip,
  PiggyBank,
  Smartphone,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/app-alert';
import { CategoryIcon } from '@/components/category-icon';
import { cardShadow, Field, SectionLabel, SettingsCard, SettingsHeader } from '@/components/settings-ui';
import { FormBanner } from '@/components/ui/form-banner';
import { currencySymbol } from '@/features/budgets/period';
import { accountApi, dashboardApi, transactionApi, type TransactionDetails, type TransactionInput } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const paymentMethods = ['cash', 'gcash', 'maya', 'card', 'bank_transfer', 'other'] as const;
type PaymentMethod = (typeof paymentMethods)[number];

const PAYMENT_STYLE: Record<PaymentMethod, { label: string; Icon: LucideIcon }> = {
  cash: { label: 'Cash', Icon: Banknote },
  gcash: { label: 'GCash', Icon: Smartphone },
  maya: { label: 'Maya', Icon: Smartphone },
  card: { label: 'Card', Icon: CreditCard },
  bank_transfer: { label: 'Bank transfer', Icon: Landmark },
  other: { label: 'Other', Icon: CircleEllipsis },
};

/** Expense and income each get their own colour so the form never feels ambiguous. */
const THEME = {
  expense: { gradient: ['#34539A', colors.primary, '#16254A'] as const, accent: '#F87171', glow: colors.accent, tint: colors.accent, tintBg: colors.accentLight, Icon: ArrowUpRight, quick: [50, 100, 200, 500] },
  income: { gradient: ['#22865D', '#166534', '#0F4A27'] as const, accent: '#4ADE80', glow: '#4ADE80', tint: colors.positiveText, tintBg: colors.positive, Icon: ArrowDownLeft, quick: [500, 1000, 1500, 3000] },
};

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

const dayBefore = (date: string) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return toDateString(value);
};

const formatMoney = (amount: string | number | undefined, currency: string, digits = 2) => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  } catch {
    return `${currency} ${value.toFixed(digits)}`;
  }
};

export default function TransactionFormScreen() {
  useStatusBarStyle('dark');
  const params = useLocalSearchParams<{ type?: string; id?: string; categoryId?: string }>();
  const type: 'expense' | 'income' = params.type === 'income' ? 'income' : 'expense';
  const user = useAuthStore((state) => state.user);
  const rawId = params.id ? Number(params.id) : undefined;
  const id = Number.isInteger(rawId) && Number(rawId) > 0 ? Number(rawId) : undefined;
  const rawCategoryId = params.categoryId ? Number(params.categoryId) : undefined;
  const categoryId = Number.isInteger(rawCategoryId) && Number(rawCategoryId) > 0 ? Number(rawCategoryId) : undefined;
  const detail = useQuery({
    queryKey: ['transaction', type, id],
    queryFn: () => transactionApi.get(type, id!),
    enabled: Boolean(id),
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-10">
        <SettingsHeader
          title={id ? `Edit ${type}` : 'New transaction'}
          subtitle={id ? 'Update the details below.' : 'Record money going out or coming in.'}
        />

        {detail.isError && <View className="mt-4"><FormBanner message={getErrorMessage(detail.error)} /></View>}
        {id && detail.isPending ? (
          <View className="mt-10 items-center"><ActivityIndicator color={colors.accent} /></View>
        ) : (
          <TransactionFields key={`${type}-${id ?? 'new'}-${categoryId ?? ''}`} initialType={type} id={id} initial={detail.data} initialCategoryId={categoryId} timezone={user?.timezone} currency={user?.currency ?? 'PHP'} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TransactionFields({
  initialType,
  id,
  initial,
  initialCategoryId,
  timezone,
  currency,
}: {
  initialType: 'expense' | 'income';
  id?: number;
  initial?: TransactionDetails;
  initialCategoryId?: number;
  timezone?: string;
  currency: string;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState(initialType);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [date, setDate] = useState(initial?.spent_on ?? initial?.received_on ?? todayString(timezone));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category.id ?? initialCategoryId ?? null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods.find((method) => method === initial?.payment_method) ?? 'cash');
  const [accountId, setAccountId] = useState<number | null>(initial?.account_id ?? null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const theme = THEME[type];
  const categories = useQuery({ queryKey: ['categories', type], queryFn: () => transactionApi.categories(type) });
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list });
  const selectedAccountId = accountId ?? accounts.data?.find((account) => account.is_default)?.id ?? accounts.data?.[0]?.id ?? null;
  const selectedCategoryId = categoryId ?? categories.data?.[0]?.id ?? null;
  const selectedCategory = categories.data?.find((category) => category.id === selectedCategoryId);
  const budgetLimit = type === 'expense' ? dashboard.data?.budget?.category_limits.find((limit) => limit.category_id === selectedCategoryId) : undefined;
  const categoryLeft = budgetLimit ? Number(budgetLimit.limit) - Number(budgetLimit.spent) : undefined;
  const today = todayString(timezone);
  const yesterday = dayBefore(today);
  const dateValue = new Date(`${date}T12:00:00`);
  const displayDate = Number.isNaN(dateValue.getTime())
    ? date
    : new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(dateValue);
  const invalidAmount = !amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount.trim());
  const validationMessage = invalidAmount
    ? 'Enter an amount above zero.'
    : !description.trim()
      ? `Add a short description of this ${type}.`
      : !date.trim() || !selectedCategoryId
        ? 'Choose a category and date.'
        : undefined;
  const afterThis = categoryLeft !== undefined && !invalidAmount ? categoryLeft - Number(amount) : undefined;

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

  const switchType = (next: 'expense' | 'income') => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
    save.reset();
  };

  return (
    <>
      {/* Expense / income switch */}
      {!id && (
        <View style={cardShadow} className="mt-5 flex-row rounded-2xl bg-card p-1.5">
          {(['expense', 'income'] as const).map((option) => {
            const active = type === option;
            const Icon = THEME[option].Icon;
            return (
              <Pressable
                key={option}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => switchType(option)}
                className={`h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${active ? (option === 'expense' ? 'bg-primary' : 'bg-positive-text') : ''}`}>
                <Icon size={17} color={active ? '#FFFFFF' : colors.textSecondary} strokeWidth={2.4} />
                <Text className={`text-[14px] font-bold ${active ? 'text-white' : 'text-muted'}`}>{option === 'expense' ? 'Expense' : 'Income'}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Amount */}
      <View className="mt-4 overflow-hidden rounded-[28px]">
        <LinearGradient colors={theme.gradient} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
          <View pointerEvents="none" className="absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-25" style={{ backgroundColor: theme.glow }} />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                <theme.Icon size={17} color={theme.accent} strokeWidth={2.4} />
              </View>
              <Text className="text-[12px] font-semibold uppercase tracking-[1.2px] text-white/70">{type === 'expense' ? 'Money out' : 'Money in'}</Text>
            </View>
            <View className="rounded-full bg-white/15 px-2.5 py-1">
              <Text className="text-[11px] font-bold text-white">{currency}</Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center">
            <Text className="mr-1.5 text-[34px] font-bold text-white/70">{currencySymbol(currency)}</Text>
            <TextInput
              accessibilityLabel="Transaction amount"
              value={amount}
              onChangeText={(value) => { setAmount(value.replace(',', '.').replace(/[^\d.]/g, '')); save.reset(); }}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="decimal-pad"
              selectionColor="white"
              className="flex-1 py-0 text-[46px] font-extrabold tracking-tight text-white"
            />
          </View>
          <Text className="mt-1 text-[13px] text-white/65">{type === 'expense' ? 'How much did you spend?' : 'How much did you receive?'}</Text>

          <View className="mt-4 flex-row gap-2">
            {theme.quick.map((value) => {
              const selected = Number(amount) === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => { setAmount(value.toFixed(2)); save.reset(); }}
                  className={`flex-1 items-center rounded-xl border py-2 ${selected ? 'border-white bg-white' : 'border-white/15 bg-white/10'}`}>
                  <Text className={`text-[12px] font-bold ${selected ? 'text-primary' : 'text-white'}`}>{formatMoney(value, currency, 0)}</Text>
                </Pressable>
              );
            })}
          </View>
        </LinearGradient>
      </View>

      {/* What */}
      <SettingsCard className="mt-4 px-4 pb-5 pt-1">
        <Field
          label={type === 'expense' ? 'What was it for?' : 'Where did it come from?'}
          Icon={FileText}
          value={description}
          onChangeText={(value) => { setDescription(value); save.reset(); }}
          placeholder={type === 'expense' ? 'e.g. Lunch at the canteen' : 'e.g. Weekly allowance'}
          maxLength={150}
          error={attemptedSubmit && !description.trim() ? 'Add a short description.' : undefined}
        />
      </SettingsCard>

      {/* Category */}
      <SectionLabel>Category</SectionLabel>
      {categories.isPending ? (
        <SettingsCard className="items-center p-6"><ActivityIndicator color={colors.accent} /></SettingsCard>
      ) : categories.isError ? (
        <Pressable onPress={() => void categories.refetch()}><FormBanner message="Couldn’t load categories. Tap to retry." /></Pressable>
      ) : categories.data?.length ? (
        <View className="flex-row flex-wrap gap-2.5">
          {categories.data.map((category) => {
            const selected = category.id === selectedCategoryId;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="radio"
                accessibilityLabel={category.name}
                accessibilityState={{ checked: selected }}
                onPress={() => { setCategoryId(category.id); save.reset(); }}
                style={[cardShadow, { width: '31%' }]}
                className={`items-center rounded-2xl border-2 bg-card px-1.5 py-3 ${selected ? (type === 'expense' ? 'border-accent' : 'border-positive-text') : 'border-transparent'}`}>
                <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: selected ? theme.tintBg : colors.background }}>
                  <CategoryIcon icon={category.icon} size={19} color={selected ? theme.tint : colors.textSecondary} strokeWidth={2} />
                </View>
                <Text numberOfLines={1} className={`mt-1.5 text-center text-[11px] ${selected ? 'font-bold text-ink' : 'font-semibold text-muted'}`}>{category.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <FormBanner message={`No ${type} categories are available yet.`} tone="info" />
      )}
      {budgetLimit && categoryLeft !== undefined && (
        <View className={`mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3 ${afterThis !== undefined && afterThis < 0 ? 'bg-error-bg' : 'bg-accent-light'}`}>
          <View className="flex-1 pr-2">
            <Text className="text-[12px] font-semibold text-primary">{selectedCategory?.name} budget</Text>
            <Text className="mt-0.5 text-[11px] text-muted">{formatMoney(categoryLeft, currency)} left this period</Text>
          </View>
          {afterThis !== undefined && (
            <View className="items-end">
              <Text className="text-[11px] text-muted">After this</Text>
              <Text className={`text-[14px] font-bold ${afterThis < 0 ? 'text-error' : 'text-primary'}`}>{afterThis < 0 ? `−${formatMoney(Math.abs(afterThis), currency)}` : formatMoney(afterThis, currency)}</Text>
            </View>
          )}
        </View>
      )}

      {/* When */}
      <SectionLabel>Date</SectionLabel>
      <View className="flex-row gap-2.5">
        <Chip label="Today" selected={date === today} onPress={() => setDate(today)} />
        <Chip label="Yesterday" selected={date === yesterday} onPress={() => setDate(yesterday)} />
        <Chip
          label={date !== today && date !== yesterday ? displayDate : 'Pick a date'}
          Icon={CalendarDays}
          selected={date !== today && date !== yesterday}
          onPress={() => setShowDatePicker(true)}
          grow
        />
      </View>

      {/* How (expenses only) */}
      {type === 'expense' && (
        <>
          <SectionLabel>Paid with</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {paymentMethods.map((method) => {
              const style = PAYMENT_STYLE[method];
              return <Chip key={method} label={style.label} Icon={style.Icon} selected={method === paymentMethod} onPress={() => setPaymentMethod(method)} />;
            })}
          </View>
        </>
      )}

      {/* Account */}
      <SectionLabel>{type === 'expense' ? 'From account' : 'Deposit to'}</SectionLabel>
      {accounts.isError ? (
        <Pressable onPress={() => void accounts.refetch()}><FormBanner message="Couldn’t load accounts. Tap to retry." /></Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerClassName="gap-2.5 px-5 pb-1">
          {(accounts.data ?? []).map((account) => {
            const selected = account.id === selectedAccountId;
            return (
              <Pressable
                key={account.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setAccountId(account.id)}
                style={cardShadow}
                className={`min-w-[150px] rounded-2xl border-2 bg-card p-3.5 ${selected ? 'border-primary' : 'border-transparent'}`}>
                <View className="flex-row items-center justify-between">
                  <View className={`h-8 w-8 items-center justify-center rounded-xl ${selected ? 'bg-primary' : 'bg-background'}`}>
                    <PiggyBank size={16} color={selected ? '#FFFFFF' : colors.textSecondary} />
                  </View>
                  {selected && <Check size={16} color={colors.primary} strokeWidth={2.6} />}
                </View>
                <Text numberOfLines={1} className="mt-2.5 text-[13px] font-bold text-ink">{account.name}</Text>
                <Text className="mt-0.5 text-[12px] text-muted">{formatMoney(account.balance, currency)}</Text>
              </Pressable>
            );
          })}
          {accounts.isPending && <ActivityIndicator color={colors.accent} />}
        </ScrollView>
      )}

      {/* Extras */}
      <SectionLabel>Extras · Optional</SectionLabel>
      <SettingsCard className="px-4 pb-4 pt-1">
        <Text className="mb-1.5 ml-0.5 mt-4 text-[13px] font-semibold text-ink">Note</Text>
        <TextInput
          accessibilityLabel="Note"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add a note or reminder"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          className="min-h-[84px] rounded-2xl border-[1.5px] border-border bg-background px-3.5 py-3 text-[15px] text-ink"
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => showAlert('Receipt attachment', 'Receipt uploads are coming soon.', undefined, { icon: Paperclip })}
          className="mt-3 flex-row items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-border px-3.5 py-3 active:opacity-70">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-light"><Paperclip size={16} color={colors.primary} /></View>
          <View className="flex-1">
            <Text className="text-[13px] font-semibold text-ink">Attach a receipt</Text>
            <Text className="mt-0.5 text-[11px] text-muted">Coming soon</Text>
          </View>
        </Pressable>
      </SettingsCard>

      {validationMessage && attemptedSubmit && <View className="mt-4"><FormBanner message={validationMessage} /></View>}
      {save.isError && <View className="mt-4"><FormBanner message={getErrorMessage(save.error)} /></View>}

      <Pressable
        accessibilityRole="button"
        disabled={save.isPending || categories.isPending || accounts.isPending || !categories.data?.length || !selectedAccountId}
        onPress={submit}
        style={[cardShadow, { shadowOpacity: 0.22 }]}
        className={`mt-6 h-[56px] flex-row items-center justify-center gap-2 rounded-2xl active:opacity-85 ${type === 'expense' ? 'bg-primary' : 'bg-positive-text'}`}>
        {save.isPending ? <ActivityIndicator color="white" /> : <Check size={18} color="white" strokeWidth={2.6} />}
        <Text className="text-[15px] font-bold text-white">
          {save.isPending ? 'Saving…' : `${id ? 'Save' : 'Add'} ${type} · ${formatMoney(invalidAmount ? 0 : amount, currency)}`}
        </Text>
      </Pressable>

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

function Chip({ label, Icon, selected, onPress, grow = false }: { label: string; Icon?: LucideIcon; selected: boolean; onPress: () => void; grow?: boolean }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={selected ? undefined : cardShadow}
      className={`h-11 flex-row items-center justify-center gap-1.5 rounded-full px-4 ${grow ? 'flex-1' : ''} ${selected ? 'bg-primary' : 'bg-card'}`}>
      {Icon ? <Icon size={15} color={selected ? '#FFFFFF' : colors.textSecondary} /> : null}
      <Text numberOfLines={1} className={`text-[13px] font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
