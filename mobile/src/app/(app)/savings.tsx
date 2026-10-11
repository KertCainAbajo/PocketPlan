import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ArrowLeftRight, ChartNoAxesColumn, Flag, House, Sprout, UserRound, WalletCards } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { FormBanner } from '@/components/ui/form-banner';
import { savingsApi } from '@/features/dashboard/api';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const money = (amount: string | undefined, currency: string) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${currency}`;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
};

const date = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

export default function SavingsScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const currency = user?.currency ?? 'PHP';
  const [year, setYear] = useState(() => new Date().getFullYear());
  const savings = useQuery({ queryKey: ['savings', year], queryFn: () => savingsApi.get(year) });
  const data = savings.data;
  const changeYear = (amount: number) => setYear((value) => Math.min(new Date().getFullYear(), Math.max(2000, value + amount)));
  const signOut = useAuthStore((state) => state.signOut);
  const profile = () => Alert.alert('PocketPlan profile', user?.email ?? 'Your profile', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
  ]);

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-5" refreshControl={<RefreshControl refreshing={savings.isRefetching} onRefresh={() => void savings.refetch()} tintColor={colors.accent} />}>
      <View className="pt-2"><BrandMark size={32} /></View>
      <View className="mt-5"><Text className="text-[26px] font-bold tracking-tight text-primary">Savings</Text><Text className="mt-1 text-[11px] text-muted">Every saved amount, with its period and date.</Text></View>

      {savings.isError && <View className="mt-3"><FormBanner message={getErrorMessage(savings.error)} /></View>}

      <View className="mt-4 overflow-hidden rounded-[22px] bg-primary px-4 pb-4 pt-4">
        <View className="flex-row items-center gap-2"><View className="h-8 w-8 items-center justify-center rounded-xl bg-white/10"><Sprout size={17} color="#DCE4FF" /></View><Text className="text-[11px] font-medium text-white/75">Total savings to date</Text></View>
        <Text className="mt-3 text-[30px] font-bold tracking-tight text-white">{money(data?.total_saved, data?.currency ?? currency)}</Text>
        <View className="mt-4 flex-row border-t border-white/15 pt-3">
          <View className="flex-1"><Text className="text-[9px] text-white/65">Allowance savings</Text><Text className="mt-1 text-[12px] font-semibold text-white">{money(data?.allowance_rollovers_total, data?.currency ?? currency)}</Text></View>
          <View className="flex-1"><Text className="text-[9px] text-white/65">Goal contributions</Text><Text className="mt-1 text-[12px] font-semibold text-white">{money(data?.goal_contributions_total, data?.currency ?? currency)}</Text></View>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between rounded-[15px] border border-[#E8EBF3] bg-white px-2 py-1.5">
        <Pressable accessibilityRole="button" accessibilityLabel="Previous year" onPress={() => changeYear(-1)} className="h-9 w-10 items-center justify-center rounded-lg active:bg-accent-light"><ArrowLeft size={16} color={colors.primary} /></Pressable>
        <View className="items-center"><Text className="text-[13px] font-bold text-primary">{year}</Text><Text className="text-[8px] text-muted">{money(data?.year_total_saved, data?.currency ?? currency)} saved this year</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Next year" disabled={year >= new Date().getFullYear()} onPress={() => changeYear(1)} className="h-9 w-10 items-center justify-center rounded-lg active:bg-accent-light"><ArrowRight size={16} color={year >= new Date().getFullYear() ? '#C5CAD8' : colors.primary} /></Pressable>
      </View>

      <View className="mt-5 flex-row items-center justify-between"><View><Text className="text-[15px] font-bold text-primary">Period breakdown</Text><Text className="mt-0.5 text-[9px] text-muted">Allowance, spending, and what moved to savings</Text></View><WalletCards size={18} color={colors.primary} /></View>

      {savings.isPending ? <View className="mt-3 rounded-[18px] bg-white p-6"><Text className="text-center text-xs text-muted">Loading your savings…</Text></View> : data?.periods.length ? data.periods.map((period) => {
        const allowance = Number(period.allowance_amount);
        const saved = Number(period.saved_amount);
        const progress = allowance > 0 ? Math.max(0, Math.min(100, saved / allowance * 100)) : 0;
        const label = period.frequency === 'custom' ? 'Allowance period' : `${period.frequency[0].toUpperCase()}${period.frequency.slice(1)} allowance`;
        return <View key={period.id} className="mt-3 rounded-[18px] border border-[#E8EBF3] bg-white p-3.5">
          <View className="flex-row items-start justify-between"><View className="flex-1"><Text className="text-[11px] font-bold text-primary">{label}</Text><Text className="mt-1 text-[9px] text-muted">{date(period.start_date)} – {date(period.end_date)}</Text></View><View className="rounded-full bg-[#E8F7EF] px-2.5 py-1"><Text className="text-[8px] font-bold text-[#25684D]">Saved {date(period.saved_on)}</Text></View></View>
          <View className="mt-3 flex-row"><Metric label="Allowance" value={money(period.allowance_amount, data.currency)} /><Metric label="Spent" value={money(period.spent, data.currency)} /><Metric label="Saved" value={money(period.saved_amount, data.currency)} highlight /></View>
          <View className="mt-3 h-1 overflow-hidden rounded-full bg-[#ECEEFF]"><View className="h-full rounded-full bg-[#5E78F6]" style={{ width: `${progress}%` }} /></View>
          <Text className="mt-1.5 text-[8px] text-muted">{Math.round(progress)}% of this period’s allowance saved</Text>
        </View>;
      }) : <View className="mt-3 items-center rounded-[18px] border border-dashed border-[#DDE2EF] bg-white px-5 py-7"><View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-light"><Sprout size={18} color={colors.accent} /></View><Text className="mt-2 text-[12px] font-bold text-primary">No allowance periods closed in {year}</Text><Text className="mt-1 text-center text-[9px] leading-4 text-muted">When an allowance period ends, its unspent money will appear here automatically.</Text></View>}

      {!!data && <View className="mt-4 rounded-[16px] bg-accent-light px-3.5 py-3"><Text className="text-[10px] font-bold text-primary">{year} savings total · {money(data.year_total_saved, data.currency)}</Text><Text className="mt-1 text-[9px] leading-4 text-primary/75">Allowance rollovers {money(data.year_rollovers_total, data.currency)} · Goal contributions {money(data.year_goal_contributions_total, data.currency)}</Text></View>}
    </ScrollView>

    <View className="flex-row border-t border-border bg-card px-1 pb-1 pt-2">
      <TabItem label="Home" icon={<House size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/')} />
      <TabItem label="Activity" icon={<ArrowLeftRight size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/activity')} />
      <TabItem label="Budgets" icon={<ChartNoAxesColumn size={16} color={colors.textSecondary} />} onPress={() => router.navigate('/budgets')} />
      <TabItem label="Goals" active icon={<Flag size={16} color={colors.primary} />} onPress={() => undefined} />
      <TabItem label="Profile" icon={<UserRound size={16} color={colors.textSecondary} />} onPress={profile} />
    </View>
  </SafeAreaView>;
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <View className="flex-1"><Text className="text-[8px] text-muted">{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit className={`mt-1 text-[10px] font-bold ${highlight ? 'text-[#2F8064]' : 'text-primary'}`}>{value}</Text></View>;
}

function TabItem({ label, icon, active = false, onPress }: { label: string; icon: React.ReactNode; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-12 flex-1 items-center justify-center gap-0.5"><View className={`h-7 min-w-8 items-center justify-center rounded-full px-2 ${active ? 'bg-accent-light' : ''}`}>{icon}</View><Text className={`text-[9px] ${active ? 'font-semibold text-primary' : 'text-muted'}`}>{label}</Text></Pressable>;
}
