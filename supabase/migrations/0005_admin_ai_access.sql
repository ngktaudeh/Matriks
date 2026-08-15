-- ============================================================
-- Bank Jawaban CS — Matriks.ai access control
-- Adds an AI access flag to admins so the owner can decide
-- which admins may use the AI chat (Matriks.ai).
-- Idempotent.
-- ============================================================

alter table public.admins
  add column if not exists ai_access boolean not null default false;

-- Owner selalu punya akses Matriks.ai.
update public.admins
  set ai_access = true
  where role = 'owner' and ai_access = false;
