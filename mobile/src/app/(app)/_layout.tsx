import { Stack } from 'expo-router';

import { colors } from '@/theme/colors';

/** Bottom-bar tabs cross-fade; details slide in from the right; forms rise from the bottom. */
const TABS = ['index', 'activity', 'budgets', 'savings', 'profile'];
const FORMS = ['transaction-form', 'budget-form', 'category-budget-form', 'savings-goal-form', 'savings-goal-contribution'];

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'ios_from_right', animationDuration: 320 }}>
      {TABS.map((name) => <Stack.Screen key={name} name={name} options={{ animation: 'fade', animationDuration: 200 }} />)}
      {FORMS.map((name) => <Stack.Screen key={name} name={name} options={{ animation: 'slide_from_bottom' }} />)}
      <Stack.Screen name="secure-app" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
    </Stack>
  );
}
