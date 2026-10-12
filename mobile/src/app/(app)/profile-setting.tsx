import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlarmClock,
  Banknote,
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  FileText,
  Gauge,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  Smartphone,
  Sun,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/app-alert';
import {
  cardShadow,
  ErrorBanner,
  Field,
  IconTile,
  InfoNote,
  PrimaryButton,
  SavedNote,
  SecondaryButton,
  SectionLabel,
  SettingsCard,
  SettingsHeader,
} from '@/components/settings-ui';
import { authApi } from '@/features/auth/api';
import { PasswordStrength, PASSWORD_RULES } from '@/features/auth/password-strength';
import { endDateFor, shortDate, toDateString } from '@/features/budgets/period';
import { accountApi, type Account } from '@/features/dashboard/api';
import { profileApi, type NotificationPreferences } from '@/features/profile/api';
import { budgetFrequencies, getBudgetFrequencyPreference, setBudgetFrequencyPreference, type BudgetFrequencyPreference } from '@/features/profile/budget-preferences';
import { CURRENCIES, deviceTimezone, timeIn, TIMEZONES, timezoneLabel } from '@/features/profile/options';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AMOUNT_PATTERN = /^\d+(\.\d{0,2})?$/;

const money = (amount: string | number, currency: string) => {
  const value = Number(amount);
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
};

const SECTIONS: Record<string, { title: string; subtitle: string }> = {
  personal: { title: 'Personal information', subtitle: 'Keep your name, email and timezone up to date.' },
  accounts: { title: 'Accounts', subtitle: 'Track where your money is held. Accounts never connect to your bank.' },
  currency: { title: 'Currency', subtitle: 'Choose how amounts appear. This changes display only and never converts your balances.' },
  notifications: { title: 'Notifications', subtitle: 'Pick the budget alerts and reminders you want to receive.' },
  'budget-period': { title: 'Budget period', subtitle: 'Choose how often a new spending plan starts by default.' },
  security: { title: 'Security', subtitle: 'Manage your password, signed-in devices and account.' },
  help: { title: 'Help center', subtitle: 'Quick answers, guides and a way to reach us.' },
};

export default function ProfileSettingScreen() {
  useStatusBarStyle('dark');
  const { section = 'personal' } = useLocalSearchParams<{ section?: string }>();
  const meta = SECTIONS[section] ?? { title: 'Settings', subtitle: '' };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-10">
        <SettingsHeader title={meta.title} subtitle={meta.subtitle} />
        {section === 'personal' && <PersonalSection />}
        {section === 'accounts' && <AccountsSection />}
        {section === 'currency' && <CurrencySection />}
        {section === 'notifications' && <NotificationsSection />}
        {section === 'budget-period' && <BudgetPeriodSection />}
        {section === 'security' && <SecuritySection />}
        {section === 'help' && <HelpSection />}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────────────── Personal information ───────────────────────── */

function PersonalSection() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Asia/Manila');
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const device = deviceTimezone();

  const nameError = touched && !name.trim() ? 'Enter your name.' : '';
  const emailError = touched && !EMAIL_PATTERN.test(email.trim()) ? 'Enter a valid email address.' : '';
  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
  const dirty = name.trim() !== user?.name || emailChanged || timezone !== user?.timezone;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
  const memberSince = user?.created_at ? new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(user.created_at)) : '—';

  // Keep the saved zone selectable even if it is not one of the common ones.
  const zones = useMemo(() => {
    const list: { id: string; label: string }[] = [...TIMEZONES];
    for (const extra of [user?.timezone, device]) {
      if (extra && !list.some((zone) => zone.id === extra)) list.unshift({ id: extra, label: timezoneLabel(extra) });
    }
    return list;
  }, [user?.timezone, device]);

  const save = useMutation({
    mutationFn: () => profileApi.update({ name: name.trim(), email: email.trim(), currency: user?.currency ?? 'PHP', timezone }),
    onSuccess: (updated) => { setUser(updated); setError(''); setSaved(true); setTouched(false); },
    onError: (failure) => setError(getErrorMessage(failure)),
  });

  function submit() {
    setTouched(true);
    setSaved(false);
    if (!name.trim() || !EMAIL_PATTERN.test(email.trim())) return;
    save.mutate();
  }

  return (
    <>
      <SettingsCard className="mt-6 items-center p-5">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Text className="text-[28px] font-extrabold text-white">{initials}</Text>
        </View>
        <Text numberOfLines={1} className="mt-3 text-[17px] font-bold text-ink">{name.trim() || 'Your name'}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[13px] text-muted">{email.trim() || 'you@example.com'}</Text>
        <View className="mt-4 w-full flex-row rounded-2xl bg-background p-3">
          <MiniStat label="Member since" value={memberSince} />
          <View className="mx-2 w-px bg-border" />
          <MiniStat label="Local time" value={timeIn(timezone) || '—'} />
        </View>
      </SettingsCard>

      <ErrorBanner message={error} />

      <SectionLabel>Your details</SectionLabel>
      <SettingsCard className="px-4 pb-5 pt-1">
        <Field
          label="Full name"
          Icon={UserRound}
          value={name}
          onChangeText={(value) => { setName(value); setSaved(false); }}
          placeholder="Your name"
          autoCapitalize="words"
          autoComplete="name"
          maxLength={100}
          error={nameError}
        />
        <Field
          label="Email address"
          Icon={Mail}
          value={email}
          onChangeText={(value) => { setEmail(value); setSaved(false); }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={emailError}
          hint={emailChanged ? 'You may need to verify the new address.' : undefined}
        />
      </SettingsCard>

      <SectionLabel>Timezone</SectionLabel>
      <Text className="-mt-1 mb-3 ml-1 text-[12px] leading-[18px] text-muted">Decides when your day starts, for daily limits and greetings.</Text>
      <SettingsCard className="px-4 py-1">
        {zones.map((zone, index) => {
          const selected = zone.id === timezone;
          const isDevice = zone.id === device;
          return (
            <Pressable
              key={zone.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => { setTimezone(zone.id); setSaved(false); }}
              className={`min-h-[58px] flex-row items-center gap-3 py-2.5 active:opacity-70 ${index < zones.length - 1 ? 'border-b border-[#F1F2F7]' : ''}`}>
              <IconTile Icon={isDevice ? MapPin : Clock} color={selected ? colors.accent : colors.textSecondary} size={36} />
              <View className="flex-1">
                <Text className={`text-[14px] ${selected ? 'font-bold text-primary' : 'font-semibold text-ink'}`}>{zone.label}</Text>
                <Text className="mt-0.5 text-[12px] text-muted">{isDevice ? 'This device · ' : ''}{timeIn(zone.id)}</Text>
              </View>
              <Radio selected={selected} />
            </Pressable>
          );
        })}
      </SettingsCard>

      <PrimaryButton title={save.isPending ? 'Saving…' : 'Save changes'} Icon={Check} onPress={submit} disabled={save.isPending || !dirty} />
      {saved && <SavedNote text="Your profile has been saved." />}
    </>
  );
}

/* ───────────────────────────── Accounts ───────────────────────────── */

const ACCOUNT_TYPES: { type: Account['type']; label: string; Icon: LucideIcon; color: string }[] = [
  { type: 'cash', label: 'Cash', Icon: Banknote, color: '#10B981' },
  { type: 'bank', label: 'Bank', Icon: Landmark, color: '#6C7CF7' },
  { type: 'wallet', label: 'E-wallet', Icon: Smartphone, color: '#0EA5E9' },
];
const accountStyle = (type: Account['type']) => ACCOUNT_TYPES.find((option) => option.type === type) ?? ACCOUNT_TYPES[0];

function AccountsSection() {
  const user = useAuthStore((state) => state.user);
  const currency = user?.currency ?? 'PHP';
  const queryClient = useQueryClient();
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const list = accounts.data ?? [];
  const total = list.reduce((sum, account) => sum + Number(account.balance), 0);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <>
      <View className="mt-6 overflow-hidden rounded-[28px]">
        <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
          <View pointerEvents="none" className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-accent opacity-25" />
          <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-white/60">Total across accounts</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit className="mt-2 text-[34px] font-extrabold tracking-tight text-white">
            {accounts.isPending ? '—' : money(total, currency)}
          </Text>
          {/* Share of the total held in each account type. */}
          {total > 0 && (
            <View className="mt-4 h-2 flex-row overflow-hidden rounded-full bg-white/15">
              {list.filter((account) => Number(account.balance) > 0).map((account, index) => (
                <View
                  key={account.id}
                  className="h-full"
                  style={{ width: `${(Number(account.balance) / total) * 100}%`, backgroundColor: accountStyle(account.type).color, marginLeft: index === 0 ? 0 : 2 }}
                />
              ))}
            </View>
          )}
          <Text className="mt-3 text-[12px] text-white/70">{list.length} {list.length === 1 ? 'account' : 'accounts'} · Tracked manually</Text>
        </LinearGradient>
      </View>

      {accounts.isError && <ErrorBanner message={getErrorMessage(accounts.error)} />}

      <SectionLabel>Your accounts</SectionLabel>
      {accounts.isPending ? (
        <SettingsCard className="items-center p-6"><ActivityIndicator color={colors.accent} /></SettingsCard>
      ) : (
        list.map((account) => (
          <AccountItem
            key={account.id}
            account={account}
            currency={currency}
            editing={editingId === account.id}
            onToggle={() => setEditingId(editingId === account.id ? null : account.id)}
            onChanged={() => { setEditingId(null); refresh(); }}
          />
        ))
      )}

      {adding ? (
        <SettingsCard className="mt-3 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[16px] font-bold text-ink">New account</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => setAdding(false)} className="h-8 w-8 items-center justify-center rounded-full bg-background">
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
          <AccountForm submitLabel="Add account" onDone={() => { setAdding(false); refresh(); }} />
        </SettingsCard>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => { setAdding(true); setEditingId(null); }}
          className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-3xl border-[1.5px] border-dashed border-accent/50 bg-accent-light/60 active:opacity-75">
          <Plus size={18} color={colors.primary} strokeWidth={2.4} />
          <Text className="text-[14px] font-bold text-primary">Add an account</Text>
        </Pressable>
      )}

      <InfoNote text="Deleting an account moves its transactions to your default account, so your history and balances stay complete." />
    </>
  );
}

function AccountItem({ account, currency, editing, onToggle, onChanged }: { account: Account; currency: string; editing: boolean; onToggle: () => void; onChanged: () => void }) {
  const style = accountStyle(account.type);
  const remove = useMutation({
    mutationFn: () => accountApi.remove(account.id),
    onSuccess: onChanged,
    onError: (failure) => showAlert('Could not delete account', getErrorMessage(failure)),
  });

  function confirmDelete() {
    showAlert(`Delete ${account.name}?`, 'Its transactions will move to your default account. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ], { icon: Trash2 });
  }

  return (
    <SettingsCard className="mb-3 p-4">
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${account.name}`} accessibilityState={{ expanded: editing }} onPress={onToggle} className="flex-row items-center active:opacity-70">
        <IconTile Icon={style.Icon} color={style.color} size={44} />
        <View className="ml-3 flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="shrink text-[15px] font-bold text-ink">{account.name}</Text>
            {account.is_default && (
              <View className="rounded-full bg-accent-light px-2 py-0.5"><Text className="text-[10px] font-bold text-primary">Default</Text></View>
            )}
          </View>
          <Text className="mt-0.5 text-[12px] text-muted">{style.label}</Text>
        </View>
        <Text className={`mr-2 text-[15px] font-bold ${Number(account.balance) < 0 ? 'text-error' : 'text-ink'}`}>{money(account.balance, currency)}</Text>
        {editing ? <ChevronDown size={18} color={colors.textSecondary} /> : <ChevronRight size={18} color={colors.textSecondary} />}
      </Pressable>

      {editing && (
        <View className="mt-2 border-t border-[#F1F2F7]">
          <AccountForm account={account} submitLabel="Save account" onDone={onChanged} />
          {!account.is_default && (
            <View className="mt-3">
              <SecondaryButton title={remove.isPending ? 'Deleting…' : 'Delete account'} Icon={Trash2} tone="danger" onPress={confirmDelete} disabled={remove.isPending} />
            </View>
          )}
        </View>
      )}
    </SettingsCard>
  );
}

/** Shared add/edit form. Without `account` it creates a new one. */
function AccountForm({ account, submitLabel, onDone }: { account?: Account; submitLabel: string; onDone: () => void }) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<Account['type']>(account?.type ?? 'wallet');
  const [opening, setOpening] = useState(account ? Number(account.opening_balance).toFixed(2) : '');
  const [error, setError] = useState('');
  const validAmount = opening === '' || AMOUNT_PATTERN.test(opening);

  const save = useMutation({
    mutationFn: () => {
      const input = { name: name.trim(), type, opening_balance: opening === '' ? '0.00' : opening };
      return account ? accountApi.update(account.id, input) : accountApi.create(input);
    },
    onSuccess: () => { setError(''); onDone(); },
    onError: (failure) => setError(getErrorMessage(failure)),
  });

  return (
    <>
      <ErrorBanner message={error} />
      <Field label="Account name" value={name} onChangeText={setName} placeholder="e.g. GCash, BPI savings" maxLength={60} />
      <Text className="mb-1.5 ml-0.5 mt-4 text-[13px] font-semibold text-ink">Type</Text>
      <View className="flex-row gap-2">
        {ACCOUNT_TYPES.map((option) => {
          const selected = option.type === type;
          return (
            <Pressable
              key={option.type}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setType(option.type)}
              className={`flex-1 items-center rounded-2xl border-[1.5px] py-3 ${selected ? 'border-primary bg-accent-light' : 'border-border bg-background'}`}>
              <option.Icon size={20} color={selected ? colors.primary : option.color} />
              <Text className={`mt-1.5 text-[12px] ${selected ? 'font-bold text-primary' : 'font-semibold text-ink'}`}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Field
        label="Starting balance"
        Icon={Banknote}
        value={opening}
        onChangeText={setOpening}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={validAmount ? undefined : 'Use numbers with up to 2 decimals.'}
        hint="What was in this account before you started tracking."
      />
      <PrimaryButton title={save.isPending ? 'Saving…' : submitLabel} Icon={Check} onPress={() => save.mutate()} disabled={save.isPending || !name.trim() || !validAmount} />
    </>
  );
}

/* ───────────────────────────── Currency ───────────────────────────── */

function CurrencySection() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const current = user?.currency ?? 'PHP';
  const term = query.trim().toLowerCase();
  const list = CURRENCIES.filter((c) => !term || c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term));

  function choose(code: string) {
    if (!user || code === current || pending) return;
    showAlert(`Show amounts in ${code}?`, 'Only the symbol and format change. Your amounts are not converted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change',
        onPress: async () => {
          setPending(code);
          try {
            const updated = await profileApi.update({ name: user.name, email: user.email, currency: code, timezone: user.timezone });
            setUser(updated);
            setError('');
            void queryClient.invalidateQueries();
          } catch (failure) {
            setError(getErrorMessage(failure));
          } finally {
            setPending(null);
          }
        },
      },
    ]);
  }

  return (
    <>
      <SettingsCard className="mt-6 p-5">
        <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-muted">Preview</Text>
        <Text className="mt-2 text-[30px] font-extrabold tracking-tight text-ink">{money(1234.5, current)}</Text>
        <Text className="mt-1 text-[13px] text-muted">This is how amounts look across PocketPlan.</Text>
      </SettingsCard>

      <ErrorBanner message={error} />

      <View style={cardShadow} className="mt-5 h-12 flex-row items-center rounded-2xl bg-card px-3.5">
        <Search size={17} color={colors.textSecondary} />
        <TextInput
          accessibilityLabel="Search currencies"
          value={query}
          onChangeText={setQuery}
          placeholder="Search currency or code"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          className="ml-2.5 flex-1 py-0 text-[14px] text-ink"
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} className="h-7 w-7 items-center justify-center rounded-full bg-background">
            <X size={14} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <SettingsCard className="mt-4 px-4 py-1">
        {list.length ? list.map((currency, index) => {
          const selected = currency.code === current;
          return (
            <Pressable
              key={currency.code}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => choose(currency.code)}
              className={`min-h-[62px] flex-row items-center gap-3 py-2.5 active:opacity-70 ${index < list.length - 1 ? 'border-b border-[#F1F2F7]' : ''}`}>
              <View className={`h-11 w-11 items-center justify-center rounded-2xl ${selected ? 'bg-accent-light' : 'bg-background'}`}>
                <Text className="text-[20px]">{currency.flag}</Text>
              </View>
              <View className="flex-1">
                <Text className={`text-[15px] ${selected ? 'font-bold text-primary' : 'font-semibold text-ink'}`}>{currency.code}</Text>
                <Text className="mt-0.5 text-[12px] text-muted">{currency.name}</Text>
              </View>
              <Text className="mr-2 text-[13px] font-semibold text-muted">{money(0, currency.code).replace(/[\d\s.,]/g, '') || currency.code}</Text>
              {pending === currency.code ? <ActivityIndicator size="small" color={colors.accent} /> : <Radio selected={selected} />}
            </Pressable>
          );
        }) : (
          <Text className="py-6 text-center text-[13px] text-muted">No currency matches “{query}”.</Text>
        )}
      </SettingsCard>
    </>
  );
}

/* ─────────────────────────── Notifications ─────────────────────────── */

const THRESHOLDS = [50, 70, 80, 90];

function NotificationsSection() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showTime, setShowTime] = useState(false);
  const prefs = useQuery({ queryKey: ['notification-preferences'], queryFn: profileApi.notifications });
  const data = prefs.data;

  // Optimistic: flip the switch now, roll back if the server refuses.
  const update = useMutation({
    mutationFn: (input: Partial<NotificationPreferences>) => profileApi.updateNotifications(input),
    onMutate: (input) => {
      const previous = queryClient.getQueryData<NotificationPreferences>(['notification-preferences']);
      if (previous) queryClient.setQueryData(['notification-preferences'], { ...previous, ...input });
      return { previous };
    },
    onSuccess: (saved) => { queryClient.setQueryData(['notification-preferences'], saved); setError(''); },
    onError: (failure, _input, context) => {
      if (context?.previous) queryClient.setQueryData(['notification-preferences'], context.previous);
      setError(getErrorMessage(failure));
    },
  });

  if (prefs.isPending) return <SettingsCard className="mt-6 items-center p-8"><ActivityIndicator color={colors.accent} /></SettingsCard>;
  if (!data) return <ErrorBanner message={prefs.isError ? getErrorMessage(prefs.error) : 'Your preferences could not be loaded.'} />;

  const keys = ['daily_warning', 'threshold_alert', 'budget_ending', 'budget_completed', 'daily_reminder'] as const;
  const onCount = keys.filter((key) => data[key]).length;
  const allOn = onCount === keys.length;
  const [hours, minutes] = data.reminder_time.split(':').map(Number);
  const reminderDate = new Date();
  reminderDate.setHours(hours || 20, minutes || 0, 0, 0);
  const reminderLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(reminderDate);

  return (
    <>
      <SettingsCard className="mt-6 flex-row items-center p-4">
        <IconTile Icon={BellRing} color={colors.accent} size={48} />
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-bold text-ink">{onCount} of {keys.length} alerts on</Text>
          <Text className="mt-0.5 text-[12px] text-muted">{allOn ? 'You will hear about everything.' : 'Turn on the ones that help you most.'}</Text>
        </View>
        <Switch
          accessibilityLabel="All notifications"
          value={allOn}
          onValueChange={(value) => update.mutate(Object.fromEntries(keys.map((key) => [key, value])))}
          trackColor={{ false: '#D9DEEA', true: colors.primary }}
          thumbColor="white"
        />
      </SettingsCard>

      <ErrorBanner message={error} />

      <SectionLabel>Budget alerts</SectionLabel>
      <SettingsCard className="px-4 py-1">
        <ToggleRow Icon={TriangleAlert} color="#F59E0B" title="Daily spending warning" detail="A heads-up when today's spending is high" value={data.daily_warning} onChange={(value) => update.mutate({ daily_warning: value })} />
        <ToggleRow Icon={Gauge} color="#EC4899" title="Budget threshold alert" detail={`When a budget reaches ${data.warning_threshold_percent}% used`} value={data.threshold_alert} onChange={(value) => update.mutate({ threshold_alert: value })} last={!data.threshold_alert} />
        {data.threshold_alert && (
          <View className="pb-4 pl-[52px]">
            <Text className="mb-2 text-[12px] font-semibold text-muted">Alert me at</Text>
            <View className="flex-row gap-2">
              {THRESHOLDS.map((percent) => {
                const selected = data.warning_threshold_percent === percent;
                return (
                  <Pressable
                    key={percent}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => update.mutate({ warning_threshold_percent: percent })}
                    className={`flex-1 items-center rounded-xl py-2 ${selected ? 'bg-primary' : 'bg-background'}`}>
                    <Text className={`text-[13px] font-bold ${selected ? 'text-white' : 'text-ink'}`}>{percent}%</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </SettingsCard>

      <SectionLabel>Plan updates</SectionLabel>
      <SettingsCard className="px-4 py-1">
        <ToggleRow Icon={CalendarClock} color="#8B5CF6" title="Budget ending soon" detail="Reminder before an active budget ends" value={data.budget_ending} onChange={(value) => update.mutate({ budget_ending: value })} />
        <ToggleRow Icon={CalendarCheck} color="#10B981" title="Budget completed" detail="Let me know when a budget period closes" value={data.budget_completed} onChange={(value) => update.mutate({ budget_completed: value })} last />
      </SettingsCard>

      <SectionLabel>Daily habit</SectionLabel>
      <SettingsCard className="px-4 py-1">
        <ToggleRow Icon={AlarmClock} color="#0EA5E9" title="Daily reminder" detail="A gentle nudge to record today's activity" value={data.daily_reminder} onChange={(value) => update.mutate({ daily_reminder: value })} last={!data.daily_reminder} />
        {data.daily_reminder && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reminder time, ${reminderLabel}. Change`}
            onPress={() => setShowTime(true)}
            className="mb-4 ml-[52px] flex-row items-center justify-between rounded-2xl bg-background px-4 py-3 active:opacity-70">
            <View className="flex-row items-center gap-2">
              <Sun size={16} color={colors.accent} />
              <Text className="text-[13px] font-semibold text-muted">Remind me at</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-[15px] font-bold text-primary">{reminderLabel}</Text>
              <ChevronRight size={16} color={colors.primary} />
            </View>
          </Pressable>
        )}
      </SettingsCard>

      <InfoNote text="Notifications appear in the app. Make sure PocketPlan is allowed to send notifications in your phone settings." />

      {showTime && (
        <DateTimePicker
          value={reminderDate}
          mode="time"
          presentation="dialog"
          accentColor={colors.primary}
          onValueChange={(_event, date) => {
            setShowTime(false);
            if (date) update.mutate({ reminder_time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` });
          }}
          onDismiss={() => setShowTime(false)}
        />
      )}
    </>
  );
}

/* ─────────────────────────── Budget period ─────────────────────────── */

const PERIOD_OPTIONS: Record<BudgetFrequencyPreference, { Icon: LucideIcon; color: string; description: string }> = {
  daily: { Icon: Sun, color: '#F59E0B', description: 'A fresh plan for each day' },
  weekly: { Icon: CalendarDays, color: '#6C7CF7', description: 'A new plan every seven days' },
  monthly: { Icon: CalendarRange, color: '#10B981', description: 'Plan around a monthly allowance' },
  yearly: { Icon: CalendarCheck, color: '#8B5CF6', description: 'A longer-term annual limit' },
};

function BudgetPeriodSection() {
  const user = useAuthStore((state) => state.user);
  const [frequency, setFrequency] = useState<BudgetFrequencyPreference>('weekly');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const today = toDateString(new Date());

  useEffect(() => {
    let active = true;
    if (user?.id) {
      void getBudgetFrequencyPreference(user.id)
        .then((value) => { if (active) setFrequency(value); })
        .catch((failure) => { if (active) setError(getErrorMessage(failure)); });
    }
    return () => { active = false; };
  }, [user?.id]);

  async function choose(value: BudgetFrequencyPreference) {
    if (!user?.id) return;
    try {
      await setBudgetFrequencyPreference(user.id, value);
      setFrequency(value);
      setSaved(true);
      setError('');
    } catch (failure) {
      setError(getErrorMessage(failure));
    }
  }

  const end = endDateFor(today, frequency);

  return (
    <>
      <SettingsCard className="mt-6 p-5">
        <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-muted">If you started a budget today</Text>
        <Text className="mt-2 text-[24px] font-extrabold tracking-tight text-ink">
          {frequency === 'daily' ? shortDate(today) : `${shortDate(today)} – ${shortDate(end)}`}
        </Text>
        <Text className="mt-1 text-[13px] capitalize text-muted">{frequency} plan</Text>
      </SettingsCard>

      <ErrorBanner message={error} />

      <View className="mt-5 gap-3">
        {budgetFrequencies.map((option) => {
          const selected = frequency === option;
          const style = PERIOD_OPTIONS[option];
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => void choose(option)}
              style={cardShadow}
              className={`flex-row items-center gap-3.5 rounded-3xl border-2 bg-card p-4 active:opacity-80 ${selected ? 'border-primary' : 'border-transparent'}`}>
              <IconTile Icon={style.Icon} color={style.color} size={46} />
              <View className="flex-1">
                <Text className="text-[15px] font-bold capitalize text-ink">{option}</Text>
                <Text className="mt-0.5 text-[12px] text-muted">{style.description}</Text>
              </View>
              <Radio selected={selected} />
            </Pressable>
          );
        })}
      </View>

      <InfoNote text="This applies to new budgets on this device. Existing budgets keep their current dates and schedule." />
      {saved && <SavedNote text="Default budget period saved." />}
    </>
  );
}

/* ───────────────────────────── Security ───────────────────────────── */

function SecuritySection() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [error, setError] = useState('');
  const [devicesMessage, setDevicesMessage] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const meetsRules = PASSWORD_RULES.every((rule) => rule.test(newPassword));
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const sameAsOld = newPassword.length > 0 && newPassword === currentPassword;

  const changePassword = useMutation({
    mutationFn: () => profileApi.changePassword({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword }),
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); setPasswordSaved(true); },
    onError: (failure) => setError(getErrorMessage(failure)),
  });
  const revoke = useMutation({
    mutationFn: profileApi.revokeOtherSessions,
    onSuccess: () => setDevicesMessage('Other devices have been signed out.'),
    onError: (failure) => setDevicesMessage(getErrorMessage(failure)),
  });
  const deleteAccount = useMutation({
    mutationFn: () => profileApi.deleteAccount(deletePassword),
    onSuccess: () => void clearSession(),
    onError: (failure) => setDeleteError(getErrorMessage(failure)),
  });

  // The forgot-password screen is only reachable signed out, so email the link from here.
  const resetLink = useMutation({
    mutationFn: () => authApi.forgotPassword({ email: user?.email ?? '' }),
    onSuccess: (message) => showAlert('Check your email', message || `We sent a reset link to ${user?.email}.`, undefined, { tone: 'success', icon: Mail }),
    onError: (failure) => showAlert('Could not send link', getErrorMessage(failure)),
  });

  function sendResetLink() {
    showAlert('Reset your password?', `We'll email a reset link to ${user?.email}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send link', onPress: () => resetLink.mutate() },
    ], { icon: LockKeyhole });
  }

  function confirmDelete() {
    showAlert('Delete your account?', 'All of your transactions, budgets, goals and accounts will be permanently deleted. This cannot be undone.', [
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Delete forever', style: 'destructive', onPress: () => deleteAccount.mutate() },
    ], { icon: Trash2 });
  }

  return (
    <>
      <SectionLabel>Password</SectionLabel>
      <SettingsCard className="px-4 pb-5 pt-1">
        <ErrorBanner message={error} />
        <Field label="Current password" Icon={LockKeyhole} password value={currentPassword} onChangeText={(value) => { setCurrentPassword(value); setPasswordSaved(false); }} placeholder="Current password" autoComplete="current-password" />
        <Field
          label="New password"
          Icon={LockKeyhole}
          password
          value={newPassword}
          onChangeText={(value) => { setNewPassword(value); setPasswordSaved(false); }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={sameAsOld ? 'Choose a password different from your current one.' : undefined}
        />
        <PasswordStrength password={newPassword} />
        <Field
          label="Confirm new password"
          Icon={LockKeyhole}
          password
          value={confirmPassword}
          onChangeText={(value) => { setConfirmPassword(value); setPasswordSaved(false); }}
          placeholder="Enter it again"
          autoComplete="new-password"
          error={mismatch ? 'Passwords do not match.' : undefined}
          hint={confirmPassword && !mismatch ? 'Passwords match.' : undefined}
        />
        <PrimaryButton
          title={changePassword.isPending ? 'Updating…' : 'Update password'}
          Icon={Check}
          onPress={() => changePassword.mutate()}
          disabled={changePassword.isPending || !currentPassword || !meetsRules || mismatch || !confirmPassword || sameAsOld}
        />
        {passwordSaved && <SavedNote text="Your password has been changed." />}
        <Pressable accessibilityRole="button" onPress={sendResetLink} disabled={resetLink.isPending} className="mt-4 self-center py-1">
          <Text className="text-[13px] font-semibold text-accent">{resetLink.isPending ? 'Sending…' : 'Forgot your current password?'}</Text>
        </Pressable>
      </SettingsCard>

      <SectionLabel>Signed-in devices</SectionLabel>
      <SettingsCard className="p-4">
        <View className="flex-row items-center">
          <IconTile Icon={Smartphone} color={colors.positiveText} size={44} />
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold text-ink">This device</Text>
            <Text className="mt-0.5 text-[12px] text-muted">Signed in now · Stays signed in</Text>
          </View>
          <View className="rounded-full bg-positive px-2.5 py-1"><Text className="text-[11px] font-bold text-positive-text">Active</Text></View>
        </View>
        <View className="mt-4">
          <SecondaryButton
            title={revoke.isPending ? 'Signing out…' : 'Sign out all other devices'}
            Icon={ShieldAlert}
            disabled={revoke.isPending}
            onPress={() => showAlert('Sign out other devices?', 'Other phones and tablets will need to sign in again.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out devices', style: 'destructive', onPress: () => revoke.mutate() },
            ], { icon: Smartphone })}
          />
        </View>
        {devicesMessage ? <Text className="mt-3 text-center text-[12px] font-medium text-muted">{devicesMessage}</Text> : null}
      </SettingsCard>

      <InfoNote text="Two-step verification is not available yet. You can turn on biometric unlock from Profile & settings on this device." />

      <SectionLabel>Danger zone</SectionLabel>
      <View className="rounded-3xl border-[1.5px] border-error/30 bg-card p-4">
        <View className="flex-row items-center">
          <IconTile Icon={Trash2} color={colors.error} size={44} />
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold text-ink">Delete account</Text>
            <Text className="mt-0.5 text-[12px] leading-[17px] text-muted">Permanently remove your account and all your data.</Text>
          </View>
        </View>
        {showDelete ? (
          <>
            <InfoNote tone="warning" text="Export your data first if you want to keep a copy. Signed in with Google? Use “Forgot your current password?” to set a password first." />
            <ErrorBanner message={deleteError} />
            <Field label="Your password" Icon={LockKeyhole} password value={deletePassword} onChangeText={setDeletePassword} placeholder="Confirm it's you" />
            <Field label='Type "DELETE" to confirm' value={deleteConfirm} onChangeText={setDeleteConfirm} placeholder="DELETE" autoCapitalize="characters" />
            <PrimaryButton
              title={deleteAccount.isPending ? 'Deleting…' : 'Delete my account'}
              Icon={Trash2}
              tone="danger"
              onPress={confirmDelete}
              disabled={deleteAccount.isPending || !deletePassword || deleteConfirm.trim() !== 'DELETE'}
            />
            <Pressable onPress={() => { setShowDelete(false); setDeletePassword(''); setDeleteConfirm(''); setDeleteError(''); }} className="mt-3 self-center py-1">
              <Text className="text-[13px] font-semibold text-muted">Cancel</Text>
            </Pressable>
          </>
        ) : (
          <View className="mt-4">
            <SecondaryButton title="Delete my account" tone="danger" onPress={() => setShowDelete(true)} />
          </View>
        )}
      </View>
    </>
  );
}

/* ───────────────────────────── Help center ───────────────────────────── */

const FAQS: { topic: string; question: string; answer: string }[] = [
  { topic: 'Basics', question: 'How do I add a transaction?', answer: 'On Home, tap Expense or Income. Enter the amount, pick a category and date, then save. It counts in the budget for that date.' },
  { topic: 'Basics', question: 'What does “Safe to spend today” mean?', answer: 'It is what is left of your budget divided by the days remaining, minus what you already spent today. Stay under it and your budget lasts the whole period.' },
  { topic: 'Budgets', question: 'What does “Left to assign” mean?', answer: 'Your budget is split into categories like Food and Transportation. “Left to assign” is the part that has not been given a category yet.' },
  { topic: 'Budgets', question: 'What happens to money I don’t spend?', answer: 'When a budget period closes, unspent allowance is moved to your savings automatically, so you can see what you saved each period.' },
  { topic: 'Savings', question: 'How do savings goals work?', answer: 'Create a goal with a target and optionally a starting amount. Contributions move money from an account into savings without counting as spending.' },
  { topic: 'Accounts', question: 'Does PocketPlan connect to my bank?', answer: 'No. Accounts are tracked manually. PocketPlan never asks for your banking password.' },
  { topic: 'Accounts', question: 'What happens when I delete an account?', answer: 'Its transactions move to your default account, so your history and balances stay complete. The default account cannot be deleted.' },
  { topic: 'Data', question: 'How can I export my data?', answer: 'Open Profile & settings and choose Export your data. PocketPlan creates a CSV you can save or share.' },
  { topic: 'Data', question: 'Can I change my currency later?', answer: 'Yes, from Profile & settings › Currency. Only the symbol and format change; your amounts are not converted.' },
];

function HelpSection() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<number | null>(0);
  const term = query.trim().toLowerCase();
  const results = FAQS.map((faq, index) => ({ ...faq, index })).filter((faq) => !term || faq.question.toLowerCase().includes(term) || faq.answer.toLowerCase().includes(term));

  return (
    <>
      <View className="mt-6 overflow-hidden rounded-[28px]">
        <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/how-it-works')} className="flex-row items-center gap-3.5 p-5 active:opacity-85">
            <View pointerEvents="none" className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-accent opacity-25" />
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <CircleHelp size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-bold text-white">How PocketPlan works</Text>
              <Text className="mt-0.5 text-[12px] leading-[17px] text-white/75">The whole flow in 5 steps, plus what each word means.</Text>
            </View>
            <ChevronRight size={18} color="white" />
          </Pressable>
        </LinearGradient>
      </View>

      <View style={cardShadow} className="mt-5 h-12 flex-row items-center rounded-2xl bg-card px-3.5">
        <Search size={17} color={colors.textSecondary} />
        <TextInput
          accessibilityLabel="Search help"
          value={query}
          onChangeText={setQuery}
          placeholder="Search for an answer"
          placeholderTextColor={colors.textSecondary}
          className="ml-2.5 flex-1 py-0 text-[14px] text-ink"
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} className="h-7 w-7 items-center justify-center rounded-full bg-background">
            <X size={14} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <SectionLabel>{term ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Frequently asked'}</SectionLabel>
      <SettingsCard className="px-4 py-1">
        {results.length ? results.map((faq, position) => {
          const open = expanded === faq.index || term.length > 0;
          return (
            <Pressable
              key={faq.question}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setExpanded(expanded === faq.index ? null : faq.index)}
              className={`py-4 ${position < results.length - 1 ? 'border-b border-[#F1F2F7]' : ''}`}>
              <View className="flex-row items-center">
                <View className="flex-1 pr-3">
                  <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-accent">{faq.topic}</Text>
                  <Text className="mt-1 text-[14px] font-semibold text-ink">{faq.question}</Text>
                </View>
                <View className={`h-7 w-7 items-center justify-center rounded-full ${open ? 'bg-primary' : 'bg-background'}`}>
                  {open ? <ChevronDown size={15} color="white" /> : <ChevronRight size={15} color={colors.primary} />}
                </View>
              </View>
              {open ? <Text className="mt-2.5 text-[13px] leading-5 text-muted">{faq.answer}</Text> : null}
            </Pressable>
          );
        }) : (
          <View className="items-center py-7">
            <Text className="text-[14px] font-semibold text-ink">No answers found</Text>
            <Text className="mt-1 text-center text-[12px] text-muted">Try other words, or contact us below.</Text>
          </View>
        )}
      </SettingsCard>

      <SectionLabel>Still need help?</SectionLabel>
      <SettingsCard className="px-4 py-1">
        <LinkRow Icon={Mail} color="#0EA5E9" title="Email support" detail="support@pocketplan.app" onPress={() => void Linking.openURL('mailto:support@pocketplan.app?subject=PocketPlan%20support').catch(() => showAlert('Email unavailable', 'Add an email app to contact support.', undefined, { tone: 'warning', icon: Mail }))} />
        <LinkRow Icon={FileText} color="#687086" title="Privacy & terms" detail="How PocketPlan handles your data" onPress={() => router.push('/legal')} last />
      </SettingsCard>
    </>
  );
}

/* ───────────────────────────── Small pieces ───────────────────────────── */

function Radio({ selected }: { selected: boolean }) {
  return selected ? (
    <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
      <Check size={14} color="white" strokeWidth={3} />
    </View>
  ) : (
    <View className="h-6 w-6 rounded-full border-2 border-[#D9DEEA]" />
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-[11px] text-muted">{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className="mt-0.5 text-[13px] font-bold text-ink">{value}</Text>
    </View>
  );
}

function ToggleRow({ Icon, color, title, detail, value, onChange, last = false }: { Icon: LucideIcon; color: string; title: string; detail: string; value: boolean; onChange: (value: boolean) => void; last?: boolean }) {
  return (
    <View className={`min-h-[70px] flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <IconTile Icon={Icon} color={color} />
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-ink">{title}</Text>
        <Text className="mt-0.5 text-[12px] leading-[17px] text-muted">{detail}</Text>
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ false: '#D9DEEA', true: colors.primary }} thumbColor="white" />
    </View>
  );
}

function LinkRow({ Icon, color, title, detail, onPress, last = false }: { Icon: LucideIcon; color: string; title: string; detail: string; onPress: () => void; last?: boolean }): ReactNode {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={`min-h-[66px] flex-row items-center gap-3 py-3 active:opacity-70 ${last ? '' : 'border-b border-[#F1F2F7]'}`}>
      <IconTile Icon={Icon} color={color} />
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-ink">{title}</Text>
        <Text className="mt-0.5 text-[12px] text-muted">{detail}</Text>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </Pressable>
  );
}
