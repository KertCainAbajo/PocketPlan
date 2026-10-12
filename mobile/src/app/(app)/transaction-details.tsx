import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BriefcaseBusiness,
  MoreHorizontal,
  ShoppingBasket,
  Trash2,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/app-alert';
import { FormBanner } from '@/components/ui/form-banner';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { api, getErrorMessage } from '@/lib/api-client';
import { accountApi, transactionApi, type TransactionDetails } from '@/features/dashboard/api';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

interface BudgetDetails {
  id: number;
  name: string;
  spending_limit: string;
  summary: { spent_total: string; remaining: string; percent_used: number };
}

const formatMoney = (amount: string, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
};

const readable = (value: string | null | undefined) => value
  ? value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  : 'Not specified';

export default function TransactionDetailsScreen() {
  useStatusBarStyle('dark');
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const type: 'expense' | 'income' = params.type === 'income' ? 'income' : 'expense';
  const id = Number(params.id);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const transaction = useQuery({
    queryKey: ['transaction', type, id],
    queryFn: () => transactionApi.get(type, id),
    enabled: Number.isInteger(id) && id > 0,
  });
  const detail = transaction.data;
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list });
  const accountName = accounts.data?.find((account) => account.id === detail?.account_id)?.name ?? 'Account';
  const budget = useQuery({
    queryKey: ['budget', detail?.budget_id],
    queryFn: async () => {
      const { data } = await api.get<{ data: BudgetDetails }>(`/budgets/${detail?.budget_id}`);
      return data.data;
    },
    enabled: type === 'expense' && Boolean(detail?.budget_id),
  });

  const remove = useMutation({
    mutationFn: () => transactionApi.remove(type, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['budget'] }),
      ]);
      router.back();
    },
  });

  const askToDelete = () => showAlert('Delete transaction?', 'This transaction will be permanently removed.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
  ], { icon: Trash2 });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="px-5 pb-6">
        <View className="flex-row items-center justify-between pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
            <ArrowLeft size={18} color={colors.primary} />
          </Pressable>
          <Text className="flex-1 text-[17px] font-bold text-primary">Transaction details</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Transaction options" onPress={() => showAlert('Transaction options', 'Choose Edit or Delete below.')} className="h-9 w-9 items-center justify-center">
            <MoreHorizontal size={20} color={colors.primary} />
          </Pressable>
        </View>

        {transaction.isPending ? (
          <View className="mt-5 rounded-[20px] bg-card p-8"><Text className="text-center text-xs text-muted">Loading transaction…</Text></View>
        ) : transaction.isError ? (
          <View className="mt-5"><FormBanner message={getErrorMessage(transaction.error)} /></View>
        ) : detail ? (
          <TransactionContent
            detail={detail}
            accountName={accountName}
            type={type}
            currency={user?.currency ?? 'USD'}
            userName={user?.name ?? 'You'}
            budget={budget.data}
            budgetError={budget.isError ? getErrorMessage(budget.error) : undefined}
            deleting={remove.isPending}
            deleteError={remove.isError ? getErrorMessage(remove.error) : undefined}
            onEdit={() => router.push({ pathname: '/transaction-form', params: { type, id: String(id) } })}
            onDelete={askToDelete}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TransactionContent({
  detail,
  accountName,
  type,
  currency,
  userName,
  budget,
  budgetError,
  deleting,
  deleteError,
  onEdit,
  onDelete,
}: {
  detail: TransactionDetails;
  accountName: string;
  type: 'expense' | 'income';
  currency: string;
  userName: string;
  budget?: BudgetDetails;
  budgetError?: string;
  deleting: boolean;
  deleteError?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const expense = type === 'expense';
  const Icon = expense ? ShoppingBasket : BriefcaseBusiness;
  const date = expense ? detail.spent_on : detail.received_on;
  const formattedDate = date
    ? new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
    : 'Not specified';
  const used = Math.min(100, Math.max(0, budget?.summary.percent_used ?? 0));

  return (
    <>
      <View className="mt-3 items-center rounded-[20px] bg-card px-4 pb-4 pt-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-light"><Icon size={19} color={colors.accent} strokeWidth={1.7} /></View>
        <Text numberOfLines={1} className="mt-1.5 max-w-full text-[13px] font-medium text-primary">{detail.description}</Text>
        <Text className="mt-0.5 text-[28px] font-bold tracking-tight text-primary">{expense ? '−' : '+'}{formatMoney(detail.amount, currency)}</Text>
        <View className="mt-1 rounded-full bg-accent-light px-2.5 py-1"><Text className="text-[8px] font-semibold text-primary">{expense ? 'Expense' : 'Income'} · Completed</Text></View>
      </View>

      <View className="mt-2.5 rounded-[18px] bg-card px-3.5 py-2">
        <DetailLine label="Category" value={detail.category.name} />
        <DetailLine label="Date" value={formattedDate} />
        <DetailLine label="Account" value={accountName} />
        {expense && <DetailLine label="Payment method" value={readable(detail.payment_method)} />}
        <DetailLine label="Added by" value={`${userName} · ${detail.recurring_income_id ? 'Recurring' : 'Manually'}`} />
      </View>

      {budget && (
        <View className="mt-2.5 rounded-[18px] bg-accent-light p-3">
          <View className="flex-row items-center justify-between">
            <Text numberOfLines={1} className="flex-1 text-[10px] font-medium text-primary">{budget.name}</Text>
            <Text className="ml-2 text-[9px] font-semibold text-primary">{used}% used</Text>
          </View>
          <View className="mt-2 h-1 overflow-hidden rounded-full bg-white"><View className="h-full rounded-full bg-[#F5A000]" style={{ width: `${used}%` }} /></View>
          <Text className="mt-2 text-[9px] text-primary">{formatMoney(budget.summary.spent_total, currency)} of {formatMoney(budget.spending_limit, currency)} spent. {formatMoney(budget.summary.remaining, currency)} left.</Text>
          <Text className="mt-1 text-[9px] font-semibold text-primary">View budget →</Text>
        </View>
      )}
      {budgetError && <View className="mt-2.5"><FormBanner message={budgetError} /></View>}

      <Text className="mt-2.5 px-1 text-[9px] leading-[14px] text-muted">Note: {detail.notes || 'No note added.'}</Text>
      {deleteError && <View className="mt-2"><FormBanner message={deleteError} /></View>}

      <Pressable disabled={deleting} onPress={onEdit} className="mt-2 h-10 items-center justify-center rounded-xl bg-primary active:opacity-80">
        <Text className="text-[10px] font-semibold text-white">Edit transaction</Text>
      </Pressable>
      <Pressable disabled={deleting} onPress={onDelete} className="mt-1 h-8 items-center justify-center">
        <Text className="text-[9px] font-medium text-[#E94B55]">{deleting ? 'Deleting…' : 'Delete transaction'}</Text>
      </Pressable>
    </>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <View className="min-h-7 flex-row items-center justify-between gap-3"><Text className="text-[9px] text-muted">{label}</Text><Text numberOfLines={1} className="max-w-[65%] text-right text-[9px] font-medium text-ink">{value}</Text></View>;
}
