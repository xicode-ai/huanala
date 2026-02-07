export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  isPremium: boolean;
  phone: string;
  balance: number;
  monthlyExpenses: number;
  dailyAvailable: number;
  budgetUsedPercent: number;
  leftAmount: number;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: string;
  time: string;
  category: string;
  icon: string;
  iconBg: string; // Tailwind class
  iconColor: string; // Tailwind class
  type: 'expense' | 'income';
  note?: string;
  details?: {
    merchant?: string;
    description?: string;
    reward?: string;
  };
}

export interface ChartData {
  name: string;
  value: number;
  color: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  type: 'text' | 'chart' | 'transaction_list';
  chartData?: ChartData[];
  transactions?: Transaction[];
}
