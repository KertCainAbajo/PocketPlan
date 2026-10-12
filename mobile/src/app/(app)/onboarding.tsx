import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { ArrowLeft, CalendarRange, Check, ChevronDown, PiggyBank, Repeat, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { FormBanner } from '@/components/ui/form-banner';
import { onboardingApi, type AllowanceFrequency } from '@/features/auth/onboarding-api';
import { currencySymbol, daysBetween, endDateFor, formatCurrency, PERIOD_LABEL, PERIOD_WORD, QUICK_AMOUNTS, shortDate, toDateString, type PeriodFrequency } from '@/features/budgets/period';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const frequencies: { value: PeriodFrequency & AllowanceFrequency; hint: string }[] = [
  { value: 'daily', hint: 'Every day' },
  { value: 'weekly', hint: 'Every week' },
  { value: 'monthly', hint: 'Every month' },
  { value: 'yearly', hint: 'Once a year' },
];
const currencies = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'HKD', 'AUD', 'CAD'];

export default function OnboardingScreen() {
  useStatusBarStyle('dark');
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<PeriodFrequency & AllowanceFrequency>('weekly');
  const [currency, setCurrency] = useState(user?.currency ?? 'PHP');
  const [showCurrencies, setShowCurrencies] = useState(false);
  const [recurring, setRecurring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const word = PERIOD_WORD[frequency];
  const value = Number(amount || 0);
  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && value > 0;
  const start = toDateString(new Date());
  const end = endDateFor(start, frequency);
  const days = daysBetween(start, end);
  const money = (number: number) => formatCurrency(number, currency);

  const complete = useMutation({
    mutationFn: onboardingApi.complete,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      router.replace('/');
    },
    onError: (cause) => setError(getErrorMessage(cause)),
  });

  const submit = () => {
    setError(null);
    if (!validAmount) { setError(`Enter the allowance you get each ${word}, with up to two decimal places.`); return; }
    complete.mutate({ currency, allowance_amount: amount.trim(), frequency, start_date: start, recurring });
  };

  if (user?.is_onboarded) return <Redirect href="/" />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:opacity-70">
          <ArrowLeft size={19} color={colors.primary} />
        </Pressable>
        <BrandMark size={30} />
        <View className="w-11" />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-6">
        <View className="mt-5 flex-row items-center gap-2">
          <View className="h-1.5 w-8 rounded-full bg-accent" />
          <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-accent">One quick step</Text>
        </View>
        <Text className="mt-2 text-[28px] font-bold leading-[34px] tracking-tight text-primary">How much is your allowance?</Text>
        <Text className="mt-2 text-[14px] leading-5 text-muted">We’ll turn it into a spending plan that tells you what’s safe to spend each day.</Text>

        {/* Amount */}
        <View className="mt-6 overflow-hidden rounded-[28px] bg-primary px-5 pb-5 pt-5">
          <View className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10" />
          <View className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-white/5" />
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] font-semibold uppercase tracking-[1.2px] text-white/70">Allowance per {word}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Currency ${currency}. Tap to change.`} accessibilityState={{ expanded: showCurrencies }} onPress={() => setShowCurrencies((open) => !open)} className="flex-row items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 active:bg-white/25">
              <Text className="text-[11px] font-bold text-white">{currency}</Text>
              <ChevronDown size={13} color="white" />
            </Pressable>
          </View>

          {showCurrencies && <View className="mt-3 flex-row flex-wrap gap-1.5">
            {currencies.map((code) => {
              const active = code === currency;
              return <Pressable key={code} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => { setCurrency(code); setShowCurrencies(false); }} className={`rounded-full px-3 py-1.5 ${active ? 'bg-white' : 'bg-white/10 active:bg-white/20'}`}>
                <Text className={`text-[11px] font-semibold ${active ? 'text-primary' : 'text-white'}`}>{currencySymbol(code)} {code}</Text>
              </Pressable>;
            })}
          </View>}

          <View className="mt-3 flex-row items-end">
            <Text className="mb-3 mr-1 text-[24px] font-bold text-white/80">{currencySymbol(currency)}</Text>
            <TextInput accessibilityLabel={`Allowance amount per ${word}`} value={amount} onChangeText={(text) => { setAmount(text.replace(',', '.').replace(/[^\d.]/g, '')); setError(null); }} placeholder="0.00" placeholderTextColor="rgba(255,255,255,0.35)" selectionColor="white" keyboardType="decimal-pad" className="min-w-[60px] flex-1 p-0 text-[42px] font-bold text-white" />
            <Text className="mb-3 text-[13px] font-semibold text-white/70">/ {word}</Text>
          </View>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {QUICK_AMOUNTS[frequency].map((quick) => {
              const active = value === quick;
              return <Pressable key={quick} accessibilityRole="button" onPress={() => { setAmount(quick.toFixed(2)); setError(null); }} className={`rounded-full px-3 py-1.5 ${active ? 'bg-white' : 'bg-white/15 active:bg-white/25'}`}>
                <Text className={`text-[11px] font-semibold ${active ? 'text-primary' : 'text-white'}`}>{formatCurrency(quick, currency, 0)}</Text>
              </Pressable>;
            })}
          </View>
        </View>

        {/* Frequency */}
        <Text className="mb-2.5 mt-6 text-[13px] font-bold text-ink">How often does it arrive?</Text>
        <View className="flex-row flex-wrap gap-2.5">
          {frequencies.map((item) => {
            const selected = item.value === frequency;
            return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => { setFrequency(item.value); setError(null); }} className={`min-w-[46%] flex-1 rounded-2xl border p-3.5 active:opacity-80 ${selected ? 'border-primary bg-card' : 'border-border bg-card'}`} style={selected ? { borderWidth: 2 } : undefined}>
              <View className="flex-row items-center justify-between">
                <Text className={`text-[14px] font-bold ${selected ? 'text-primary' : 'text-ink'}`}>{PERIOD_LABEL[item.value]}</Text>
                <View className={`h-5 w-5 items-center justify-center rounded-full ${selected ? 'bg-primary' : 'border border-border'}`}>{selected && <Check size={12} color="white" strokeWidth={3} />}</View>
              </View>
              <Text className="mt-0.5 text-[11px] text-muted">{item.hint}</Text>
            </Pressable>;
          })}
        </View>

        {/* Repeat */}
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: recurring }} onPress={() => setRecurring((on) => !on)} className="mt-4 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5 active:opacity-80">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-light"><Repeat size={18} color={colors.primary} /></View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold text-ink">Repeat every {word}</Text>
            <Text className="mt-0.5 text-[11px] leading-4 text-muted">Add it and start a new budget automatically.</Text>
          </View>
          <View className={`h-7 w-12 justify-center rounded-full px-0.5 ${recurring ? 'bg-primary' : 'bg-border'}`}>
            <View className={`h-6 w-6 rounded-full bg-white ${recurring ? 'self-end' : 'self-start'}`} />
          </View>
        </Pressable>

        {/* Preview */}
        <View className="mt-6 rounded-3xl border border-border bg-card p-4">
          <View className="flex-row items-center gap-2"><Sparkles size={15} color={colors.accent} /><Text className="text-[13px] font-bold text-primary">Your plan</Text></View>
          <View className="mt-3 gap-3">
            <PreviewRow icon={<CalendarRange size={16} color={colors.primary} />} title={`First budget: ${shortDate(start)} – ${shortDate(end)}`} detail={`${days} ${days === 1 ? 'day' : 'days'} · ${recurring ? `a new one starts every ${word}` : 'one time only'}`} />
            <PreviewRow icon={<ShieldCheck size={16} color={colors.primary} />} title={validAmount ? (frequency === 'daily' ? `${money(value)} safe to spend today` : `About ${money(value / days)} safe to spend a day`) : 'Your safe-to-spend amount'} detail={validAmount ? 'Spend less one day and you get more the next.' : 'Enter your allowance to see it.'} />
            <PreviewRow icon={<PiggyBank size={16} color={colors.primary} />} title="Leftover goes to savings" detail={`Whatever you don’t spend this ${word} is saved for you.`} />
          </View>
        </View>

        {error && <View className="mt-4"><FormBanner message={error} /></View>}
      </ScrollView>

      <View className="border-t border-border bg-background px-5 pb-2 pt-3">
        <Pressable accessibilityRole="button" disabled={complete.isPending} onPress={submit} className={`h-[56px] items-center justify-center rounded-2xl bg-primary active:opacity-80 ${complete.isPending ? 'opacity-60' : ''}`}>
          <Text className="text-[15px] font-bold text-white">{complete.isPending ? 'Building your plan…' : validAmount ? `Build my plan · ${money(value)} / ${word}` : 'Build my plan'}</Text>
        </Pressable>
        <Text className="mt-2 text-center text-[11px] text-muted">You can change this any time in Budgets.</Text>
      </View>
    </SafeAreaView>
  );
}

function PreviewRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <View className="flex-row items-center gap-3">
    <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-light">{icon}</View>
    <View className="flex-1"><Text className="text-[13px] font-semibold text-ink">{title}</Text><Text className="mt-0.5 text-[11px] leading-4 text-muted">{detail}</Text></View>
  </View>;
}
