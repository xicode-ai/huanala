import { create } from 'zustand';
import { Message } from '../types';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';

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
      const {
        data: { session },
      } = await authService.getSession();

      if (!session) {
        set({ messages: [] });
        return;
      }

      const messages = await chatService.fetchHistory(session.user.id);
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
    } = await authService.getSession();
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
      const aiResponse = await chatService.sendMessage(text);
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
