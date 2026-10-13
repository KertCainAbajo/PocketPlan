import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ArrowRight, Fingerprint, LockKeyhole, Mail, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { authApi } from '@/features/auth/api';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { applyServerErrors } from '@/lib/form-errors';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

/** Soft, navy-tinted elevation for the form card. */
const cardShadow = { shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Sign in with email and password, for people who prefer it (or have no access to their inbox). */
export default function PasswordLoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
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

  const busy = login.isPending;

  return (
    <AuthLayout eyebrow={`${greeting()} 👋`} title="Sign in with password" subtitle="Use the password you set for PocketPlan.">
      <FormBanner message={formError} />

      <View style={cardShadow} className="rounded-3xl bg-card px-4 pb-2 pt-5">
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
          <Text accessibilityRole="link" className="-mt-1 mb-2 self-end py-1 text-sm font-semibold text-accent">
            Forgot password?
          </Text>
        </Link>
      </View>

      <Button label="Sign in" icon={ArrowRight} loading={login.isPending} disabled={busy} onPress={onSubmit} className="mt-5" />

      <View className="mt-5 flex-row items-center justify-center gap-5">
        <TrustItem Icon={ShieldCheck} label="Secure sign-in" />
        <View className="h-3 w-px bg-border" />
        <TrustItem Icon={Fingerprint} label="Private by design" />
      </View>

      <View className="mt-7 flex-row items-center justify-center rounded-2xl bg-accent-light px-4 py-3.5">
        <Text className="text-[14px] text-primary/75">No password? </Text>
        <Link href="/login" replace asChild>
          <Text accessibilityRole="link" className="text-[14px] font-bold text-primary">
            Get a code by email
          </Text>
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
