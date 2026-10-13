import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinDots, PinKeypad } from '@/components/pin-pad';
import { SettingsHeader } from '@/components/settings-ui';
import { PIN_LENGTH, removePin, setPin, verifyPin } from '@/features/security/app-lock';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';

type Mode = 'create' | 'change' | 'remove';
type Step = 'current' | 'new' | 'confirm';

const COPY: Record<Step, { title: string; body: string }> = {
  current: { title: 'Enter your current PIN', body: 'Confirm it’s you before making changes.' },
  new: { title: 'Create a 4-digit PIN', body: 'You’ll use it to open PocketPlan. Avoid easy ones like 1234.' },
  confirm: { title: 'Confirm your PIN', body: 'Enter the same 4 digits again.' },
};

/** Weak PINs that are easy to guess: all the same digit or a straight run. */
const isWeak = (pin: string) => /^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin);

/** Create, change or remove the PocketPlan PIN. */
export default function PinSetupScreen() {
  useStatusBarStyle('dark');
  const { mode: rawMode } = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = rawMode === 'change' || rawMode === 'remove' ? rawMode : 'create';
  const [step, setStep] = useState<Step>(mode === 'create' ? 'new' : 'current');
  const [pin, setPinValue] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const fail = (message: string) => {
    setError(message);
    setErrorKey((key) => key + 1);
    setTimeout(() => setPinValue(''), 350);
  };

  async function complete(value: string) {
    setBusy(true);
    try {
      if (step === 'current') {
        if (!(await verifyPin(value))) return fail('That PIN is not right. Try again.');
        if (mode === 'remove') {
          await removePin();
          router.back();
          return;
        }
        setStep('new');
        setPinValue('');
        setError('');
      } else if (step === 'new') {
        if (isWeak(value)) return fail('That PIN is too easy to guess. Choose another.');
        setFirstPin(value);
        setStep('confirm');
        setPinValue('');
        setError('');
      } else {
        if (value !== firstPin) {
          setStep('new');
          setFirstPin('');
          return fail('The PINs didn’t match. Start again.');
        }
        await setPin(value);
        router.back();
      }
    } finally {
      setBusy(false);
    }
  }

  function addDigit(digit: string) {
    if (busy || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPinValue(next);
    if (error) setError('');
    if (next.length === PIN_LENGTH) void complete(next);
  }

  const title = mode === 'remove' ? 'Remove PIN' : mode === 'change' ? 'Change PIN' : 'Create a PIN';
  const steps: Step[] = mode === 'create' ? ['new', 'confirm'] : mode === 'change' ? ['current', 'new', 'confirm'] : ['current'];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pb-6">
        <SettingsHeader title={title} />

        {steps.length > 1 && (
          <View className="mt-5 flex-row gap-2">
            {steps.map((item, index) => (
              <View key={item} className={`h-1.5 flex-1 rounded-full ${steps.indexOf(step) >= index ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </View>
        )}

        <View className="mt-10 items-center">
          <Text className="text-center text-[20px] font-extrabold tracking-tight text-ink">{COPY[step].title}</Text>
          <Text accessibilityLiveRegion="polite" className={`mt-2 text-center text-[14px] leading-5 ${error ? 'font-semibold text-error' : 'text-muted'}`}>
            {error || COPY[step].body}
          </Text>
          <View className="mt-8">
            <PinDots length={pin.length} errorKey={errorKey} error={Boolean(error)} />
          </View>
        </View>

        <View className="mt-auto">
          <PinKeypad disabled={busy} onDigit={addDigit} onDelete={() => setPinValue((value) => value.slice(0, -1))} />
        </View>
      </View>
    </SafeAreaView>
  );
}
