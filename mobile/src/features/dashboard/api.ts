import { api } from '@/lib/api-client';

export interface DashboardTransaction {
  type: 'income' | 'expense';
  id: number;
  amount: string;
  description: string;
  date: string;
  created_at: string | null;
  category: { id: number; name: string; icon: string };
}

export interface DashboardData {
  greeting_name: string;
  currency: string;
  today: string;
  available_balance: string;
  this_month: { income: string; expenses: string; net: string };
  today_spending: string;
  budget: null | {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    summary: {
      spending_limit: string;
      spent_total: string;
      remaining: string;
      percent_used: number;
      is_overspent: boolean;
    };
    category_limits: { category_id: number; name: string; icon: string; limit: string; spent: string }[];
  };
  category_breakdown: { category_id: number; name: string; icon: string; total: string; percent: number }[];
  recent_transactions: DashboardTransaction[];
}

export const dashboardApi = {
  async get(): Promise<DashboardData> {
    const { data } = await api.get<{ data: DashboardData }>('/dashboard');
    return data.data;
  },
};

export interface ActivityTransaction extends DashboardTransaction {
  category: { id: number; name: string; icon: string; type?: string };
}

interface TransactionPage {
  data: {
    id: number;
    amount: string;
    description: string;
    spent_on?: string;
    received_on?: string;
    created_at: string | null;
    category: { id: number; name: string; icon: string; type?: string };
  }[];
  meta: { current_page: number; last_page: number };
}

export interface ActivityPage {
  transactions: ActivityTransaction[];
  hasMore: boolean;
}

export interface TransactionCategory {
  id: number;
  type: 'expense' | 'income';
  name: string;
  icon: string;
  color: string | null;
}

export interface TransactionDetails {
  id: number;
  account_id: number | null;
  amount: string;
  description: string;
  notes: string | null;
  payment_method?: string | null;
  spent_on?: string;
  received_on?: string;
  budget_id?: number | null;
  recurring_income_id?: number | null;
  category: TransactionCategory;
  created_at: string | null;
}

export interface TransactionInput {
  account_id?: number;
  category_id: number;
  amount: string;
  description: string;
  notes?: string | null;
  payment_method?: string | null;
  spent_on?: string;
  received_on?: string;
}

export interface Account {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'wallet';
  opening_balance: string;
  balance: string;
  is_default: boolean;
}

export const accountApi = {
  async list(): Promise<Account[]> {
    const { data } = await api.get<{ data: Account[] }>('/accounts');
    return data.data;
  },
};

export interface BudgetItem {
  id: number;
  name: string;
  spending_limit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  summary: { spent_total: string; remaining: string; percent_used: number; is_overspent: boolean };
}

export const budgetApi = {
  async list(): Promise<BudgetItem[]> {
    const { data } = await api.get<{ data: BudgetItem[] }>('/budgets', { params: { per_page: 50 } });
    return data.data;
  },
  async create(input: { name: string; spending_limit: string; frequency: BudgetItem['frequency']; start_date: string }): Promise<BudgetItem> {
    const { data } = await api.post<{ data: BudgetItem }>('/budgets', input);
    return data.data;
  },
};

export const activityApi = {
  async getPage(page: number, search: string): Promise<ActivityPage> {
    const params = { page, per_page: 10, sort: 'newest', ...(search.trim() ? { search: search.trim() } : {}) };
    const [expenses, incomes] = await Promise.all([
      api.get<TransactionPage>('/expenses', { params }),
      api.get<TransactionPage>('/incomes', { params }),
    ]);
    const mapRows = (rows: TransactionPage['data'], type: ActivityTransaction['type']): ActivityTransaction[] =>
      rows.map((row) => ({
        type,
        id: row.id,
        amount: row.amount,
        description: row.description,
        date: row.spent_on ?? row.received_on ?? '',
        created_at: row.created_at,
        category: row.category,
      }));

    const transactions = [
      ...mapRows(expenses.data.data, 'expense'),
      ...mapRows(incomes.data.data, 'income'),
    ].sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''));

    return {
      transactions,
      hasMore:
        expenses.data.meta.current_page < expenses.data.meta.last_page ||
        incomes.data.meta.current_page < incomes.data.meta.last_page,
    };
  },
};

export const transactionApi = {
  async get(type: 'expense' | 'income', id: number): Promise<TransactionDetails> {
    const { data } = await api.get<{ data: TransactionDetails }>(`/${type === 'expense' ? 'expenses' : 'incomes'}/${id}`);
    return data.data;
  },
  async categories(type: 'expense' | 'income'): Promise<TransactionCategory[]> {
    const { data } = await api.get<{ data: TransactionCategory[] }>('/categories', { params: { type } });
    return data.data;
  },
  async save(type: 'expense' | 'income', input: TransactionInput, id?: number): Promise<TransactionDetails> {
    const path = `/${type === 'expense' ? 'expenses' : 'incomes'}${id ? `/${id}` : ''}`;
    const { data } = id
      ? await api.put<{ data: TransactionDetails }>(path, input)
      : await api.post<{ data: TransactionDetails }>(path, input);
    return data.data;
  },
  async remove(type: 'expense' | 'income', id: number): Promise<void> {
    await api.delete(`/${type === 'expense' ? 'expenses' : 'incomes'}/${id}`);
  },
};
