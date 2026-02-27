-- Migration: add_text_source_type
-- Description: Add 'text' as a valid source type for input_sessions and transactions tables
--              to support the new text-based expense recording flow.

-- 1. Update input_sessions CHECK constraint
ALTER TABLE public.input_sessions
    DROP CONSTRAINT IF EXISTS input_sessions_source_check;

ALTER TABLE public.input_sessions
    ADD CONSTRAINT input_sessions_source_check
    CHECK (source IN ('voice', 'bill_scan', 'manual', 'text'));

-- 2. Update transactions CHECK constraint
ALTER TABLE public.transactions
    DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_source_check
    CHECK (source IN ('manual', 'voice', 'bill_scan', 'text'));
