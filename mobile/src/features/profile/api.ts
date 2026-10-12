import { api } from '@/lib/api-client';
import type { User } from '@/types/api';

export interface NotificationPreferences {
  daily_warning: boolean;
  threshold_alert: boolean;
  budget_ending: boolean;
  budget_completed: boolean;
  daily_reminder: boolean;
  reminder_time: string;
  warning_threshold_percent: number;
}

export const profileApi = {
  async update(input: Pick<User, 'name' | 'email' | 'currency'>): Promise<User> {
    const { data } = await api.patch<{ data: User }>('/me', input);
    return data.data;
  },
  async changePassword(input: { current_password: string; password: string; password_confirmation: string }): Promise<void> {
    await api.post('/me/password', input);
  },
  async revokeOtherSessions(): Promise<void> {
    await api.delete('/me/sessions');
  },
  async notifications(): Promise<NotificationPreferences> {
    const { data } = await api.get<{ data: NotificationPreferences }>('/notification-preferences');
    return data.data;
  },
  async updateNotifications(input: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { data } = await api.put<{ data: NotificationPreferences }>('/notification-preferences', input);
    return data.data;
  },
  async exportTransactions(): Promise<string> {
    const { data } = await api.get<string>('/export/transactions', {
      headers: { Accept: 'text/csv' },
      responseType: 'text',
    });
    return data;
  },
};
