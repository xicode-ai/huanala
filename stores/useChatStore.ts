import { create } from 'zustand';
import { Message } from '../types';
import { Api } from '../services/api';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  inputValue: string;

  setInputValue: (value: string) => void;
  fetchChatHistory: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
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
      const messages = await Api.getChatHistory();
      set({ messages });
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (text: string) => {
    if (!text.trim()) return;

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
      const aiResponse = await Api.sendMessage(text);
      set((state) => ({ messages: [...state.messages, aiResponse] }));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  },
}));
