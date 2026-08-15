-- ============================================================
-- Migration 0002: Soft Delete (Trash) + Auto Cleanup
-- ============================================================

-- 1. Tambah kolom deleted_at ke tabel items
alter table public.items add column if not exists deleted_at timestamptz;

-- 2. Index untuk pencarian trash
create index if not exists items_deleted_at_idx on public.items (deleted_at);

-- 3. Fungsi auto-cleanup trash (30 hari)
create or replace function public.cleanup_trash()
returns void as $$
begin
  delete from public.items
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;
