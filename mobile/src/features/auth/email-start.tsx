import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { ArrowRight, BadgeCheck, Fingerprint, KeyRound, Mail, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { TextField } from '@/components/ui/text-field';
import { getErrorMessage } from '@/lib/api-client';
import { colors } from '@/theme/colors';

import { authApi } from './api';
import { useGoogleSignIn } from './use-google-sign-in';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Soft, navy-tinted elevation for the form card. */
const cardShadow = { shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * First step of sign-in and sign-up: just an email address. We email a
 * 6-digit code and continue on the verify-code screen. Google stays available.
 */
export function EmailStart({ mode }: { mode: 'signin' | 'signup' }) {
  const google = useGoogleSignIn();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const signup = mode === 'signup';
  const cleanEmail = email.trim().toLowerCase();
  const invalid = !EMAIL_PATTERN.test(cleanEmail);

  const sendCode = useMutation({
    mutationFn: () => authApi.requestEmailCode(cleanEmail),
    onSuccess: ({ resendSeconds }) =>
      router.push({ pathname: '/verify-code', params: { email: cleanEmail, mode, resend: String(resendSeconds) } }),
  });

  function submit() {
    setTouched(true);
    if (!invalid) sendCode.mutate();
  }

  return (
    <AuthLayout
      eyebrow={signup ? undefined : `${greeting()} 👋`}
      title={signup ? 'Create your account' : 'Welcome back'}
      subtitle={signup ? 'No password needed. We’ll email you a code to get started.' : 'Enter your email and we’ll send you a sign-in code.'}
      highlights={signup ? [
        { icon: BadgeCheck, label: 'Free forever' },
        { icon: Wallet, label: 'No bank login' },
        { icon: ShieldCheck, label: 'Private' },
      ] : undefined}>
      <FormBanner message={sendCode.isError ? getErrorMessage(sendCode.error) : null} />

      <View style={cardShadow} className="rounded-3xl bg-card px-4 pb-1 pt-5">
        <TextField
          label="Email"
          icon={Mail}
          value={email}
          onChangeText={(value) => { setEmail(value); sendCode.reset(); }}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={touched && invalid ? 'Enter a valid email address.' : undefined}
        />
      </View>

      <Button label={sendCode.isPending ? 'Sending code…' : 'Continue with email'} icon={ArrowRight} loading={sendCode.isPending} disabled={google.isPending} onPress={submit} className="mt-5" />

      <View className="my-6 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs font-medium uppercase tracking-widest text-muted">or</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <GoogleButton label={signup ? 'Sign up with Google' : 'Continue with Google'} onPress={google.start} loading={google.isPending} />
      <Text className="mt-2.5 text-center text-xs leading-[18px] text-muted">
        {signup ? 'By continuing you agree to the ' : 'New here? Continuing creates your account and means you agree to the '}
        <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>Terms & Privacy</Text>.
      </Text>
      <View className="mt-3">
        <FormBanner message={google.notice} tone="info" />
        <FormBanner message={google.error} />
      </View>

      {!signup && (
        <Link href="/password-login" asChild>
          <Pressable accessibilityRole="link" className="mt-1 flex-row items-center gap-1.5 self-center p-2 active:opacity-70">
            <KeyRound size={15} color={colors.accent} />
            <Text className="text-[14px] font-semibold text-accent">Use password instead</Text>
          </Pressable>
        </Link>
      )}

      <View className="mt-5 flex-row items-center justify-center gap-5">
        <TrustItem Icon={ShieldCheck} label="Secure sign-in" />
        <View className="h-3 w-px bg-border" />
        <TrustItem Icon={Fingerprint} label="Private by design" />
      </View>

      <View className="mt-6 flex-row items-center justify-center rounded-2xl bg-accent-light px-4 py-3.5">
        <Text className="text-[14px] text-primary/75">{signup ? 'Already have an account? ' : 'Don’t have an account? '}</Text>
        <Link href={signup ? '/login' : '/register'} replace asChild>
          <Text accessibilityRole="link" className="text-[14px] font-bold text-primary">{signup ? 'Sign in' : 'Create account'}</Text>
        </Link>
      </View>
    </AuthLayout>
  );
}

function TrustItem({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon size={14} color={colors.positiveText} strokeWidth={2.2} />
      <Text className="text-[12px] font-semibold text-muted">{label}</Text>
    </View>
  );
}
