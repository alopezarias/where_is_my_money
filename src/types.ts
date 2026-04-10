export type Account = {
  id: string;
  name: string;
  color: string;
  currency: string;
  balance: number;
};

export type MonthRecord = {
  monthId: string; // Format: YYYY-MM
  accounts: Account[];
};

export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export type Subscription = {
  id: string;
  groupId?: string; // To link edited versions of the same subscription
  name: string;
  description: string;
  amount: number;
  currency: string;
  cycle: BillingCycle;
  startDate: string; // Format: YYYY-MM-DD
  endDate?: string; // Format: YYYY-MM-DD
  color: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
  amount: number;
  color: string;
};

export type BudgetRecord = {
  monthId: string; // Format: YYYY-MM
  income: number;
  categories: BudgetCategory[];
};
