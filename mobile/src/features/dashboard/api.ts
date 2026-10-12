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
  savings_total: string;
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

export interface SavingsOverview {
  currency: string;
  year: number;
  total_saved: string;
  allowance_rollovers_total: string;
  goal_contributions_total: string;
  year_total_saved: string;
  year_rollovers_total: string;
  year_goal_contributions_total: string;
  periods: {
    id: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    allowance_amount: string;
    spent: string;
    saved_amount: string;
    start_date: string;
    end_date: string;
    saved_on: string;
  }[];
}

export const savingsApi = {
  async get(year: number): Promise<SavingsOverview> {
    const { data } = await api.get<{ data: SavingsOverview }>('/savings', { params: { year } });
    return data.data;
  },
};

export interface SavingsGoal {
  id: number;
  name: string;
  icon: 'laptop' | 'home' | 'travel' | 'emergency' | 'education';
  target_amount: string;
  saved_amount: string;
  target_date: string | null;
  reminder_enabled: boolean;
  status: 'active' | 'achieved' | 'archived';
  contribution_count: number;
  last_contributed_on: string | null;
}

export interface SavingsGoalsOverview {
  currency: string;
  total_saved: string;
  combined_target: string;
  active_count: number;
  month_added: string;
  month_contributions: number;
  goals: SavingsGoal[];
}

export interface SavingsGoalDetails {
  goal: Pick<SavingsGoal, 'id' | 'name' | 'icon' | 'target_amount' | 'saved_amount' | 'target_date' | 'reminder_enabled'> & {
    remaining_amount: string;
    progress_percent: number;
  };
  monthly_progress: { label: string; date_label: string; amount: string }[];
  contributions: { id: number; amount: string; contributed_on: string; note: string | null; account_name: string }[];
}

export const savingsGoalsApi = {
  async list(): Promise<SavingsGoalsOverview> {
    const { data } = await api.get<{ data: SavingsGoalsOverview }>('/savings-goals');
    return data.data;
  },
  async create(input: {
    name: string;
    icon: SavingsGoal['icon'];
    target_amount: string;
    starting_amount: string;
    target_date?: string;
    reminder_enabled: boolean;
  }): Promise<void> {
    await api.post('/savings-goals', input);
  },
  async update(goalId: number, input: {
    name: string;
    icon: SavingsGoal['icon'];
    target_amount: string;
    target_date?: string | null;
    reminder_enabled: boolean;
  }): Promise<void> {
    await api.put(`/savings-goals/${goalId}`, input);
  },
  async get(goalId: number): Promise<SavingsGoalDetails> {
    const { data } = await api.get<{ data: SavingsGoalDetails }>(`/savings-goals/${goalId}`);
    return data.data;
  },
  async contribute(goalId: number, input: { amount: string; account_id: number; note?: string }): Promise<void> {
    await api.post(`/savings-goals/${goalId}/contributions`, input);
  },
};

export interface ActivityTransaction extends DashboardTransaction {
  account_id?: number | null;
  category: { id: number; name: string; icon: string; type?: string };
}

interface TransactionPage {
  data: {
    id: number;
    account_id?: number | null;
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
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  summary: { spent_total: string; remaining: string; percent_used: number; is_overspent: boolean };
  category_limits?: {
    category_id: number;
    category_name: string;
    category_icon: string;
    limit_amount: string;
    spent: string;
    remaining: string;
    percent_used: number;
    status: string;
  }[];
  savings_rollover?: { amount: string; saved_on: string } | null;
}

export const budgetApi = {
  async list(): Promise<BudgetItem[]> {
    const { data } = await api.get<{ data: BudgetItem[] }>('/budgets', { params: { per_page: 50 } });
    return data.data;
  },
  async get(id: number): Promise<BudgetItem> {
    const { data } = await api.get<{ data: BudgetItem }>(`/budgets/${id}`);
    return data.data;
  },
  async create(input: { name: string; spending_limit: string; frequency: BudgetItem['frequency']; start_date: string }): Promise<BudgetItem> {
    const { data } = await api.post<{ data: BudgetItem }>('/budgets', input);
    return data.data;
  },
  async update(id: number, input: { name: string; spending_limit: string; frequency: BudgetItem['frequency']; start_date: string; end_date: string; category_limits: { category_id: number; limit_amount: string }[] }): Promise<BudgetItem> {
    const { data } = await api.put<{ data: BudgetItem }>(`/budgets/${id}`, input);
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
        account_id: row.account_id,
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
