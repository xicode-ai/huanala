import { Message } from '../types';
import { supabase } from './supabase';

/**
 * 将 Supabase 行数据映射为 Message 类型
 */
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

/**
 * 聊天服务 - 聊天记录和 AI 消息处理
 */
export const chatService = {
  /**
   * 获取用户聊天历史
   */
  fetchHistory: async (userId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => mapMessageRow(row as unknown as Record<string, unknown>));
  },

  /**
   * 发送消息到 AI 并获取回复
   */
  sendMessage: async (text: string): Promise<Message> => {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { message: text },
    });

    if (error) throw error;

    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: String(data?.reply || 'No response from AI.'),
      timestamp: 'Just now',
      type: 'text',
    };
  },
};
