-- Migration: create_transactions_table
-- Version: 20260207141143
-- Description: Create transactions table for expense/income tracking

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT '¥',
    category TEXT NOT NULL,
    icon TEXT DEFAULT 'receipt',
    icon_bg TEXT DEFAULT 'bg-slate-50',
    icon_color TEXT DEFAULT 'text-slate-500',
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    note TEXT,
    merchant TEXT,
    description TEXT,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'bill_scan')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id);
