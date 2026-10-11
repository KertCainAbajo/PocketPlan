import { api } from '@/lib/api-client';
import type { ApiResource, User } from '@/types/api';

export type AllowanceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface OnboardingInput {
  currency: string;
  allowance_amount: string;
  frequency: AllowanceFrequency;
  start_date: string;
  recurring: boolean;
  end_date?: string;
}

export const onboardingApi = {
  async complete(input: OnboardingInput): Promise<User> {
    const { data } = await api.post<ApiResource<User>>('/onboarding', input);
    return data.data;
  },
};
