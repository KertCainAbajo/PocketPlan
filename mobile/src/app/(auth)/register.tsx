import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { AuthHeader } from '@/components/auth-header';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { Screen } from '@/components/ui/screen';
import { authApi } from '@/features/auth/api';
import { registerSchema, serverFieldMap, type RegisterInput } from '@/features/auth/schemas';
import { applyServerErrors } from '@/lib/form-errors';
import { useAuthStore } from '@/store/auth-store';

const FIELDS = ['name', 'email', 'password', 'passwordConfirmation'] as const;

export default function RegisterScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirmation: '' },
  });

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ token, user }) => signIn(token, user),
    onError: (error) => setFormError(applyServerErrors(error, setError, FIELDS, serverFieldMap)),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    register.mutate(values);
  });

  return (
    <Screen scroll>
      <AuthHeader title="Create your account" subtitle="Start planning your allowance in under a minute." />

      <FormBanner message={formError} />

      <FormField control={control} name="name" label="Full name" placeholder="Juan Dela Cruz" autoComplete="name" textContentType="name" />
      <FormField
        control={control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <FormField
        control={control}
        name="password"
        label="Password"
        placeholder="At least 8 characters, with a number"
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormField
        control={control}
        name="passwordConfirmation"
        label="Confirm password"
        placeholder="Type your password again"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <Button label="Create account" loading={register.isPending} onPress={onSubmit} className="mt-2" />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm text-muted">Already have an account? </Text>
        <Link href="/login" replace asChild>
          <Text accessibilityRole="link" className="text-sm font-semibold text-accent">
            Sign in
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
