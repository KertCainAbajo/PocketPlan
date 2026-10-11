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
