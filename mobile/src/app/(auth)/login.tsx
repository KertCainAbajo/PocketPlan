import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { LockKeyhole, Mail } from 'lucide-react-native';
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

export default function LoginScreen() {
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

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see today's spending plan.">
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

      <Button label="Sign in" loading={login.isPending} onPress={onSubmit} />

      <View className="mt-8 flex-row items-center gap-3">
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
