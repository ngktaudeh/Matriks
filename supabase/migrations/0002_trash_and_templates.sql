-- ============================================================
-- Migration 0002: Soft Delete (Trash) + Auto Cleanup
-- ============================================================

-- 1. Tambah kolom deleted_at ke tabel items
alter table public.items add column if not exists deleted_at timestamptz;

-- 2. Update index untuk query trash
create index if not exists items_deleted_at_idx on public.items (deleted_at);

-- 3. Update RLS policy agar user masih bisa lihat & restore item mereka sendiri
-- (Policy yang ada sudah cukup karena menggunakan user_id check)

-- 4. Function untuk auto-cleanup trash (dijalankan via cron atau edge function)
create or replace function public.cleanup_trash()
returns void as $$
begin
  delete from public.items
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;

-- 5. Jika pakai pg_cron (Supabase Pro/Enterprise), aktifkan:
-- select cron.schedule('cleanup-trash-daily', '0 0 * * *', 'select public.cleanup_trash()');

-- 6. Update realtime publication (sudah ada di 0001, tapi pastikan)
alter publication supabase_realtime add table public.items;
