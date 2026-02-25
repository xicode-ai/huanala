-- Migration: create_input_sessions_and_session_fk
-- Description: Add input_sessions table for grouping multiple transactions from a single input,
--              and add session_id FK to transactions table.

-- 1. Create input_sessions table
CREATE TABLE IF NOT EXISTS public.input_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('voice', 'bill_scan', 'manual')),
    raw_input TEXT,
    ai_raw_output JSONB,
    record_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_input_sessions_user_id ON public.input_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_input_sessions_created_at ON public.input_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.input_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions"
    ON public.input_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
    ON public.input_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON public.input_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Add session_id FK to transactions table
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.input_sessions(id) ON DELETE SET NULL;

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON public.transactions(session_id);
