import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, MailCheck, RotateCw, UserRound } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormBanner } from '@/components/ui/form-banner';
import { TextField } from '@/components/ui/text-field';
import { authApi } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const CODE_LENGTH = 6;

/** Soft, navy-tinted elevation for the form card. */
const cardShadow = { shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 };

/**
 * Step two of email sign-in / sign-up: type the 6-digit code from the email.
 * A new email then adds a name and accepts the terms to create the account.
 */
export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{ email?: string; mode?: string; resend?: string }>();
  const email = params.email ?? '';
  const signIn = useAuthStore((s) => s.signIn);
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'code' | 'name'>('code');
  const [name, setName] = useState('');
  const [terms, setTerms] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [cooldown, setCooldown] = useState(Number(params.resend) || 60);
  const [notice, setNotice] = useState<string | null>(null);

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = useMutation({
    // The code is passed in, not read from state: the last digit's state update hasn't rendered yet when it auto-submits.
    mutationFn: ({ value, withName }: { value: string; withName: boolean }) =>
      authApi.verifyEmailCode({ email, code: value, ...(withName ? { name: name.trim(), terms } : {}) }),
    onSuccess: async (result) => {
      if (result.needsName) {
        setStep('name');
        return;
      }
      await signIn(result.payload.token, result.payload.user);
    },
    onError: () => {
      // A wrong or expired code: clear the boxes so the next try starts fresh.
      if (step === 'code') {
        setCode('');
        input.current?.focus();
      }
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.requestEmailCode(email),
    onSuccess: ({ resendSeconds }) => {
      setCooldown(resendSeconds);
      setCode('');
      setStep('code');
      verify.reset();
      setNotice('We sent a new code. The old one no longer works.');
    },
  });

  function changeCode(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setNotice(null);
    verify.reset();
    if (digits.length === CODE_LENGTH) verify.mutate({ value: digits, withName: false });
  }

  function createAccount() {
    setAttempted(true);
    if (!name.trim() || !terms) return;
    verify.mutate({ value: code, withName: true });
  }

  if (step === 'name') {
    return (
      <AuthLayout eyebrow="Email verified ✓" title="Almost there" subtitle="What should we call you?">
        <FormBanner message={verify.isError ? getErrorMessage(verify.error) : null} />
        <View style={cardShadow} className="rounded-3xl bg-card px-4 pb-1 pt-5">
          <TextField
            label="Your name"
            icon={UserRound}
            value={name}
            onChangeText={setName}
            placeholder="Juan Dela Cruz"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={100}
            returnKeyType="done"
            error={attempted && !name.trim() ? 'Enter your name.' : undefined}
          />
          <Checkbox checked={terms} onChange={setTerms} accessibilityLabel="I agree to the Terms of Service and Privacy Policy" error={attempted && !terms ? 'Please accept the Terms of Service and Privacy Policy to continue.' : undefined}>
            <Text className="text-sm leading-5 text-muted">
              I agree to the <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>Terms of Service</Text> and{' '}
              <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>Privacy Policy</Text>.
            </Text>
          </Checkbox>
        </View>
        <Button label="Create my account" icon={ArrowRight} loading={verify.isPending} onPress={createAccount} className="mt-5" />
        <Text className="mt-4 text-center text-[13px] text-muted">Signing up as <Text className="font-semibold text-ink">{email}</Text></Text>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Check your email" subtitle={`Enter the 6-digit code we sent to ${email}.`}>
      <View style={cardShadow} className="items-center rounded-3xl bg-card px-4 pb-6 pt-6">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-light">
          <MailCheck size={26} color={colors.accent} />
        </View>

        {/* One hidden input drives the six boxes, so paste and SMS/email autofill work. */}
        <Pressable accessibilityLabel="Enter the 6-digit code" onPress={() => input.current?.focus()} className="mt-5 flex-row gap-2">
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const active = i === code.length && !verify.isPending;
            const filled = i < code.length;
            return (
              <View
                key={i}
                className={`h-14 w-12 items-center justify-center rounded-2xl border-2 ${verify.isError ? 'border-error bg-error-bg' : active ? 'border-accent bg-accent-light/50' : filled ? 'border-primary bg-card' : 'border-border bg-background'}`}>
                <Text className="text-[24px] font-bold text-ink">{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={input}
          value={code}
          onChangeText={changeCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          caretHidden
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        />

        <Text accessibilityLiveRegion="polite" className={`mt-4 text-center text-[13px] ${verify.isError ? 'font-semibold text-error' : 'text-muted'}`}>
          {verify.isPending ? 'Checking your code…' : verify.isError ? getErrorMessage(verify.error) : 'The code expires in 10 minutes.'}
        </Text>
      </View>

      <View className="mt-4">
        <FormBanner message={notice} tone="success" />
        <FormBanner message={resend.isError ? getErrorMessage(resend.error) : null} />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={cooldown > 0 || resend.isPending}
        onPress={() => resend.mutate()}
        className="mt-1 flex-row items-center justify-center gap-2 self-center rounded-full px-4 py-2.5 active:opacity-70">
        <RotateCw size={15} color={cooldown > 0 ? colors.textSecondary : colors.accent} />
        <Text className={`text-[14px] font-semibold ${cooldown > 0 ? 'text-muted' : 'text-accent'}`}>
          {resend.isPending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.back()} className="mt-2 self-center px-4 py-2">
        <Text className="text-[14px] font-semibold text-primary">Use a different email</Text>
      </Pressable>

      <Text className="mt-6 text-center text-[12px] leading-[18px] text-muted">
        Can’t find it? Check your spam or promotions folder.
      </Text>
    </AuthLayout>
  );
}
