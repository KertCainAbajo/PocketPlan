export type UserRole = 'student' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  currency: string;
  timezone: string;
  is_onboarded: boolean;
  onboarded_at: string | null;
  created_at: string;
}

export interface ApiResource<T> {
  data: T;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

/** Laravel's error body: `{ message, errors?: { field: [msg, ...] } }`. */
export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}
