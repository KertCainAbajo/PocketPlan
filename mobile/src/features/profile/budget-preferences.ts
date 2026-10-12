import * as SecureStore from 'expo-secure-store';

export const budgetFrequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export type BudgetFrequencyPreference = (typeof budgetFrequencies)[number];

const preferenceKey = (userId: number) => `pocketplan.budget-frequency.${userId}`;

export async function getBudgetFrequencyPreference(userId: number): Promise<BudgetFrequencyPreference> {
  const value = await SecureStore.getItemAsync(preferenceKey(userId));
  return budgetFrequencies.find((frequency) => frequency === value) ?? 'weekly';
}

export async function setBudgetFrequencyPreference(userId: number, frequency: BudgetFrequencyPreference): Promise<void> {
  await SecureStore.setItemAsync(preferenceKey(userId), frequency);
}
