import { create } from 'zustand';
import { Message } from '../types';
import { supabase } from '../services/supabase';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  inputValue: string;

  setInputValue: (value: string) => void;
  fetchChatHistory: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
}

function mapMessageRow(row: Record<string, unknown>): Message {
  const createdAt = row.created_at ? new Date(String(row.created_at)) : new Date();
  return {
    id: String(row.id),
    sender: row.sender === 'user' ? 'user' : 'ai',
    text: String(row.text || ''),
    timestamp: createdAt.toLocaleString(),
    type: row.type === 'chart' || row.type === 'transaction_list' ? row.type : 'text',
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  inputValue: '',

  setInputValue: (value: string) => {
    set({ inputValue: value });
  },

  fetchChatHistory: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        set({ messages: [] });
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const messages = (data || []).map((row) => mapMessageRow(row as unknown as Record<string, unknown>));
      set({ messages });
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (text: string) => {
    if (!text.trim()) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const unauthMsg: Message = {
        id: `unauth-${Date.now()}`,
        sender: 'ai',
        text: 'Please log in to use chat.',
        timestamp: 'Just now',
        type: 'text',
      };
      set((state) => ({ messages: [...state.messages, unauthMsg] }));
      return;
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: 'Just now',
      type: 'text',
    };

    set((state) => ({
      messages: [...state.messages, newUserMsg],
      inputValue: text === get().inputValue ? '' : get().inputValue,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: text },
      });

      if (error) {
        throw error;
      }

      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: String(data?.reply || 'No response from AI.'),
        timestamp: 'Just now',
        type: 'text',
      };

      set((state) => ({ messages: [...state.messages, aiResponse] }));
    } catch (error) {
      console.error('Failed to send message:', error);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Failed to get AI response, please try again.',
        timestamp: 'Just now',
        type: 'text',
      };
      set((state) => ({ messages: [...state.messages, errMsg] }));
    }
  },
}));
