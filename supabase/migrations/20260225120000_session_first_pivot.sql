-- Migration: session_first_pivot
-- Description: Add total_amount + currency to input_sessions for zero-JOIN home queries,
--              and delete orphan transactions that have no session_id.

-- 1. Add total_amount and currency columns to input_sessions
ALTER TABLE public.input_sessions
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '¥';

-- 2. Delete orphan transactions (no session_id) — per user requirement, no backward compatibility
DELETE FROM public.transactions WHERE session_id IS NULL;

-- 3. Backfill total_amount and currency for existing sessions from their transactions
UPDATE public.input_sessions s
SET
    total_amount = sub.total,
    currency = sub.cur
FROM (
    SELECT
        session_id,
        SUM(amount) AS total,
        COALESCE(MIN(currency), '¥') AS cur
    FROM public.transactions
    WHERE session_id IS NOT NULL
    GROUP BY session_id
) sub
WHERE s.id = sub.session_id;
