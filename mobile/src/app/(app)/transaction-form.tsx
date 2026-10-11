import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { transactionApi, type TransactionCategory, type TransactionDetails, type TransactionInput } from '@/features/dashboard/api';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const paymentMethods = ['cash', 'gcash', 'maya', 'card', 'bank_transfer', 'other'] as const;
const todayString = (timezone?: string) => {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now);
    const part = (type: string) => parts.find((value) => value.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
  const categories = useQuery({ queryKey: ['categories', type], queryFn: () => transactionApi.categories(type) });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="px-5 pb-8">
        <View className="flex-row items-center pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center">
            <ArrowLeft size={18} color={colors.primary} />
          </Pressable>
          <Text className="text-[17px] font-bold text-primary">{id ? 'Edit transaction' : `Add ${type}`}</Text>
        </View>

        {detail.isError && <View className="mt-3"><FormBanner message={getErrorMessage(detail.error)} /></View>}
        {categories.isError && <View className="mt-3"><FormBanner message={getErrorMessage(categories.error)} /></View>}
        {(detail.isPending || categories.isPending) ? (
          <Text className="mt-6 text-center text-xs text-muted">Loading form…</Text>
        ) : (
          <TransactionFields
            key={`${type}-${id ?? 'new'}`}
            type={type}
            id={id}
            initial={detail.data}
            categories={categories.data ?? []}
            today={todayString(user?.timezone)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TransactionFields({
  type,
  id,
  initial,
  categories,
  today,
}: {
  type: 'expense' | 'income';
  id?: number;
  initial?: TransactionDetails;
  categories: TransactionCategory[];
  today: string;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [date, setDate] = useState(type === 'expense' ? initial?.spent_on ?? today : initial?.received_on ?? today);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category.id ?? categories[0]?.id ?? null);
  const initialPaymentMethod = initial?.payment_method;
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>(
    paymentMethods.find((method) => method === initialPaymentMethod) ?? 'cash',
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const validationMessage = !description.trim() || !amount.trim() || !date.trim() || !categoryId
    ? 'Enter a description, amount, date, and category.'
    : undefined;

  const save = useMutation({
    mutationFn: () => {
      if (!categoryId) throw new Error('Choose a category to continue.');
      const input: TransactionInput = {
        category_id: categoryId,
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
      <View className="mt-4 rounded-[20px] bg-card p-4">
        <Field label="Description">
          <TextInput value={description} onChangeText={setDescription} placeholder="What was this for?" placeholderTextColor={colors.textSecondary} maxLength={150} className="h-11 rounded-xl border border-border px-3 text-[12px] text-ink" />
        </Field>
        <Field label="Amount">
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" className="h-11 rounded-xl border border-border px-3 text-[16px] font-semibold text-primary" />
        </Field>
        <Field label="Category">
          <View className="flex-row flex-wrap gap-2">
            {categories.map((category) => {
              const selected = category.id === categoryId;
              return <Pressable key={category.id} onPress={() => setCategoryId(category.id)} className={`rounded-xl px-3 py-2 ${selected ? 'bg-primary' : 'bg-background'}`}><Text className={`text-[10px] font-medium ${selected ? 'text-white' : 'text-primary'}`}>{category.name}</Text></Pressable>;
            })}
          </View>
        </Field>
        <Field label="Date">
          <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} autoCapitalize="none" className="h-11 rounded-xl border border-border px-3 text-[12px] text-ink" />
          <Text className="mt-1 text-[9px] text-muted">Use YYYY-MM-DD format.</Text>
        </Field>
        {type === 'expense' && (
          <Field label="Payment method">
            <View className="flex-row flex-wrap gap-2">
              {paymentMethods.map((method) => {
                const selected = paymentMethod === method;
                const label = method.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
                return <Pressable key={method} onPress={() => setPaymentMethod(method)} className={`rounded-xl px-3 py-2 ${selected ? 'bg-primary' : 'bg-background'}`}><Text className={`text-[10px] font-medium ${selected ? 'text-white' : 'text-primary'}`}>{label}</Text></Pressable>;
              })}
            </View>
          </Field>
        )}
        <Field label="Note (optional)">
          <TextInput value={notes} onChangeText={setNotes} placeholder="Add a note" placeholderTextColor={colors.textSecondary} multiline maxLength={1000} textAlignVertical="top" className="min-h-20 rounded-xl border border-border px-3 py-2.5 text-[12px] text-ink" />
        </Field>
      </View>

      {validationMessage && attemptedSubmit && <View className="mt-3"><FormBanner message={validationMessage} /></View>}
      {save.isError && <View className="mt-3"><FormBanner message={getErrorMessage(save.error)} /></View>}
      <Pressable disabled={save.isPending} onPress={submit} className="mt-3 h-11 items-center justify-center rounded-xl bg-primary active:opacity-80">
        <Text className="text-[11px] font-semibold text-white">{save.isPending ? 'Saving…' : id ? 'Save changes' : 'Save transaction'}</Text>
      </Pressable>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View className="mb-4"><Text className="mb-1.5 text-[10px] font-medium text-muted">{label}</Text>{children}</View>;
}
