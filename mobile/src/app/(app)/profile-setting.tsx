import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, LockKeyhole, Plus, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { accountApi, type Account } from '@/features/dashboard/api';
import { profileApi, type NotificationPreferences } from '@/features/profile/api';
import { budgetFrequencies, getBudgetFrequencyPreference, setBudgetFrequencyPreference, type BudgetFrequencyPreference } from '@/features/profile/budget-preferences';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const currencies = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'HKD', 'AUD', 'CAD'];

export default function ProfileSettingScreen() {
  useStatusBarStyle('dark');
  const { section = 'personal' } = useLocalSearchParams<{ section?: string }>();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<Account['type']>('bank');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [expandedHelp, setExpandedHelp] = useState<number | null>(0);
  const [budgetFrequency, setBudgetFrequency] = useState<BudgetFrequencyPreference>('weekly');
  const [budgetFrequencySaved, setBudgetFrequencySaved] = useState(false);

  const accountQuery = useQuery({ queryKey: ['accounts'], queryFn: accountApi.list, enabled: section === 'accounts' });
  const notifications = useQuery({ queryKey: ['notification-preferences'], queryFn: profileApi.notifications, enabled: section === 'notifications' });

  useEffect(() => {
    let active = true;
    if (section === 'budget-period' && user?.id) {
      void getBudgetFrequencyPreference(user.id).then((frequency) => { if (active) setBudgetFrequency(frequency); }).catch((failure) => { if (active) setError(getErrorMessage(failure)); });
    }
    return () => { active = false; };
  }, [section, user?.id]);

  const savePersonal = useMutation({
    mutationFn: () => profileApi.update({ name: name.trim(), email: email.trim(), currency: user?.currency ?? 'PHP' }),
    onSuccess: (updated) => { setUser(updated); setError(''); Alert.alert('Profile updated', 'Your personal information has been saved.'); },
    onError: (failure) => setError(getErrorMessage(failure)),
  });
  const addAccount = useMutation({
    mutationFn: () => accountApi.create({ name: accountName.trim(), type: accountType, opening_balance: openingBalance }),
    onSuccess: () => { setAccountName(''); setOpeningBalance('0.00'); setError(''); void queryClient.invalidateQueries({ queryKey: ['accounts'] }); },
    onError: (failure) => setError(getErrorMessage(failure)),
  });
  const updateNotifications = useMutation({
    mutationFn: (input: Partial<NotificationPreferences>) => profileApi.updateNotifications(input),
    onSuccess: (data) => { queryClient.setQueryData(['notification-preferences'], data); setError(''); },
    onError: (failure) => setError(getErrorMessage(failure)),
  });
  const changePassword = useMutation({
    mutationFn: () => profileApi.changePassword({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword }),
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); Alert.alert('Password updated', 'Your password has been changed.'); },
    onError: (failure) => setError(getErrorMessage(failure)),
  });

  const titles: Record<string, string> = {
    personal: 'Personal information', accounts: 'Accounts', currency: 'Currency', notifications: 'Notifications', 'budget-period': 'Budget period', security: 'Security', help: 'Help center',
  };

  async function changeBudgetFrequency(frequency: BudgetFrequencyPreference) {
    if (!user?.id) return;
    try {
      await setBudgetFrequencyPreference(user.id, frequency);
      setBudgetFrequency(frequency);
      setBudgetFrequencySaved(true);
      setError('');
    } catch (failure) { setError(getErrorMessage(failure)); }
  }

  async function changeCurrency(currency: string) {
    if (!user || currency === user.currency) return;
    try {
      const updated = await profileApi.update({ name: user.name, email: user.email, currency });
      setUser(updated);
      Alert.alert('Currency updated', `Amounts will now display in ${currency}. No amounts were converted.`);
    } catch (failure) { setError(getErrorMessage(failure)); }
  }

  async function revokeSessions() {
    try { await profileApi.revokeOtherSessions(); Alert.alert('Done', 'Other signed-in devices have been signed out.'); }
    catch (failure) { setError(getErrorMessage(failure)); }
  }

  return <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="grow px-5 pb-8">
      <Pressable accessibilityRole="button" onPress={() => router.back()} className="mb-4 mt-3 flex-row items-center gap-2"><ArrowLeft size={17} color={colors.primary} /><Text className="text-[18px] font-bold text-primary">{titles[section] ?? 'Settings'}</Text></Pressable>

      {error ? <View className="mb-3 rounded-xl bg-errorBg px-3 py-2"><Text className="text-[11px] text-error">{error}</Text></View> : null}

      {section === 'personal' && <>
        <Text className="mb-3 text-[11px] text-muted">Keep your account details up to date.</Text>
        <Label>Full name</Label><Field value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
        <Label>Email address</Label><Field value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <InfoBox text="Changing your email address may require verifying the new address." />
        <PrimaryButton title={savePersonal.isPending ? 'Saving…' : 'Save changes'} onPress={() => savePersonal.mutate()} disabled={savePersonal.isPending || !name.trim() || !email.trim()} />
      </>}

      {section === 'accounts' && <>
        <Text className="mb-3 text-[11px] text-muted">Accounts track where your money is held. They do not connect to your bank.</Text>
        {accountQuery.data?.map((account) => <AccountCard key={account.id} account={account} currency={user?.currency ?? 'PHP'} />)}
        {accountQuery.isError ? <Text className="mb-3 text-[11px] text-error">{getErrorMessage(accountQuery.error)}</Text> : null}
        <View className="mt-4 rounded-[17px] bg-white p-4">
          <Text className="mb-3 text-[13px] font-bold text-primary">Add an account</Text>
          <Label>Account name</Label><Field value={accountName} onChangeText={setAccountName} placeholder="e.g. Everyday account" />
          <Label>Account type</Label>
          <View className="mb-3 flex-row gap-2">{(['cash', 'bank', 'wallet'] as const).map((type) => <Choice key={type} title={type[0].toUpperCase() + type.slice(1)} selected={accountType === type} onPress={() => setAccountType(type)} />)}</View>
          <Label>Starting balance</Label><Field value={openingBalance} onChangeText={setOpeningBalance} placeholder="0.00" keyboardType="decimal-pad" />
          <PrimaryButton title={addAccount.isPending ? 'Adding…' : 'Add account'} icon={<Plus size={15} color="white" />} onPress={() => addAccount.mutate()} disabled={addAccount.isPending || !accountName.trim() || !/^\d+(\.\d{0,2})?$/.test(openingBalance)} />
        </View>
      </>}

      {section === 'currency' && <>
        <Text className="mb-4 text-[11px] leading-4 text-muted">Choose how amounts appear throughout PocketPlan. This changes display only; it does not convert your balances.</Text>
        <View className="overflow-hidden rounded-[17px] bg-white px-4">{currencies.map((currency, index) => <Pressable key={currency} onPress={() => void changeCurrency(currency)} className={`min-h-12 flex-row items-center justify-between ${index < currencies.length - 1 ? 'border-b border-[#F0F1F5]' : ''}`}><Text className="text-[12px] font-medium text-ink">{currency}</Text>{currency === user?.currency ? <Check size={16} color={colors.accent} /> : <ChevronRight size={15} color={colors.textSecondary} />}</Pressable>)}</View>
      </>}

      {section === 'notifications' && <>
        <Text className="mb-3 text-[11px] text-muted">Choose which budget updates and reminders you want in the app.</Text>
        {notifications.isPending ? <InfoBox text="Loading your notification preferences…" /> : notifications.data ? <View className="rounded-[17px] bg-white px-4">
          <PreferenceRow title="Daily spending warning" detail="A heads-up when today's spending is high" value={notifications.data.daily_warning} onChange={(value) => updateNotifications.mutate({ daily_warning: value })} />
          <PreferenceRow title="Budget threshold alert" detail="Alert when a budget reaches its warning threshold" value={notifications.data.threshold_alert} onChange={(value) => updateNotifications.mutate({ threshold_alert: value })} />
          <PreferenceRow title="Budget ending soon" detail="Reminder before an active budget ends" value={notifications.data.budget_ending} onChange={(value) => updateNotifications.mutate({ budget_ending: value })} />
          <PreferenceRow title="Budget completed" detail="Let me know when a budget period closes" value={notifications.data.budget_completed} onChange={(value) => updateNotifications.mutate({ budget_completed: value })} />
          <PreferenceRow title="Daily reminder" detail="A gentle reminder to record today's activity" value={notifications.data.daily_reminder} onChange={(value) => updateNotifications.mutate({ daily_reminder: value })} />
          {notifications.data.daily_reminder ? <><Label>Reminder time (24-hour)</Label><Field value={notifications.data.reminder_time} onChangeText={(value) => { if (/^\d{0,2}:?\d{0,2}$/.test(value)) queryClient.setQueryData(['notification-preferences'], { ...notifications.data!, reminder_time: value }); }} onBlur={() => { const value = queryClient.getQueryData<NotificationPreferences>(['notification-preferences'])?.reminder_time ?? ''; if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) updateNotifications.mutate({ reminder_time: value }); else { setError('Enter reminder time as HH:MM, for example 20:00.'); void notifications.refetch(); } }} placeholder="20:00" keyboardType="numbers-and-punctuation" /></> : null}
        </View> : <InfoBox text={notifications.isError ? getErrorMessage(notifications.error) : 'Your preferences could not be loaded.'} />}
      </>}

      {section === 'budget-period' && <>
        <Text className="mb-4 text-[11px] leading-4 text-muted">Choose how often your spending plan resets by default when you create a budget.</Text>
        <View className="overflow-hidden rounded-[17px] bg-white px-4">
          {budgetFrequencies.map((frequency, index) => {
            const selected = budgetFrequency === frequency;
            const descriptions: Record<BudgetFrequencyPreference, string> = {
              daily: 'A fresh plan for each day',
              weekly: 'A new plan every seven days',
              monthly: 'Plan around your monthly expenses',
              yearly: 'Set a longer-term annual limit',
            };
            return <Pressable key={frequency} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => void changeBudgetFrequency(frequency)} className={`min-h-[68px] flex-row items-center gap-3 ${index < budgetFrequencies.length - 1 ? 'border-b border-[#F0F1F5]' : ''}`}>
              <View className={`h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-accent-light' : 'bg-background'}`}><CalendarDays size={16} color={selected ? colors.primary : colors.textSecondary} /></View>
              <View className="flex-1"><Text className="text-[11px] font-semibold capitalize text-ink">{frequency}</Text><Text className="mt-1 text-[9px] text-muted">{descriptions[frequency]}</Text></View>
              {selected ? <Check size={17} color={colors.primary} /> : <View className="h-[17px] w-[17px] rounded-full border border-[#D9DEEA]" />}
            </Pressable>;
          })}
        </View>
        <InfoBox text="This applies to new budgets on this device. Existing budgets keep their current dates and schedule." />
        {budgetFrequencySaved && <Text accessibilityLiveRegion="polite" className="mt-3 text-center text-[10px] font-medium text-primary">Default budget period saved.</Text>}
      </>}

      {section === 'security' && <>
        <Text className="mb-3 text-[11px] text-muted">Change your password or sign out on other devices.</Text>
        <View className="rounded-[17px] bg-white p-4">
          <View className="mb-2 flex-row items-center gap-2"><LockKeyhole size={16} color={colors.primary} /><Text className="text-[13px] font-bold text-primary">Change password</Text></View>
          <Label>Current password</Label><Field value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Current password" />
          <Label>New password</Label><Field value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 8 characters" />
          <Label>Confirm new password</Label><Field value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Enter it again" />
          <PrimaryButton title={changePassword.isPending ? 'Updating…' : 'Update password'} onPress={() => changePassword.mutate()} disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword} />
        </View>
        <View className="mt-4 rounded-[17px] bg-white p-4">
          <Text className="text-[13px] font-bold text-primary">Signed-in devices</Text>
          <Text className="mt-1 text-[10px] leading-4 text-muted">Sign out everywhere else. This device stays signed in.</Text>
          <Pressable onPress={() => Alert.alert('Sign out other devices?', 'Other devices will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out devices', style: 'destructive', onPress: () => void revokeSessions() }])} className="mt-3 min-h-10 flex-row items-center justify-center gap-2 rounded-[10px] border border-border"><Trash2 size={14} color={colors.primary} /><Text className="text-[10px] font-bold text-primary">Sign out other devices</Text></Pressable>
        </View>
        <InfoBox text="Two-step verification is not available for this account yet. Biometric unlock can be enabled from Profile & settings on this device." />
      </>}

      {section === 'help' && <>
        <Text className="mb-3 text-[11px] text-muted">Quick answers to help you get started.</Text>
        <View className="rounded-[17px] bg-white px-4">{[
          ['How do I add a transaction?', 'Open Activity and tap the add button. Choose income or expense, enter the amount, and save it to an account.'],
          ['How do savings goals work?', 'Create a goal with a target and optionally add an existing starting amount. Contributions move money from an account into savings without counting as spending.'],
          ['Does PocketPlan connect to my bank?', 'No. Accounts are tracked manually. PocketPlan never asks for your banking password.'],
          ['How can I export my data?', 'Open Profile & settings and choose Export your data. PocketPlan creates a CSV you can save or share.'],
        ].map(([question, answer], index) => <Pressable key={question} onPress={() => setExpandedHelp(expandedHelp === index ? null : index)} className="border-b border-[#F0F1F5] py-4"><View className="flex-row items-center justify-between"><Text className="flex-1 pr-3 text-[11px] font-semibold text-ink">{question}</Text>{expandedHelp === index ? <ChevronDown size={15} color={colors.primary} /> : <ChevronRight size={15} color={colors.primary} />}</View>{expandedHelp === index ? <Text className="mt-2 text-[10px] leading-4 text-muted">{answer}</Text> : null}</Pressable> )}</View>
        <Pressable onPress={() => router.push('/legal')} className="mt-4 flex-row items-center gap-2 rounded-[14px] bg-accent-light p-4"><CircleHelp size={17} color={colors.primary} /><Text className="flex-1 text-[10px] font-semibold text-primary">Read PocketPlan privacy and terms</Text><ChevronRight size={14} color={colors.primary} /></Pressable>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function Label({ children }: { children: string }) { return <Text className="mb-1.5 mt-3 text-[10px] font-semibold text-ink">{children}</Text>; }
function Field(props: React.ComponentProps<typeof TextInput>) { return <TextInput {...props} className={`min-h-11 rounded-[10px] border border-border bg-white px-3 text-[11px] text-ink ${props.className ?? ''}`} placeholderTextColor={colors.textSecondary} />; }
function PrimaryButton({ title, onPress, disabled = false, icon }: { title: string; onPress: () => void; disabled?: boolean; icon?: React.ReactNode }) { return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} className={`mt-4 min-h-11 flex-row items-center justify-center gap-2 rounded-[10px] ${disabled ? 'bg-primary/50' : 'bg-primary active:opacity-80'}`}>{icon}{/* text is nested for stable native font styling */}<Text className="text-[11px] font-bold text-white">{title}</Text></Pressable>; }
function InfoBox({ text }: { text: string }) { return <View className="mt-3 rounded-[13px] bg-accent-light p-3"><Text className="text-[10px] leading-4 text-primary">{text}</Text></View>; }
function Choice({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} className={`flex-1 items-center justify-center rounded-[9px] py-2.5 ${selected ? 'bg-primary' : 'bg-background'}`}><Text className={`text-[10px] font-semibold ${selected ? 'text-white' : 'text-primary'}`}>{title}</Text></Pressable>; }
function AccountCard({ account, currency }: { account: Account; currency: string }) { let balance = `${currency} ${Number(account.balance).toFixed(2)}`; try { balance = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(account.balance)); } catch { /* Use currency prefix if an unsupported locale is selected. */ } return <View className="mb-2 flex-row items-center gap-3 rounded-[14px] bg-white p-3.5"><View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-light"><Wallet size={16} color={colors.primary} /></View><View className="flex-1"><Text className="text-[11px] font-semibold text-ink">{account.name}{account.is_default ? ' · Default' : ''}</Text><Text className="mt-0.5 text-[9px] capitalize text-muted">{account.type}</Text></View><Text className="text-[11px] font-semibold text-primary">{balance}</Text></View>; }
function PreferenceRow({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) { return <View className="min-h-[64px] flex-row items-center gap-3 border-b border-[#F0F1F5]"><View className="flex-1"><Text className="text-[11px] font-medium text-ink">{title}</Text><Text className="mt-1 text-[9px] text-muted">{detail}</Text></View><Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ false: '#D9DEEA', true: colors.primary }} thumbColor="white" /></View>; }
