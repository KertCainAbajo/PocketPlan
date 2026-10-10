import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { Fingerprint, LockKeyhole, Mail, ShieldCheck } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { FormField } from '@/components/form-field';
import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { authApi } from '@/features/auth/api';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { useGoogleSignIn } from '@/features/auth/use-google-sign-in';
import { applyServerErrors } from '@/lib/form-errors';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const google = useGoogleSignIn();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, setFocus } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ token, user }) => signIn(token, user),
    onError: (error) => setFormError(applyServerErrors(error, setError, ['email', 'password'])),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values);
  });

  const busy = login.isPending || google.isPending;

  return (
    <AuthLayout eyebrow={`${greeting()} 👋`} title="Welcome back" subtitle="Sign in to see what you can safely spend today.">
      <GoogleButton onPress={google.start} loading={google.isPending} />
      <Text className="mt-2.5 text-center text-xs leading-[18px] text-muted">
        New here? Continuing with Google creates your account and means you agree to the{' '}
        <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>
          Terms & Privacy
        </Text>
        .
      </Text>
      <View className="mt-3">
        <FormBanner message={google.notice} tone="info" />
        <FormBanner message={google.error} />
      </View>

      <View className="mb-5 mt-2 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs font-medium uppercase tracking-widest text-muted">or with email</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <FormBanner message={formError} />

      <FormField
        control={control}
        name="email"
        label="Email"
        icon={Mail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus('password')}
      />
      <FormField
        control={control}
        name="password"
        label="Password"
        icon={LockKeyhole}
        placeholder="Your password"
        password
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <Link href="/forgot-password" asChild>
        <Text accessibilityRole="link" className="-mt-1 mb-6 self-end py-1 text-sm font-semibold text-accent">
          Forgot password?
        </Text>
      </Link>

      <Button label="Sign in" loading={login.isPending} disabled={busy} onPress={onSubmit} />

      <View className="mt-5 flex-row justify-center gap-2">
        <TrustBadge icon={<ShieldCheck size={13} color={colors.positiveText} />} label="Secure sign-in" />
        <TrustBadge icon={<Fingerprint size={13} color={colors.positiveText} />} label="Private by design" />
      </View>

      <View className="mt-7 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs text-muted">New to PocketPlan?</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      <Link href="/register" replace asChild>
        <Text accessibilityRole="link" className="mt-3 self-center p-2 text-[15px] font-bold text-accent">
          Create a free account
        </Text>
      </Link>
    </AuthLayout>
  );
}

function TrustBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-positive px-2.5 py-1">
      {icon}
      <Text className="text-[11px] font-semibold text-positive-text">{label}</Text>
    </View>
  );
}
