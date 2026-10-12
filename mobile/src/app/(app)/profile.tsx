import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Fingerprint,
  Globe,
  LogOut,
  Mail,
  Pencil,
  Share2,
  ShieldCheck,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/app-alert';
import { AppBottomBar } from '@/components/app-bottom-bar';
import { BrandMark } from '@/components/brand-mark';
import { cardShadow, IconTile } from '@/components/settings-ui';
import { accountApi } from '@/features/dashboard/api';
import { profileApi } from '@/features/profile/api';
import { getBudgetFrequencyPreference, type BudgetFrequencyPreference } from '@/features/profile/budget-preferences';
import { currencyName, timezoneLabel } from '@/features/profile/options';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const BIOMETRIC_KEY = 'pocketplan.biometric-unlock';
const LIGHT_ACCENT = '#AEB8FF';

const money = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};

const openSetting = (section: string) => router.push({ pathname: '/profile-setting', params: { section } });

export default function ProfileScreen() {
  useStatusBarStyle('dark');
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetFrequencyPreference | null>(null);
  const currency = user?.currency ?? 'PHP';
  const initials = user?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PP';
  const memberSince = user?.created_at ? new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(user.created_at)) : '—';

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list });
  const notifications = useQuery({ queryKey: ['notification-preferences'], queryFn: profileApi.notifications });
  const totalBalance = (accounts.data ?? []).reduce((sum, account) => sum + Number(account.balance), 0);
  const alertsOn = notifications.data
    ? [notifications.data.daily_warning, notifications.data.threshold_alert, notifications.data.budget_ending, notifications.data.budget_completed, notifications.data.daily_reminder].filter(Boolean).length
    : null;

  useEffect(() => {
    void SecureStore.getItemAsync(BIOMETRIC_KEY).then((value) => setBiometricEnabled(value === 'true'));
  }, []);

  useEffect(() => {
    if (user?.id) void getBudgetFrequencyPreference(user.id).then(setBudgetPeriod).catch(() => setBudgetPeriod(null));
  }, [user?.id]);

  async function toggleBiometric(value: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (value) {
        const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
        if (!hardware || !enrolled) {
          showAlert('Biometrics unavailable', 'Set up Face ID or a fingerprint on this device before enabling biometric unlock.', undefined, { tone: 'warning', icon: Fingerprint });
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm biometric unlock', cancelLabel: 'Cancel' });
        if (!result.success) return;
      }
      await SecureStore.setItemAsync(BIOMETRIC_KEY, String(value));
      setBiometricEnabled(value);
    } catch (error) {
      showAlert('Could not update setting', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = await profileApi.exportTransactions();
      if (!FileSystem.cacheDirectory) throw new Error('File storage is unavailable on this device.');
      const fileUri = `${FileSystem.cacheDirectory}pocketplan-transactions.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export your PocketPlan data' });
      else showAlert('Export ready', 'The CSV file was saved to temporary storage, but sharing is unavailable on this device.', undefined, { tone: 'success', icon: Download });
    } catch (error) {
      showAlert('Could not export data', getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  function shareApp() {
    void Share.share({ message: 'I plan my allowance with PocketPlan: a simple budget and daily safe-to-spend guide for students.' });
  }

  function contactSupport() {
    void Linking.openURL('mailto:support@pocketplan.app?subject=PocketPlan%20support').catch(() => showAlert('Email unavailable', 'Add an email app to contact support.', undefined, { tone: 'warning', icon: Mail }));
  }

  function confirmSignOut() {
    showAlert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ], { icon: LogOut });
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-2">
          <BrandMark size={34} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notification settings"
            onPress={() => openSetting('notifications')}
            style={cardShadow}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-card active:bg-accent-light">
            <Bell size={19} color={colors.primary} strokeWidth={1.9} />
          </Pressable>
        </View>

        <Text className="mt-5 text-[26px] font-extrabold tracking-tight text-ink">Profile &amp; settings</Text>

        {/* Profile hero */}
        <View className="mt-4 overflow-hidden rounded-[30px]">
          <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
            <View pointerEvents="none" className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-accent opacity-25" />
            <View pointerEvents="none" className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-white opacity-[0.04]" />

            <View className="flex-row items-center">
              <View className="h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-white/25 bg-accent">
                <Text className="text-[22px] font-extrabold text-white">{initials}</Text>
              </View>
              <View className="ml-4 flex-1">
                <Text numberOfLines={1} className="text-[19px] font-bold text-white">{user?.name ?? 'PocketPlan user'}</Text>
                <Text numberOfLines={1} className="mt-0.5 text-[13px] text-white/70">{user?.email ?? ''}</Text>
                <View className="mt-2 flex-row items-center gap-1.5 self-start rounded-full bg-white/15 px-2.5 py-1">
                  <Globe size={11} color="white" />
                  <Text className="text-[11px] font-semibold text-white">{currency} · {timezoneLabel(user?.timezone)}</Text>
                </View>
              </View>
            </View>

            <View className="mt-5 flex-row rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3">
              <HeroStat label="Total balance" value={accounts.data ? money(totalBalance, currency) : '—'} />
              <View className="mx-2 w-px bg-white/10" />
              <HeroStat label="Accounts" value={accounts.data ? String(accounts.data.length) : '—'} />
              <View className="mx-2 w-px bg-white/10" />
              <HeroStat label="Member since" value={memberSince} />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => openSetting('personal')}
              className="mt-4 h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 active:opacity-70">
              <Pencil size={14} color="white" />
              <Text className="text-[13px] font-semibold text-white">Edit profile</Text>
            </Pressable>
          </LinearGradient>
        </View>

        <SectionTitle>Account</SectionTitle>
        <Group>
          <Row Icon={UserRound} color="#6C7CF7" title="Personal information" subtitle="Name, email and timezone" onPress={() => openSetting('personal')} />
          <Row
            Icon={Wallet}
            color="#10B981"
            title="Accounts"
            subtitle={accounts.data ? `${accounts.data.length} ${accounts.data.length === 1 ? 'account' : 'accounts'} · ${money(totalBalance, currency)} total` : 'Cash, bank and e-wallets'}
            onPress={() => openSetting('accounts')}
          />
          <Row Icon={Globe} color="#0EA5E9" title="Currency" subtitle={`${currency} · ${currencyName(currency)}`} onPress={() => openSetting('currency')} last />
        </Group>

        <SectionTitle>Preferences</SectionTitle>
        <Group>
          <Row
            Icon={Bell}
            color="#F59E0B"
            title="Notifications"
            subtitle={alertsOn === null ? 'Budget alerts and daily reminders' : `${alertsOn} of 5 alerts on`}
            onPress={() => openSetting('notifications')}
          />
          <Row
            Icon={CalendarDays}
            color="#8B5CF6"
            title="Budget period"
            subtitle={budgetPeriod ? `New budgets start ${budgetPeriod}` : 'Choose daily, weekly, monthly or yearly'}
            onPress={() => openSetting('budget-period')}
            last
          />
        </Group>

        <SectionTitle>Privacy &amp; security</SectionTitle>
        <Group>
          <Row
            Icon={Fingerprint}
            color="#EC4899"
            title="Biometric unlock"
            subtitle={biometricEnabled ? 'On · Fingerprint or face' : 'Off · Use your fingerprint or face'}
            accessory={<Switch accessibilityLabel="Biometric unlock" value={biometricEnabled} onValueChange={(value) => void toggleBiometric(value)} disabled={busy} trackColor={{ false: '#D9DEEA', true: colors.primary }} thumbColor="white" />}
          />
          <Row Icon={ShieldCheck} color="#243B6B" title="Security" subtitle="Password, devices and account deletion" onPress={() => openSetting('security')} />
          <Row
            Icon={Download}
            color="#14B8A6"
            title="Export your data"
            subtitle={exporting ? 'Preparing your CSV…' : 'Download transactions as CSV'}
            onPress={() => void exportData()}
            accessory={exporting ? <ActivityIndicator size="small" color={colors.accent} /> : undefined}
            last
          />
        </Group>

        <SectionTitle>Support</SectionTitle>
        <Group>
          <Row Icon={CircleHelp} color="#6C7CF7" title="Help center" subtitle="Answers, guides and getting started" onPress={() => openSetting('help')} />
          <Row Icon={Mail} color="#0EA5E9" title="Contact support" subtitle="A real person, when you need one" onPress={contactSupport} />
          <Row Icon={Share2} color="#10B981" title="Tell a friend" subtitle="Share PocketPlan with classmates" onPress={shareApp} />
          <Row Icon={FileText} color="#687086" title="Privacy & terms" subtitle="Review how PocketPlan works" onPress={() => router.push('/legal')} last />
        </Group>

        <Pressable
          accessibilityRole="button"
          onPress={confirmSignOut}
          className="mt-7 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-error-bg active:opacity-75">
          <LogOut size={17} color={colors.error} strokeWidth={2.2} />
          <Text className="text-[15px] font-bold text-error">Sign out</Text>
        </Pressable>

        <View className="mt-6 items-center">
          <BrandMark size={22} />
          <Text className="mt-2 text-[12px] text-muted">Version {Constants.expoConfig?.version ?? '1.0.0'} · Made for real life.</Text>
        </View>
      </ScrollView>

      <AppBottomBar active="profile" />
    </SafeAreaView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] text-white/60">{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className="mt-1 text-sm font-bold text-white">{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text className="mb-2.5 ml-1 mt-7 text-[12px] font-bold uppercase tracking-[1px] text-muted">{children}</Text>;
}

function Group({ children }: { children: ReactNode }) {
  return <View style={cardShadow} className="rounded-3xl bg-card px-4 py-1">{children}</View>;
}

function Row({ Icon, color, title, subtitle, onPress, accessory, last = false }: { Icon: LucideIcon; color: string; title: string; subtitle: string; onPress?: () => void; accessory?: ReactNode; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      className={`min-h-[68px] flex-row items-center gap-3.5 py-3 active:opacity-70 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <IconTile Icon={Icon} color={color} />
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink">{title}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[12px] text-muted">{subtitle}</Text>
      </View>
      {accessory ?? (onPress ? <ChevronRight size={18} color={LIGHT_ACCENT} strokeWidth={2.4} /> : null)}
    </Pressable>
  );
}
