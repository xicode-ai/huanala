import { User, Transaction, Message } from '../types';

export const MOCK_USER: User = {
  id: '839201',
  name: 'Li Ming',
  handle: '@liming_finance',
  avatar: 'https://picsum.photos/200',
  isPremium: true,
  phone: '138****8888',
  balance: 0.00,
  monthlyExpenses: 8450.00,
  dailyAvailable: 29.58,
  budgetUsedPercent: 30,
  leftAmount: 769.00
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    title: 'Catering - Coffee',
    amount: 5.00,
    currency: '¥',
    date: 'Dec 4',
    time: '16:07',
    category: 'Food',
    icon: 'coffee',
    iconBg: 'bg-blue-50',
    iconColor: 'text-primary',
    type: 'expense',
    details: {
      description: 'Today coffee 5 yuan.',
      reward: 'Coffee consumption unlocked! Life experience +1~ 😋'
    }
  },
  {
    id: 't2',
    title: 'United Airlines',
    amount: 1150.00,
    currency: '$',
    date: 'Oct 17',
    time: '10:00',
    category: 'Travel',
    icon: 'flight_takeoff',
    iconBg: 'bg-blue-50',
    iconColor: 'text-primary',
    type: 'expense',
    note: 'Business trip'
  },
  {
    id: 't3',
    title: 'Marriott Downtown',
    amount: 850.00,
    currency: '$',
    date: 'Oct 20',
    time: '12:00',
    category: 'Hotel',
    icon: 'apartment',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    type: 'expense'
  }
];

export const MOCK_CHAT_HISTORY: Message[] = [
  {
    id: 'm1',
    sender: 'ai',
    text: "Hello! 👋 I'm Hua Na Le. I can help you track where your money went. What would you like to know?",
    timestamp: 'Today',
    type: 'text'
  },
  {
    id: 'm2',
    sender: 'user',
    text: "Show me the breakdown of last week's travel expenses.",
    timestamp: 'Today',
    type: 'text'
  },
  {
    id: 'm3',
    sender: 'ai',
    text: "Here is the breakdown for Oct 16 - Oct 22. Total spend: $2,450.00.",
    timestamp: 'Today',
    type: 'chart',
    chartData: [
      { name: 'Flight', value: 47, color: '#6EE7B7' }, // mint
      { name: 'Hotel', value: 35, color: '#FCA5A5' }, // coral
      { name: 'Meals', value: 13, color: '#FDE047' }, // yellow
      { name: 'Transport', value: 5, color: '#CBD5E1' }, // slate-300
    ],
    transactions: MOCK_TRANSACTIONS.slice(1) // Show the travel ones
  }
];
