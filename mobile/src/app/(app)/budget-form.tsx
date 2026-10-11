import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { budgetApi, type BudgetItem } from '@/features/dashboard/api';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const frequencies: BudgetItem['frequency'][] = ['daily', 'weekly', 'monthly'];
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

export default function BudgetFormScreen() {
  const queryClient = useQueryClient();
  const currency = useAuthStore((state) => state.user?.currency ?? 'PHP');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<BudgetItem['frequency']>('weekly');
  const [startDate, setStartDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: budgetApi.create,
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['budgets'] }), queryClient.invalidateQueries({ queryKey: ['dashboard'] })]); router.replace('/budgets'); },
    onError: (cause) => setError(getErrorMessage(cause)),
  });
  const submit = () => {
    const value = amount.trim();
    if (!name.trim() || !/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) { setError('Enter a budget name, a positive amount, and a date in YYYY-MM-DD format.'); return; }
    setError(null);
    create.mutate({ name: name.trim(), spending_limit: value, frequency, start_date: startDate });
  };

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow px-5 pb-8">
      <View className="flex-row items-center pt-2"><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center"><ArrowLeft size={19} color={colors.primary} /></Pressable><Text className="text-[19px] font-bold text-primary">Create a budget</Text></View>
      <Text className="mt-1 text-xs text-muted">Choose a spending limit and the dates it covers.</Text>
      <View className="mt-5 rounded-2xl bg-card p-4">
        <Text className="mb-1.5 text-xs font-semibold text-ink">Budget name</Text><TextInput value={name} onChangeText={setName} placeholder="Weekly plan" placeholderTextColor={colors.textSecondary} className="h-12 rounded-xl border border-border bg-white px-3 text-sm text-ink" />
        <Text className="mb-1.5 mt-4 text-xs font-semibold text-ink">Spending limit · {currency}</Text><TextInput value={amount} onChangeText={(value) => setAmount(value.replace(',', '.'))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSecondary} className="h-12 rounded-xl border border-border bg-white px-3 text-lg font-semibold text-primary" />
        <Text className="mb-2 mt-4 text-xs font-semibold text-ink">Budget period</Text><View className="flex-row gap-2">{frequencies.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === frequency }} onPress={() => setFrequency(value)} className={`h-10 flex-1 items-center justify-center rounded-xl ${value === frequency ? 'bg-primary' : 'bg-accent-light'}`}><Text className={`text-xs font-semibold ${value === frequency ? 'text-white' : 'text-primary'}`}>{value[0].toUpperCase() + value.slice(1)}</Text></Pressable>)}</View>
        <Text className="mb-1.5 mt-4 text-xs font-semibold text-ink">Start date</Text><TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} autoCapitalize="none" className="h-12 rounded-xl border border-border bg-white px-3 text-sm text-ink" /><Text className="mt-1.5 text-[10px] text-muted">Use YYYY-MM-DD. This cannot overlap another budget period.</Text>
      </View>
      {error && <View className="mt-4"><FormBanner message={error} /></View>}
      <Button label="Save budget" onPress={submit} loading={create.isPending} className="mt-5" />
    </ScrollView>
  </SafeAreaView>;
}
