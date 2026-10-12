import { router } from 'expo-router';
import { ArrowLeftRight, ChartNoAxesColumn, House, PiggyBank, Plus, UserRound } from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export type AppTab = 'home' | 'activity' | 'budgets' | 'savings' | 'profile';

const tabs = [
  { key: 'home', label: 'Home', Icon: House, path: '/' },
  { key: 'activity', label: 'Activity', Icon: ArrowLeftRight, path: '/activity' },
  { key: 'budgets', label: 'Budgets', Icon: ChartNoAxesColumn, path: '/budgets' },
  { key: 'savings', label: 'Savings', Icon: PiggyBank, path: '/savings' },
  { key: 'profile', label: 'Profile', Icon: UserRound, path: '/profile' },
] as const;

export function AppBottomBar({ active }: { active: AppTab }) {
  function addTransaction() {
    Alert.alert('Add a transaction', 'Choose what you want to record.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Expense', onPress: () => router.push({ pathname: '/transaction-form', params: { type: 'expense' } }) },
      { text: 'Income', onPress: () => router.push({ pathname: '/transaction-form', params: { type: 'income' } }) },
    ]);
  }

  return <View className="flex-row items-center border-t border-[#E9ECF3] bg-white px-1 pb-1 pt-2">
    <TabItem {...tabs[0]} active={active === 'home'} />
    <TabItem {...tabs[1]} active={active === 'activity'} />
    <Pressable accessibilityRole="button" accessibilityLabel="Add a transaction" onPress={addTransaction} className="min-h-12 flex-1 items-center justify-start">
      <View className="-mt-6 h-12 w-12 items-center justify-center rounded-full border-[4px] border-white bg-primary shadow-md shadow-primary/30 active:opacity-80"><Plus size={22} color="white" strokeWidth={2.5} /></View>
    </Pressable>
    <TabItem {...tabs[2]} active={active === 'budgets'} />
    <TabItem {...tabs[3]} active={active === 'savings'} />
    <TabItem {...tabs[4]} active={active === 'profile'} />
  </View>;
}

function TabItem({ label, Icon, path, active }: { label: string; Icon: typeof House; path: string; active: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => router.navigate(path as '/' | '/activity' | '/budgets' | '/savings' | '/profile')} className="min-h-12 flex-1 items-center justify-center gap-0.5">
    <View className={`h-7 min-w-8 items-center justify-center rounded-full px-2 ${active ? 'bg-accent-light' : ''}`}><Icon size={16} color={active ? colors.primary : colors.textSecondary} strokeWidth={active ? 2 : 1.7} /></View>
    <Text className={`text-[8px] ${active ? 'font-bold text-primary' : 'text-muted'}`}>{label}</Text>
  </Pressable>;
}
