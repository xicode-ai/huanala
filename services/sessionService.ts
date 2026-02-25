import { InputSession } from '../types';
import { supabase } from './supabase';

const PAGE_SIZE = 20;

/**
 * Map a Supabase row to InputSession
 */
function mapSessionRow(row: Record<string, unknown>): InputSession {
  const createdAt = row.created_at as string;
  return {
    id: row.id as string,
    source: row.source as InputSession['source'],
    recordCount: Number(row.record_count) || 0,
    totalAmount: Number(row.total_amount) || 0,
    currency: (row.currency as string) || '¥',
    date: new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: new Date(createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    createdAt,
  };
}

/**
 * Session service — queries input_sessions table directly
 */
export const sessionService = {
  /**
   * Paginated fetch of input_sessions ordered by created_at DESC
   */
  fetchPage: async (
    userId: string,
    page: number = 0,
    pageSize: number = PAGE_SIZE
  ): Promise<{ sessions: InputSession[]; hasMore: boolean }> => {
    const from = page * pageSize;
    const to = from + pageSize; // fetch 1 extra to detect hasMore

    const { data, error } = await supabase
      .from('input_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const rows = data || [];
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

    return {
      sessions: pageRows.map(mapSessionRow),
      hasMore,
    };
  },

  /**
   * Fetch monthly expense/income totals from input_sessions
   */
  fetchMonthlySummary: async (userId: string): Promise<{ expenses: number; income: number }> => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // We still need transactions for expense/income split since input_sessions
    // stores total_amount without type distinction. Query transactions directly.
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('created_at', monthStart);

    if (error) throw error;

    const rows = data || [];
    const expenses = rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
    const income = rows.filter((r) => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);

    return { expenses, income };
  },
};
