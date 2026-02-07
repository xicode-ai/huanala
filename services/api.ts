import { User, Transaction, Message } from '../types';
import { MOCK_USER, MOCK_TRANSACTIONS, MOCK_CHAT_HISTORY } from './mockData';

const DELAY = 500;

export const Api = {
  login: async (_phone: string): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_USER), DELAY);
    });
  },

  getUser: async (): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_USER), DELAY);
    });
  },

  getTransactions: async (): Promise<Transaction[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_TRANSACTIONS), DELAY);
    });
  },

  getChatHistory: async (): Promise<Message[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_CHAT_HISTORY), DELAY);
    });
  },
  
  sendMessage: async (text: string): Promise<Message> => {
    return new Promise((resolve) => {
       setTimeout(() => {
           resolve({
               id: Date.now().toString(),
               sender: 'ai',
               text: `I received your message: "${text}". As this is a demo, I cannot process real data yet!`,
               timestamp: 'Just now',
               type: 'text'
           })
       }, 1000); 
    });
  },

  uploadBill: async (_file: File): Promise<Transaction> => {
    // Simulate file upload and OCR processing delay
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: Date.now().toString(),
                title: '7-Eleven Market',
                amount: 35.80,
                currency: '¥',
                date: 'Today',
                time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                category: 'Groceries',
                icon: 'storefront',
                iconBg: 'bg-green-50',
                iconColor: 'text-green-500',
                type: 'expense',
                note: 'Scanned Receipt',
                details: {
                    merchant: '7-Eleven',
                    description: 'Snacks & Drinks'
                }
            });
        }, 2000); // 2 second delay to simulate analysis
    });
  },

  uploadVoice: async (transcriptText: string): Promise<Transaction> => {
     // Simulate voice transcript processing via AI/NLP
     return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: Date.now().toString(),
                title: transcriptText || 'Voice Record',
                amount: 45.00,
                currency: '¥',
                date: 'Today',
                time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                category: 'Transport',
                icon: 'local_taxi',
                iconBg: 'bg-blue-50',
                iconColor: 'text-blue-500',
                type: 'expense',
                note: 'Voice input',
                details: {
                    description: transcriptText || 'Voice recorded transaction'
                }
            });
        }, 1500);
     });
  }
};