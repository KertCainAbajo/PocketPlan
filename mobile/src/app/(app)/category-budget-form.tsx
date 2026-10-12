import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Check, ChevronDown, Tag } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { budgetApi, transactionApi } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

export default function CategoryBudgetFormScreen() {
  useStatusBarStyle('dark');
  const params = useLocalSearchParams<{ budgetId?: string; categoryId?: string }>();
  const budgetId = Number(params.budgetId);
  const requestedCategoryId = Number(params.categoryId);
  const queryClient = useQueryClient();
  const currency = useAuthStore((state) => state.user?.currency ?? 'PHP');
  const [categoryId, setCategoryId] = useState<number | null>(Number.isInteger(requestedCategoryId) && requestedCategoryId > 0 ? requestedCategoryId : null);
  const [limit, setLimit] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const budget = useQuery({ queryKey: ['budget', budgetId], queryFn: () => budgetApi.get(budgetId), enabled: Number.isInteger(budgetId) && budgetId > 0 });
  const categories = useQuery({ queryKey: ['categories', 'expense'], queryFn: () => transactionApi.categories('expense') });
  const selected = categories.data?.find((category) => category.id === categoryId);
  const existing = budget.data?.category_limits ?? [];
  const isEditing = existing.some((item) => item.category_id === categoryId);
  const currentSpend = Number(existing.find((item) => item.category_id === categoryId)?.spent ?? 0);
  const categoryTotal = existing.reduce((sum, item) => sum + Number(item.limit_amount), 0);

  useEffect(() => {
    if (!budget.data || !categoryId || limit) return;
    const savedLimit = existing.find((item) => item.category_id === categoryId)?.limit_amount;
    if (savedLimit) setLimit(savedLimit);
  }, [budget.data, categoryId, existing, limit]);

  const save = useMutation({
    mutationFn: async () => {
      if (!budget.data || !categoryId) throw new Error('Choose a category to continue.');
      const value = limit.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) throw new Error('Enter a limit greater than zero, with up to two decimal places.');
      const categoryLimits = existing
        .filter((item) => item.category_id !== categoryId)
        .map((item) => ({ category_id: item.category_id, limit_amount: item.limit_amount }));
      categoryLimits.push({ category_id: categoryId, limit_amount: value });
      return budgetApi.update(budget.data.id, {
        name: budget.data.name,
        spending_limit: budget.data.spending_limit,
        frequency: budget.data.frequency,
        start_date: budget.data.start_date,
        end_date: budget.data.end_date,
        category_limits: categoryLimits,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budget', budgetId] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      router.back();
    },
    onError: (cause) => setError(getErrorMessage(cause)),
  });

  const submit = () => {
    setError(null);
    if (!categoryId) { setError('Choose a category to continue.'); return; }
    save.mutate();
  };

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-8">
      <View className="flex-row items-center pt-3"><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mr-2 h-10 w-10 items-center justify-center rounded-xl bg-card"><ArrowLeft size={19} color={colors.primary} /></Pressable><View><Text className="text-[19px] font-bold text-primary">{isEditing ? 'Edit category budget' : 'Create category budget'}</Text><Text className="mt-0.5 text-[10px] text-muted">Fine-tune your plan for this period.</Text></View></View>

      {budget.isError && <View className="mt-4"><FormBanner message={getErrorMessage(budget.error)} /></View>}
      {budget.isPending ? <View className="mt-5 rounded-[20px] bg-card p-5"><Text className="text-center text-xs text-muted">Loading budget…</Text></View> : budget.data && <>
        <Text className="mt-5 text-[11px] leading-5 text-muted">Set a monthly limit for one category. Your expenses and overall plan stay up to date as you spend.</Text>

        <View className="mt-5 rounded-[20px] border border-border bg-card p-4">
          <Text className="mb-2 text-[11px] font-semibold text-ink">Category</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCategories }} onPress={() => setShowCategories((value) => !value)} className="h-12 flex-row items-center justify-between rounded-[14px] border border-border bg-background px-3.5"><View className="flex-row items-center gap-2.5"><Tag size={15} color={colors.textSecondary} /><Text className={`text-[11px] ${selected ? 'font-medium text-ink' : 'text-muted'}`}>{selected?.name ?? 'Choose a category'}</Text></View><ChevronDown size={15} color={colors.primary} /></Pressable>
          {showCategories && categories.data && <View className="mt-2 rounded-[14px] border border-border bg-background p-1.5">{categories.data.map((category) => { const existingLimit = existing.find((item) => item.category_id === category.id); return <Pressable key={category.id} accessibilityRole="button" onPress={() => { setCategoryId(category.id); setLimit(existingLimit?.limit_amount ?? ''); setShowCategories(false); }} className={`flex-row items-center justify-between rounded-[10px] px-3 py-3 ${category.id === categoryId ? 'bg-accent-light' : ''}`}><Text className="text-[11px] font-medium text-primary">{category.name}{existingLimit ? ' · edit limit' : ''}</Text>{category.id === categoryId && <Check size={14} color={colors.primary} />}</Pressable>; })}</View>}
          {categories.isError && <Pressable onPress={() => void categories.refetch()} className="mt-2"><Text className="text-[10px] text-error">Couldn’t load categories. Tap to retry.</Text></Pressable>}

          <Text className="mb-2 mt-5 text-[11px] font-semibold text-ink">Monthly limit · {currency}</Text>
          <TextInput accessibilityLabel="Category spending limit" value={limit} onChangeText={(value) => { setLimit(value.replace(',', '.')); setError(null); }} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSecondary} className="h-[54px] rounded-[14px] border border-border bg-background px-3.5 text-[19px] font-semibold text-primary" />
          <Text className="mt-2 text-[9px] text-muted">Current spending: {currency} {currentSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>

        <View className="mt-4 rounded-[20px] border border-border bg-card p-4">
          <Text className="text-[12px] font-bold text-primary">Budget period</Text>
          <View className="mt-3 h-12 flex-row items-center justify-between rounded-[14px] border border-border bg-background px-3.5"><View className="flex-row items-center gap-2.5"><CalendarDays size={15} color={colors.textSecondary} /><Text className="text-[10px] font-medium text-ink">{budget.data.frequency[0].toUpperCase() + budget.data.frequency.slice(1)} · {budget.data.start_date} – {budget.data.end_date}</Text></View></View>
          <View className="mt-4 flex-row items-center justify-between border-b border-border pb-3"><Text className="text-[9px] text-muted">All category limits</Text><Text className="text-[10px] font-semibold text-primary">{currency} {(categoryTotal - Number(existing.find((item) => item.category_id === categoryId)?.limit_amount ?? 0) + Number(limit || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></View>
          <View className="mt-3 flex-row items-center justify-between"><Text className="text-[9px] text-muted">Overall spending plan</Text><Text className="text-[10px] font-semibold text-primary">{currency} {Number(budget.data.spending_limit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></View>
          <Text className="mt-3 text-[9px] leading-4 text-muted">Category limits help guide your spending. You can update them any time.</Text>
        </View>
      </>}

      {error && <View className="mt-4"><FormBanner message={error} /></View>}
      <Button label={isEditing ? 'Save budget changes' : 'Save category budget'} onPress={submit} loading={save.isPending} disabled={budget.isPending || categories.isPending || !budget.data || !categories.data?.length} className="mt-5" />
    </ScrollView>
  </SafeAreaView>;
}
