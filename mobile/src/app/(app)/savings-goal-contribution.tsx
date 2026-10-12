import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronDown, CreditCard, WalletCards } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormBanner } from '@/components/ui/form-banner';
import { accountApi, savingsGoalsApi, type Account } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const money = (value: string | number | undefined, currency: string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `— ${currency}`;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};

const todayLabel = () => new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

export default function SavingsGoalContributionScreen() {
  useStatusBarStyle('dark');
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const id = Number(goalId);
  const validId = Number.isInteger(id) && id > 0;
  const currency = useAuthStore((state) => state.user?.currency ?? 'PHP');
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showAccounts, setShowAccounts] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const detail = useQuery({ queryKey: ['savings-goal', id], queryFn: () => savingsGoalsApi.get(id), enabled: validId });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list });
  const goals = useQuery({ queryKey: ['savings-goals'], queryFn: savingsGoalsApi.list });
  const selectedAccount = accounts.data?.find((account) => account.id === selectedAccountId) ?? null;
  const contributionValue = Number(amount);
  const goal = detail.data?.goal;
  const nextSaved = Number(goal?.saved_amount ?? 0) + (Number.isFinite(contributionValue) ? contributionValue : 0);
  const nextProgress = goal && Number(goal.target_amount) > 0 ? Math.max(0, Math.min(100, nextSaved / Number(goal.target_amount) * 100)) : 0;

  useEffect(() => {
    if (!selectedAccountId && accounts.data?.length) {
      setSelectedAccountId((accounts.data.find((account) => account.is_default) ?? accounts.data[0]).id);
    }
  }, [accounts.data, selectedAccountId]);

  const contribute = useMutation({
    mutationFn: () => savingsGoalsApi.contribute(id, { amount: amount.trim(), account_id: selectedAccountId! }),
    onSuccess: async () => {
      setConfirmed(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['savings-goal', id] }),
        queryClient.invalidateQueries({ queryKey: ['savings-goals'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });

  const updatedGoal = detail.data?.goal;
  const updatedAccount = accounts.data?.find((account) => account.id === selectedAccountId);
  const confirmedSaved = Number(updatedGoal?.saved_amount ?? nextSaved);
  const confirmedProgress = goal && Number(goal.target_amount) > 0 ? Math.max(0, Math.min(100, confirmedSaved / Number(goal.target_amount) * 100)) : nextProgress;
  const updatedAllSaved = goals.data?.total_saved;
  const monthAdded = goals.data?.month_added;
  const canSubmit = validId && Number.isFinite(contributionValue) && contributionValue > 0 && Boolean(selectedAccountId) && !contribute.isPending;

  const contributionDate = useMemo(() => todayLabel(), []);

  function finish() { router.back(); }

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-7">
      <View className="flex-row items-center pt-1">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={finish} className="mr-1 h-9 w-9 items-center justify-center rounded-full active:bg-accent-light"><ArrowLeft size={18} color={colors.primary} /></Pressable>
        <View><Text className="text-[17px] font-bold text-primary">Add contribution</Text><Text className="mt-0.5 text-[8px] text-muted">{goal?.name ?? 'Savings goal'} · Contribution</Text></View>
      </View>

      {detail.isError && <View className="mt-3"><FormBanner message={getErrorMessage(detail.error)} /></View>}
      {accounts.isError && <View className="mt-3"><FormBanner message={getErrorMessage(accounts.error)} /></View>}

      {confirmed ? <>
        <View className="mt-4 items-center rounded-[17px] bg-[#DDF7E9] px-4 py-4">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-white"><Check size={19} color="#48BD83" /></View>
          <Text className="mt-1 text-[24px] font-bold tracking-tight text-primary">{money(amount, currency)} added</Text>
          <Text className="mt-1 text-center text-[9px] leading-[14px] text-ink">One more step toward feeling ready for anything.</Text>
        </View>

        <View className="mt-3">
          <Text className="mb-1.5 text-[9px] font-semibold text-ink">Contribution amount · Saved</Text>
          <View className="h-[42px] flex-row items-center justify-between rounded-[11px] border border-[#E5E8EF] bg-white px-3"><Text className="text-[11px] text-ink">{money(amount, currency)}</Text><Check size={14} color={colors.primary} /></View>
        </View>
        <View className="mt-3">
          <Text className="mb-1.5 text-[9px] font-semibold text-ink">From account</Text>
          <View className="h-[42px] flex-row items-center justify-between rounded-[11px] border border-[#E5E8EF] bg-white px-3"><Text className="text-[11px] text-ink">{selectedAccount?.name ?? 'Everyday account'}</Text><CreditCard size={15} color={colors.primary} /></View>
        </View>

        <View className="mt-3 rounded-[15px] bg-white px-3.5 py-3">
          <Text className="text-[8px] text-muted">Your updated goal</Text>
          <View className="mt-1 flex-row items-end justify-between"><Text className="text-[19px] font-bold text-primary">{money(confirmedSaved, currency)}</Text><Text className="mb-1 text-[8px] text-muted">of {money(goal?.target_amount, currency)} · {confirmedProgress.toFixed(1)}%</Text></View>
          <View className="mt-2 h-[5px] overflow-hidden rounded-full bg-[#ECEEFF]"><View className="h-full rounded-full bg-[#667BFF]" style={{ width: `${confirmedProgress}%` }} /></View>
          <View className="mt-3 flex-row items-center justify-between"><Text className="text-[8px] text-muted">Available balance after transfer</Text><Text className="text-[8px] font-semibold text-ink">{money(updatedAccount?.balance ?? Math.max(0, Number(selectedAccount?.balance ?? 0) - Number(amount)), currency)}</Text></View>
        </View>

        <View className="mt-3 rounded-[15px] bg-white px-3.5 py-3">
          <SummaryRow label="Date" value={contributionDate} />
          <SummaryRow label={`${new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date())} contributions now`} value={money(monthAdded === undefined ? Number(amount) : Number(monthAdded), currency)} />
          <SummaryRow label="All goals saved now" value={money(updatedAllSaved ?? Number(amount), currency)} />
          <Text className="mt-2 text-[7px] leading-[11px] text-muted">This is a savings transfer. Other expenses remain unchanged, and category budgets are unchanged.</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={finish} className="mt-3 h-[42px] items-center justify-center rounded-[10px] bg-primary active:opacity-80"><Text className="text-[9px] font-bold text-white">Done · View {goal?.name ?? 'goal'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setConfirmed(false); setAmount(''); contribute.reset(); }} className="mt-2.5 h-[42px] items-center justify-center rounded-[10px] bg-[#EEF0FF] active:opacity-80"><Text className="text-[9px] font-semibold text-primary">Add another contribution</Text></Pressable>
      </> : <>
        <View className="mt-4">
          <Text className="mb-1.5 text-[9px] font-semibold text-ink">Contribution amount · Saved</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" className="h-[42px] rounded-[11px] border border-[#E5E8EF] bg-white px-3 text-[11px] text-ink" />
        </View>
        <View className="mt-3">
          <Text className="mb-1.5 text-[9px] font-semibold text-ink">From account</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAccounts }} onPress={() => setShowAccounts((shown) => !shown)} className="h-[42px] flex-row items-center justify-between rounded-[11px] border border-[#E5E8EF] bg-white px-3"><View className="flex-row items-center gap-2"><WalletCards size={15} color={colors.primary} /><Text className="text-[11px] text-ink">{accounts.isPending ? 'Loading accounts…' : selectedAccount?.name ?? 'Choose account'}</Text></View><ChevronDown size={15} color={colors.primary} /></Pressable>
          {showAccounts && accounts.data && <View className="mt-1 rounded-[12px] border border-[#E5E8EF] bg-white p-1">{accounts.data.map((account: Account) => <Pressable key={account.id} accessibilityRole="button" accessibilityState={{ selected: selectedAccountId === account.id }} onPress={() => { setSelectedAccountId(account.id); setShowAccounts(false); }} className={`flex-row items-center justify-between rounded-[9px] px-3 py-2.5 ${selectedAccountId === account.id ? 'bg-accent-light' : ''}`}><Text className="text-[10px] font-medium text-primary">{account.name}</Text><Text className="text-[9px] text-muted">{money(account.balance, currency)}</Text></Pressable>)}</View>}
        </View>

        {goal && <View className="mt-3 rounded-[15px] bg-white px-3.5 py-3">
          <Text className="text-[8px] text-muted">Your updated goal</Text>
          <View className="mt-1 flex-row items-end justify-between"><Text className="text-[19px] font-bold text-primary">{money(nextSaved, currency)}</Text><Text className="mb-1 text-[8px] text-muted">of {money(goal.target_amount, currency)} · {nextProgress.toFixed(1)}%</Text></View>
          <View className="mt-2 h-[5px] overflow-hidden rounded-full bg-[#ECEEFF]"><View className="h-full rounded-full bg-[#667BFF]" style={{ width: `${nextProgress}%` }} /></View>
          <View className="mt-3 flex-row items-center justify-between"><Text className="text-[8px] text-muted">Available balance after transfer</Text><Text className="text-[8px] font-semibold text-ink">{money(Number(selectedAccount?.balance ?? 0) - (Number.isFinite(contributionValue) ? contributionValue : 0), currency)}</Text></View>
        </View>}

        {contribute.isError && <View className="mt-3"><FormBanner message={getErrorMessage(contribute.error)} /></View>}
        <Pressable accessibilityRole="button" disabled={!canSubmit} onPress={() => contribute.mutate()} className={`mt-3 h-[44px] items-center justify-center rounded-[10px] ${canSubmit ? 'bg-primary' : 'bg-primary/50'}`}><Text className="text-[10px] font-bold text-white">{contribute.isPending ? 'Saving contribution…' : 'Add contribution'}</Text></Pressable>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View className="mb-2.5 flex-row items-center justify-between"><Text className="text-[8px] text-muted">{label}</Text><Text className="text-[8px] font-medium text-ink">{value}</Text></View>;
}
