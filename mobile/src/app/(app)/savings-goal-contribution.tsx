import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeft, ArrowRight, Check, CircleCheck, Flag, Sparkles, WalletCards } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { FormBanner } from '@/components/ui/form-banner';
import { currencySymbol } from '@/features/budgets/period';
import { accountApi, savingsGoalsApi, type Account } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { cachedDateTimeFormat, cachedNumberFormat } from '@/lib/intl';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const money = (value: string | number | undefined, currency: string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `— ${currency}`;
  try { return cachedNumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};

const todayLabel = () => cachedDateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

export default function SavingsGoalContributionScreen() {
  useStatusBarStyle('dark');
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const id = Number(goalId);
  const validId = Number.isInteger(id) && id > 0;
  const currency = useAuthStore((state) => state.user?.currency ?? 'PHP');
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  // The account the student tapped; until then, the default account is used.
  const [pickedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const detail = useQuery({ queryKey: ['savings-goal', id], queryFn: () => savingsGoalsApi.get(id), enabled: validId });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list });
  const selectedAccountId = pickedAccountId ?? (accounts.data?.find((account) => account.is_default) ?? accounts.data?.[0])?.id ?? null;
  const goals = useQuery({ queryKey: ['savings-goals'], queryFn: savingsGoalsApi.list });
  const selectedAccount = accounts.data?.find((account) => account.id === selectedAccountId) ?? null;
  const contributionValue = Number(amount);
  const goal = detail.data?.goal;
  const nextSaved = Number(goal?.saved_amount ?? 0) + (Number.isFinite(contributionValue) ? contributionValue : 0);
  const nextProgress = goal && Number(goal.target_amount) > 0 ? Math.max(0, Math.min(100, nextSaved / Number(goal.target_amount) * 100)) : 0;
  const availableBalance = Number(selectedAccount?.balance ?? 0);
  const hasEnoughBalance = !selectedAccount || contributionValue <= availableBalance;


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
  const monthAdded = goals.data?.month_added;
  const canSubmit = validId && Number.isFinite(contributionValue) && contributionValue > 0 && Boolean(selectedAccountId) && hasEnoughBalance && !contribute.isPending;
  const presets = [10, 25, 50].map((percent) => ({ percent, value: Math.floor(availableBalance * percent / 100 * 100) / 100 }));
  const contributionDate = useMemo(() => todayLabel(), []);
  const remainingAfter = Math.max(0, Number(goal?.target_amount ?? 0) - nextSaved);

  function finish() { router.back(); }
  function chooseAmount(value: number) { if (value > 0) setAmount(value.toFixed(2)); }

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <View className="flex-1">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-5">
        <View className="flex-row items-center pt-1">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={finish} className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white"><ArrowLeft size={18} color={colors.primary} /></Pressable>
          <View className="flex-1"><Text className="text-[9px] font-semibold uppercase tracking-[1px] text-muted">Grow your savings</Text><Text className="mt-0.5 text-[16px] font-bold text-primary">Add contribution</Text></View>
        </View>

        {detail.isError && <View className="mt-3"><FormBanner message={getErrorMessage(detail.error)} /></View>}
        {accounts.isError && <View className="mt-3"><FormBanner message={getErrorMessage(accounts.error)} /></View>}

        {confirmed ? <>
          <View className="mt-4 overflow-hidden rounded-[23px] bg-[#DFF7EA] p-4">
            <View className="flex-row items-center gap-3"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-white"><Check size={23} color="#35A873" /></View><View className="flex-1"><Text className="text-[9px] font-semibold uppercase tracking-[1px] text-[#338460]">Contribution complete</Text><Text className="mt-0.5 text-[23px] font-bold tracking-tight text-primary">{money(amount, currency)} added</Text></View></View>
            <Text className="mt-3 text-[10px] leading-4 text-ink">A lovely step forward. Your money is now set aside for {goal?.name ?? 'your goal'}.</Text>
          </View>

          <View className="mt-3 overflow-hidden rounded-[20px] bg-white p-4">
            <View className="flex-row items-start justify-between"><View><Text className="text-[9px] font-medium text-muted">Your updated goal</Text><Text className="mt-1 text-[24px] font-bold tracking-tight text-primary">{money(confirmedSaved, currency)}</Text><Text className="mt-0.5 text-[9px] text-muted">of {money(goal?.target_amount, currency)} saved</Text></View><ProgressRing progress={confirmedProgress} label={`${Math.floor(confirmedProgress)}%`} /></View>
            <View className="mt-3 h-[7px] overflow-hidden rounded-full bg-[#ECEEFF]"><View className="h-full rounded-full bg-[#697BFF]" style={{ width: `${confirmedProgress}%` }} /></View>
            <View className="mt-3 flex-row items-center justify-between"><Text className="text-[8px] text-muted">Still to reach your target</Text><Text className="text-[9px] font-bold text-primary">{money(Math.max(0, Number(goal?.target_amount ?? 0) - confirmedSaved), currency)}</Text></View>
          </View>

          <View className="mt-3 rounded-[18px] bg-white p-4">
            <Text className="mb-3 text-[11px] font-bold text-primary">Transfer details</Text>
            <SummaryRow label="Date" value={contributionDate} />
            <SummaryRow label="From account" value={selectedAccount?.name ?? 'Everyday account'} />
            <SummaryRow label="Balance after transfer" value={money(updatedAccount?.balance ?? Math.max(0, availableBalance - Number(amount)), currency)} />
            <SummaryRow label={`${cachedDateTimeFormat(undefined, { month: 'long' }).format(new Date())} contributions`} value={money(monthAdded === undefined ? Number(amount) : Number(monthAdded), currency)} />
            <Text className="mt-1 text-[8px] leading-[13px] text-muted">This is a savings transfer. Your expenses and category budgets are unchanged.</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={finish} className="mt-4 h-[49px] flex-row items-center justify-center gap-2 rounded-[14px] bg-primary"><Text className="text-[11px] font-bold text-white">Done · View {goal?.name ?? 'goal'}</Text><ArrowRight size={15} color="white" /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setConfirmed(false); setAmount(''); contribute.reset(); }} className="mt-2.5 h-[45px] items-center justify-center rounded-[13px] bg-accent-light"><Text className="text-[10px] font-bold text-primary">Add another contribution</Text></Pressable>
        </> : <>
          {goal && <View className="mt-4 flex-row items-center rounded-[17px] border border-[#E8EBF7] bg-white p-3"><View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-light"><Flag size={16} color={colors.primary} /></View><View className="ml-2.5 flex-1"><Text className="text-[8px] font-semibold uppercase tracking-[0.8px] text-muted">Adding to</Text><Text numberOfLines={1} className="mt-0.5 text-[11px] font-bold text-primary">{goal.name}</Text></View><View className="items-end"><Text className="text-[8px] text-muted">Current</Text><Text className="mt-0.5 text-[10px] font-bold text-primary">{money(goal.saved_amount, currency)}</Text></View></View>}

          <View className="mt-3 rounded-[21px] border border-[#E8EBF7] bg-white p-4">
            <View className="flex-row items-center justify-between"><View><Text className="text-[10px] font-semibold text-primary">How much would you like to save?</Text><Text className="mt-0.5 text-[8px] text-muted">Choose an amount that feels comfortable.</Text></View><View className="h-8 w-8 items-center justify-center rounded-xl bg-accent-light"><Sparkles size={14} color={colors.primary} /></View></View>
            <View className="mt-4 flex-row items-center border-b border-[#ECEEF4] pb-2"><Text className="mr-2 text-[28px] font-bold text-muted">{currencySymbol(currency)}</Text><TextInput accessibilityLabel="Contribution amount" value={amount} onChangeText={(value) => setAmount(value.replace(',', '.').replace(/[^\d.]/g, ''))} placeholder="0.00" keyboardType="decimal-pad" className="min-w-0 flex-1 py-1 text-[31px] font-bold tracking-tight text-primary" placeholderTextColor="#A6AEC0" /></View>
            <View className="mt-3 flex-row items-center justify-between"><Text className="text-[8px] text-muted">Available in {selectedAccount?.name ?? 'your account'}</Text><Text className="text-[9px] font-semibold text-primary">{money(selectedAccount?.balance ?? 0, currency)}</Text></View>
            <View className="mt-3 flex-row gap-2">{presets.map(({ percent, value }) => <Pressable key={percent} disabled={value <= 0} accessibilityRole="button" onPress={() => chooseAmount(value)} className={`min-h-8 flex-1 flex-row items-center justify-center gap-1 rounded-[9px] ${value > 0 ? 'bg-[#F2F4FF]' : 'bg-background'}`}><Text className={`text-[8px] font-semibold ${value > 0 ? 'text-primary' : 'text-muted'}`}>{percent}%</Text><Text className="text-[8px] text-muted">{money(value, currency)}</Text></Pressable>)}</View>
          </View>

          <View className="mt-4 flex-row items-end justify-between"><View><Text className="text-[14px] font-bold text-primary">Choose an account</Text><Text className="mt-0.5 text-[8px] text-muted">Where should we move the money from?</Text></View><Text className="text-[8px] font-semibold text-muted">{accounts.data?.length ?? 0} available</Text></View>
          {accounts.isPending ? <View className="mt-2 rounded-[16px] bg-white p-4"><Text className="text-center text-[9px] text-muted">Loading your accounts…</Text></View> : <View className="mt-2 gap-2">{accounts.data?.map((account: Account) => <AccountOption key={account.id} account={account} currency={currency} selected={selectedAccountId === account.id} onPress={() => setSelectedAccountId(account.id)} />)}</View>}
          {accounts.data?.length === 0 && <View className="mt-2 rounded-[16px] bg-white p-4"><Text className="text-center text-[9px] text-muted">Add an account in Profile & settings before contributing.</Text></View>}

          {goal && <View className="mt-4 rounded-[19px] bg-primary p-4">
            <View className="flex-row items-center justify-between"><View><Text className="text-[9px] font-medium text-white/70">After this contribution</Text><Text className="mt-1 text-[20px] font-bold text-white">{money(nextSaved, currency)}</Text></View><ProgressRing progress={nextProgress} label={`${Math.floor(nextProgress)}%`} light /></View>
            <View className="mt-3 h-[6px] overflow-hidden rounded-full bg-white/20"><View className="h-full rounded-full bg-[#AEBBFF]" style={{ width: `${nextProgress}%` }} /></View>
            <View className="mt-2 flex-row items-center justify-between"><Text className="text-[8px] text-white/70">of {money(goal.target_amount, currency)} target</Text><Text className="text-[8px] font-semibold text-white">{money(remainingAfter, currency)} to go</Text></View>
            <View className="mt-3 flex-row items-center gap-1.5 rounded-[11px] bg-white/10 px-2.5 py-2"><ArrowDownLeft size={12} color="white" /><Text className="flex-1 text-[8px] text-white/80">Available balance after transfer</Text><Text className="text-[9px] font-bold text-white">{money(availableBalance - (Number.isFinite(contributionValue) ? contributionValue : 0), currency)}</Text></View>
          </View>}

          {selectedAccount && contributionValue > availableBalance && <View className="mt-3 rounded-xl bg-[#FEECEE] px-3 py-2.5"><Text className="text-[9px] font-semibold text-[#A6394B]">This is more than the available account balance.</Text></View>}
          {contribute.isError && <View className="mt-3"><FormBanner message={getErrorMessage(contribute.error)} /></View>}
          <View className="mt-3 flex-row items-center justify-center gap-1.5"><CircleCheck size={11} color="#568A70" /><Text className="text-[8px] text-muted">Savings contributions never use your category budgets</Text></View>
        </>}
      </ScrollView>

      {!confirmed && <View className="border-t border-border bg-background px-5 pb-2 pt-3"><Pressable accessibilityRole="button" disabled={!canSubmit} onPress={() => contribute.mutate()} className={`h-[49px] flex-row items-center justify-center gap-2 rounded-[14px] ${canSubmit ? 'bg-primary shadow-sm shadow-primary/20' : 'bg-primary/45'}`}><Text className="text-[11px] font-bold text-white">{contribute.isPending ? 'Saving contribution…' : `Add ${contributionValue > 0 ? money(contributionValue, currency) : 'contribution'}`}</Text><ArrowRight size={15} color="white" /></Pressable></View>}
    </View>
  </SafeAreaView>;
}

function ProgressRing({ progress, label, light = false }: { progress: number; label: string; light?: boolean }) {
  return <View className="h-12 w-12 items-center justify-center"><Svg width={48} height={48} viewBox="0 0 100 100"><Circle cx="50" cy="50" r="42" fill="none" stroke={light ? '#FFFFFF40' : '#ECEEFF'} strokeWidth="9" /><Circle cx="50" cy="50" r="42" fill="none" stroke={light ? '#FFFFFF' : '#697BFF'} strokeWidth="9" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.max(0, Math.min(100, progress)) / 100)}`} strokeLinecap="round" rotation={-90} originX={50} originY={50} /></Svg><Text className={`absolute text-[9px] font-bold ${light ? 'text-white' : 'text-primary'}`}>{label}</Text></View>;
}

function AccountOption({ account, currency, selected, onPress }: { account: Account; currency: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} className={`min-h-[62px] flex-row items-center rounded-[15px] border px-3 ${selected ? 'border-primary bg-[#F0F2FF]' : 'border-[#EEF0F6] bg-white'}`}><View className={`h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-white' : 'bg-background'}`}><WalletCards size={16} color={colors.primary} /></View><View className="ml-2.5 flex-1"><View className="flex-row items-center gap-1.5"><Text className="text-[10px] font-semibold text-ink">{account.name}</Text>{account.is_default && <Text className="rounded-full bg-[#E8ECFF] px-1.5 py-0.5 text-[7px] font-semibold text-primary">DEFAULT</Text>}</View><Text className="mt-0.5 text-[8px] capitalize text-muted">{account.type} · Available balance</Text></View><View className="items-end"><Text className="text-[10px] font-bold text-primary">{money(account.balance, currency)}</Text><View className={`mt-1 h-4 w-4 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary' : 'border-[#C6CCDA]'}`}>{selected && <Check size={10} color="white" />}</View></View></Pressable>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View className="mb-2.5 flex-row items-center justify-between"><Text className="text-[8px] text-muted">{label}</Text><Text className="max-w-[60%] text-right text-[8px] font-medium text-ink">{value}</Text></View>;
}
