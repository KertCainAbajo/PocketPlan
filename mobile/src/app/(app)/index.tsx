import { useQuery } from '@tanstack/react-query';
import { Hammer, LogOut, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { authApi } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

/**
 * Temporary home for the Phase 4 milestone: proves the signed-in session works
 * end to end. Replaced by the budget dashboard and tab bar in Phase 5.
 */
export default function HomeScreen() {
  const storedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const signOut = useAuthStore((s) => s.signOut);
  const [signingOut, setSigningOut] = useState(false);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await authApi.me();
      setUser(user);
      return user;
    },
    initialData: storedUser ?? undefined,
  });

  const user = me.data;
  const firstName = user?.name.split(' ')[0] ?? 'there';

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need your email and password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        refreshControl={<RefreshControl refreshing={me.isRefetching} onRefresh={me.refetch} tintColor={colors.accent} />}>
        <View className="flex-row items-center justify-between pt-3">
          <BrandMark />
        </View>

        <Text className="mt-8 text-sm text-muted">Hello,</Text>
        <Text className="text-3xl font-bold text-ink">{firstName} 👋</Text>

        {me.isError && <View className="mt-4"><FormBanner message={getErrorMessage(me.error)} /></View>}

        <View className="mt-6 rounded-3xl bg-primary p-5">
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={18} color={colors.card} />
            <Text className="text-sm font-semibold text-white">Signed in securely</Text>
          </View>
          <Text className="mt-3 text-lg font-semibold text-white">{user?.name}</Text>
          <Text className="text-sm text-white/75">{user?.email}</Text>
          <View className="mt-4 flex-row gap-2">
            <Chip label={`Currency: ${user?.currency ?? '—'}`} />
            <Chip label={user?.timezone ?? '—'} />
          </View>
        </View>

        <View className="mt-4 flex-row gap-3 rounded-3xl border border-border bg-card p-5">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-light">
            <Hammer size={20} color={colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink">Your budget dashboard is next</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">
              Allowance setup, daily limits, expenses and reports are being added in the next build of this app.
            </Text>
          </View>
        </View>

        <Button label="Sign out" variant="secondary" loading={signingOut} onPress={confirmSignOut} className="mt-8" />
        <View className="mt-2 flex-row items-center justify-center gap-1.5">
          <LogOut size={14} color={colors.textSecondary} />
          <Text className="text-xs text-muted">Signing out removes this device&apos;s access token.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-white/15 px-3 py-1">
      <Text className="text-xs font-medium text-white">{label}</Text>
    </View>
  );
}
