import { router } from 'expo-router';
import { ArrowLeftRight, ChartNoAxesColumn, Flag, House, UserRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export type AppTab = 'home' | 'activity' | 'budgets' | 'savings' | 'profile';

const tabs = [
  { key: 'home', label: 'Home', Icon: House, path: '/' },
  { key: 'activity', label: 'Activity', Icon: ArrowLeftRight, path: '/activity' },
  { key: 'budgets', label: 'Budgets', Icon: ChartNoAxesColumn, path: '/budgets' },
  { key: 'savings', label: 'Goals', Icon: Flag, path: '/savings' },
  { key: 'profile', label: 'Profile', Icon: UserRound, path: '/profile' },
] as const;

export function AppBottomBar({ active }: { active: AppTab }) {
  return <View className="flex-row items-center border-t border-[#E9ECF3] bg-white px-2 pb-1 pt-2">
    {tabs.map((tab) => <TabItem key={tab.key} {...tab} active={active === tab.key} />)}
  </View>;
}

function TabItem({ label, Icon, path, active }: { label: string; Icon: typeof House; path: string; active: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => router.navigate(path as '/' | '/activity' | '/budgets' | '/savings' | '/profile')} className="min-h-14 flex-1 items-center justify-center gap-0.5 active:opacity-70">
    <View className={`h-9 w-12 items-center justify-center rounded-xl ${active ? 'bg-accent-light' : ''}`}><Icon size={21} color={active ? colors.primary : colors.textSecondary} strokeWidth={active ? 2.2 : 1.8} /></View>
    <Text className={`text-[10px] ${active ? 'font-bold text-primary' : 'font-medium text-muted'}`}>{label}</Text>
  </Pressable>;
}
