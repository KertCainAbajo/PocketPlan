import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { Bell, CalendarDays, ChevronRight, CircleHelp, Download, FileText, Fingerprint, Globe, Mail, ShieldCheck, UserRound, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { profileApi } from '@/features/profile/api';
import { AppBottomBar } from '@/components/app-bottom-bar';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const BIOMETRIC_KEY = 'pocketplan.biometric-unlock';

export default function ProfileScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const initials = user?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PP';

  useEffect(() => {
    void SecureStore.getItemAsync(BIOMETRIC_KEY).then((value) => setBiometricEnabled(value === 'true'));
  }, []);

  async function toggleBiometric(value: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (value) {
        const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
        if (!hardware || !enrolled) {
          Alert.alert('Biometrics unavailable', 'Set up Face ID or a fingerprint on this device before enabling biometric unlock.');
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm biometric unlock', cancelLabel: 'Cancel' });
        if (!result.success) return;
      }
      await SecureStore.setItemAsync(BIOMETRIC_KEY, String(value));
      setBiometricEnabled(value);
    } catch (error) {
      Alert.alert('Could not update setting', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    if (busy) return;
    setBusy(true);
    try {
      const csv = await profileApi.exportTransactions();
      if (!FileSystem.cacheDirectory) throw new Error('File storage is unavailable on this device.');
      const fileUri = `${FileSystem.cacheDirectory}pocketplan-transactions.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export your PocketPlan data' });
      else Alert.alert('Export ready', 'The CSV file was saved to temporary storage, but sharing is unavailable on this device.');
    } catch (error) {
      Alert.alert('Could not export data', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-5">
      <Text className="pt-3 text-[24px] font-bold tracking-tight text-primary">Profile &amp; settings</Text>

      <View className="mt-3 rounded-[18px] bg-white p-3.5">
        <View className="flex-row items-center gap-2.5">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary"><Text className="text-[13px] font-semibold text-white">{initials}</Text></View>
          <View className="flex-1"><Text className="text-[12px] font-semibold text-primary">{user?.name ?? 'PocketPlan user'}</Text><Text className="mt-0.5 text-[9px] text-muted">{user?.email ?? ''}</Text></View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/profile-setting', params: { section: 'personal' } })} className="mt-2.5 self-start"><Text className="text-[10px] font-bold text-primary">Edit profile →</Text></Pressable>
      </View>

      <SectionTitle>Account</SectionTitle>
      <SettingsGroup>
        <SettingsRow icon={<UserRound size={15} color={colors.primary} />} title="Personal information" subtitle="Name and email address" onPress={() => router.push({ pathname: '/profile-setting', params: { section: 'personal' } })} />
        <SettingsRow icon={<Wallet size={15} color={colors.primary} />} title="Accounts" subtitle="Everyday account · Manual tracking" onPress={() => router.push({ pathname: '/profile-setting', params: { section: 'accounts' } })} />
        <SettingsRow icon={<Globe size={15} color={colors.primary} />} title="Currency" subtitle={`${user?.currency ?? 'PHP'} · Display currency`} onPress={() => router.push({ pathname: '/profile-setting', params: { section: 'currency' } })} last />
      </SettingsGroup>

      <SectionTitle>Preferences &amp; security</SectionTitle>
      <SettingsGroup>
        <SettingsRow icon={<Bell size={15} color={colors.primary} />} title="Notifications" subtitle="Budget alerts and daily reminders" onPress={() => router.push({ pathname: '/profile-setting', params: { section: 'notifications' } })} />
        <SettingsRow icon={<CalendarDays size={15} color={colors.primary} />} title="Budget period" subtitle="Choose daily, weekly, monthly or yearly" onPress={() => router.push({ pathname: '/profile-setting', params: { section: 'budget-period' } })} />
        <SettingsRow icon={<Fingerprint size={15} color={colors.primary} />} title="Biometric unlock" subtitle={`${biometricEnabled ? 'On' : 'Off'} · Use your fingerprint or face`} accessory={<Switch accessibilityLabel="Biometric unlock" value={biometricEnabled} onValueChange={(value) => void toggleBiometric(value)} disabled={busy} trackColor={{ false: '#D9DEEA', true: colors.primary }} thumbColor="white" />} />
        <SettingsRow icon={<ShieldCheck size={15} color={colors.primary} />} title="Security" subtitle="Password and signed-in devices" onPress={() => router.push({ pathname: '/profile-setting', params: { section: 'security' } })} />
        <SettingsRow icon={<Download size={15} color={colors.primary} />} title="Export your data" subtitle={busy ? 'Preparing your CSV…' : 'Download transactions as CSV'} onPress={() => void exportData()} last />
      </SettingsGroup>

      <SectionTitle>Here to help</SectionTitle>
      <SettingsGroup>
        <SettingsRow icon={<CircleHelp size={15} color={colors.primary} />} title="Help center" subtitle="Answers, guides and getting started" onPress={() => router.push({ pathname: '/profile-setting', params: { section: 'help' } })} />
        <SettingsRow icon={<Mail size={15} color={colors.primary} />} title="Contact support" subtitle="A real person, when you need one" onPress={() => void Linking.openURL('mailto:support@pocketplan.app?subject=PocketPlan%20support').catch(() => Alert.alert('Email unavailable', 'Add an email app to contact support.'))} />
        <SettingsRow icon={<FileText size={15} color={colors.primary} />} title="Privacy & terms" subtitle="Review how PocketPlan works" onPress={() => router.push('/legal')} last />
      </SettingsGroup>

      <Pressable accessibilityRole="button" onPress={confirmSignOut} className="mt-3 min-h-11 items-center justify-center rounded-[11px] bg-accent-light active:opacity-70"><Text className="text-[11px] font-bold text-primary">Sign out</Text></Pressable>
      <Text className="mb-1 mt-3 text-center text-[9px] text-muted">PocketPlan v{Constants.expoConfig?.version ?? '1.0.0'} · Made for real life.</Text>
    </ScrollView>
    <AppBottomBar active="profile" />
  </SafeAreaView>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2 mt-3.5 text-[13px] font-medium text-primary">{children}</Text>;
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return <View className="rounded-[17px] bg-white px-3.5 py-1">{children}</View>;
}

function SettingsRow({ icon, title, subtitle, onPress, accessory, last = false }: { icon: React.ReactNode; title: string; subtitle: string; onPress?: () => void; accessory?: React.ReactNode; last?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} className={`min-h-[58px] flex-row items-center gap-2.5 ${last ? '' : 'border-b border-[#F0F1F5]'}`}>
    <View className="w-5 items-center">{icon}</View>
    <View className="flex-1"><Text className="text-[10px] font-medium text-ink">{title}</Text><Text className="mt-0.5 text-[8px] text-muted">{subtitle}</Text></View>
    {accessory ?? (onPress ? <ChevronRight size={14} color={colors.primary} /> : null)}
  </Pressable>;
}

