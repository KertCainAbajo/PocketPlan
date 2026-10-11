import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { onboardingApi, type AllowanceFrequency } from '@/features/auth/onboarding-api';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const frequencies: { value: AllowanceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const currencies = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'HKD', 'AUD', 'CAD'];

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function OnboardingScreen() {
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<AllowanceFrequency>('weekly');
  const [currency, setCurrency] = useState(user?.currency ?? 'PHP');
  const [recurring, setRecurring] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const value = amount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) {
      setError('Enter an allowance greater than zero, with up to two decimal places.');
      return;
    }
    complete.mutate({ currency, allowance_amount: value, frequency, start_date: localDate(), recurring });
  };

  if (user?.is_onboarded) return <Redirect href="/" />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow px-5 pb-8 pt-2">
        <View className="flex-row items-center justify-between">
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-card">
            <ArrowLeft size={19} color={colors.primary} />
          </Pressable>
          <BrandMark size={32} />
          <View className="w-10" />
        </View>

        <View className="mt-8">
          <Text className="text-xs font-semibold uppercase tracking-widest text-accent">A quick first step</Text>
          <Text className="mt-2 text-[27px] font-bold leading-8 text-primary">Set up your plan</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">Tell PocketPlan when your money arrives. You can change your plan later.</Text>
        </View>

        <View className="mt-7 rounded-2xl bg-card p-4">
          <Text className="text-sm font-semibold text-ink">Allowance amount</Text>
          <View className="mt-3 flex-row items-center rounded-xl border border-border bg-white px-3">
            <TextInput
              accessibilityLabel="Allowance amount"
              value={amount}
              onChangeText={(value) => { setAmount(value.replace(',', '.')); setError(null); }}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              className="h-14 flex-1 text-2xl font-bold text-primary"
            />
            <Pressable accessibilityRole="button" accessibilityLabel={`Currency ${currency}, tap to switch`} onPress={() => setCurrency((value) => currencies[(currencies.indexOf(value) + 1) % currencies.length])} className="rounded-lg bg-accent-light px-3 py-2">
              <Text className="text-xs font-bold text-primary">{currency} ↻</Text>
            </Pressable>
          </View>
          <Text className="mt-2 text-xs text-muted">Tap the currency to choose from supported currencies.</Text>

          <Text className="mb-2 mt-6 text-sm font-semibold text-ink">How often do you receive it?</Text>
          <View className="flex-row gap-2">
            {frequencies.map((item) => {
              const selected = item.value === frequency;
              return <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFrequency(item.value)} className={`h-11 flex-1 flex-row items-center justify-center gap-1 rounded-xl ${selected ? 'bg-primary' : 'bg-accent-light'}`}>
                <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-primary'}`}>{item.label}</Text>
                {selected && <Check size={13} color="white" />}
              </Pressable>;
            })}
          </View>

          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: recurring }} onPress={() => setRecurring((value) => !value)} className="mt-5 flex-row items-center gap-3 py-1">
            <View className={`h-5 w-5 items-center justify-center rounded-md border ${recurring ? 'border-primary bg-primary' : 'border-muted bg-white'}`}>
              {recurring && <Check size={13} color="white" />}
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-ink">Repeat this allowance</Text>
              <Text className="mt-0.5 text-xs text-muted">Automatically add it on the same schedule.</Text>
            </View>
          </Pressable>
        </View>

        {error && <View className="mt-4"><FormBanner message={error} /></View>}
        <Button label="Build my plan" onPress={submit} loading={complete.isPending} className="mt-5" />
        <Text className="mt-3 text-center text-xs text-muted">This creates your first budget and allowance entry.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
