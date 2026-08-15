-- ============================================================
-- Matriks — CONSOLIDATED SETUP (idempotent, aman dijalankan ulang)
-- Jalankan SEKALI di: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================
-- File ini menggabungkan semua migration (0001..0008) dalam urutan
-- yang benar, dan membuat policy akhir konsisten:
--   • items / categories : SELECT publik, WRITE = admin yang disetujui
--   • admins             : owner (danielsmb385@gmail.com) mengelola admin + AI access
--   • app_settings       : kode undangan (public read, owner write)
--   • storage item-images: read publik, write = admin yang disetujui
-- ============================================================

-- ------------------------------------------------------------
-- 0) Ekstensi & trigger updated_at
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- 1) Tabel items
-- ------------------------------------------------------------
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  title       text not null,
  content     text default '',
  tags        text[] default '{}',
  category    text default 'Notes',
  favorite    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Kolom tambahan (idempotent)
alter table public.items add column if not exists subtitle   text default '';
alter table public.items add column if not exists image_url  text;
alter table public.items add column if not exists deleted_at timestamptz;
alter table public.items add column if not exists usage_count integer default 0;
alter table public.items add column if not exists is_verified boolean default false;

create index if not exists items_user_id_idx     on public.items (user_id);
create index if not exists items_created_at_idx   on public.items (created_at desc);
create index if not exists items_deleted_at_idx   on public.items (deleted_at);

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2) Tabel categories (shared / bukan per-user)
-- ------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

-- Kategori jadi shared: user_id boleh null, index unik global.
alter table public.categories alter column user_id drop not null;

drop index if exists categories_user_lower_name_idx;
create unique index if not exists categories_lower_name_idx
  on public.categories (lower(name));

-- ------------------------------------------------------------
-- 3) Tabel admins
-- ------------------------------------------------------------
create table if not exists public.admins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  email       text not null unique,
  role        text not null default 'admin',
  status      text not null default 'pending',
  ai_access   boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists admins_email_idx  on public.admins (email);
create index if not exists admins_status_idx on public.admins (status);

-- ------------------------------------------------------------
-- 4) Tabel app_settings (kode undangan)
-- ------------------------------------------------------------
create table if not exists public.app_settings (
  id          int primary key,
  invite_code text not null default 'MATRIKS2026',
  updated_at  timestamptz default now()
);

insert into public.app_settings (id, invite_code)
values (1, 'MATRIKS2026')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 5) Fungsi-fungsi helper
-- ------------------------------------------------------------
-- Auto-cleanup trash (30 hari)
create or replace function public.cleanup_trash()
returns void as $$
begin
  delete from public.items
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;

-- Increment usage_count (aman dipanggil anon)
create or replace function public.increment_usage_count(target_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.items
     set usage_count = coalesce(usage_count, 0) + 1
   where id = target_id;
end;
$$;

-- Cek apakah email adalah admin yang disetujui (hindari policy recursion)
create or replace function public.is_admin_approved(target_email text)
returns boolean language sql security definer stable
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(target_email) and status = 'approved'
  );
$$;

-- ------------------------------------------------------------
-- 6) Seed owner
-- ------------------------------------------------------------
insert into public.admins (user_id, email, role, status, ai_access)
select id, email, 'owner', 'approved', true
from auth.users where email = 'danielsmb385@gmail.com'
on conflict (email) do update
  set role = 'owner', status = 'approved', ai_access = true;

-- ------------------------------------------------------------
-- 7) RLS — enable + policy final
-- ------------------------------------------------------------
alter table public.items       enable row level security;
alter table public.categories  enable row level security;
alter table public.admins      enable row level security;
alter table public.app_settings enable row level security;

-- ---------- items ----------
drop policy if exists items_select_own     on public.items;
drop policy if exists items_insert_own     on public.items;
drop policy if exists items_update_own     on public.items;
drop policy if exists items_delete_own     on public.items;
drop policy if exists items_select_public  on public.items;
drop policy if exists items_insert_admin   on public.items;
drop policy if exists items_update_admin   on public.items;
drop policy if exists items_delete_admin   on public.items;

create policy items_select_public on public.items
  for select using (true);

create policy items_insert_admin on public.items
  for insert with check (public.is_admin_approved(auth.jwt() ->> 'email'));

create policy items_update_admin on public.items
  for update
  using (public.is_admin_approved(auth.jwt() ->> 'email'))
  with check (public.is_admin_approved(auth.jwt() ->> 'email'));

create policy items_delete_admin on public.items
  for delete using (public.is_admin_approved(auth.jwt() ->> 'email'));

-- ---------- categories ----------
drop policy if exists categories_select_own   on public.categories;
drop policy if exists categories_insert_own   on public.categories;
drop policy if exists categories_update_own   on public.categories;
drop policy if exists categories_delete_own   on public.categories;
drop policy if exists categories_select_public on public.categories;
drop policy if exists categories_insert_admin on public.categories;
drop policy if exists categories_update_admin on public.categories;
drop policy if exists categories_delete_admin on public.categories;

create policy categories_select_public on public.categories
  for select using (true);

create policy categories_insert_admin on public.categories
  for insert with check (public.is_admin_approved(auth.jwt() ->> 'email'));

create policy categories_update_admin on public.categories
  for update
  using (public.is_admin_approved(auth.jwt() ->> 'email'))
  with check (public.is_admin_approved(auth.jwt() ->> 'email'));

create policy categories_delete_admin on public.categories
  for delete using (public.is_admin_approved(auth.jwt() ->> 'email'));

-- ---------- admins ----------
drop policy if exists admins_select_owner    on public.admins;
drop policy if exists admins_select_approved on public.admins;
drop policy if exists admins_select_self     on public.admins;
drop policy if exists admins_insert_self     on public.admins;
drop policy if exists admins_insert_owner    on public.admins;
drop policy if exists admins_update_owner    on public.admins;
drop policy if exists admins_delete_owner    on public.admins;

create policy admins_select_owner on public.admins
  for select using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

create policy admins_select_approved on public.admins
  for select using (status = 'approved');

create policy admins_select_self on public.admins
  for select using (auth.jwt() ->> 'email' = email);

create policy admins_insert_self on public.admins
  for insert with check (
    auth.jwt() ->> 'email' = email
    and auth.uid() = user_id
    and role = 'admin'
    and status = 'pending'
    and auth.jwt() ->> 'email' <> 'danielsmb385@gmail.com'
  );

create policy admins_insert_owner on public.admins
  for insert with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

create policy admins_update_owner on public.admins
  for update
  using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

create policy admins_delete_owner on public.admins
  for delete using (
    auth.jwt() ->> 'email' = 'danielsmb385@gmail.com'
    and email <> 'danielsmb385@gmail.com'
  );

-- ---------- app_settings ----------
drop policy if exists app_settings_select_public on public.app_settings;
drop policy if exists app_settings_update_owner  on public.app_settings;
drop policy if exists app_settings_insert_owner  on public.app_settings;

create policy app_settings_select_public on public.app_settings
  for select using (true);

create policy app_settings_update_owner on public.app_settings
  for update
  using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

create policy app_settings_insert_owner on public.app_settings
  for insert with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

-- ------------------------------------------------------------
-- 8) Storage policies (bucket: item-images)
--    NOTE: bucket harus dibuat manual di Dashboard → Storage → New bucket
-- ------------------------------------------------------------
drop policy if exists "item-images public read"            on storage.objects;
drop policy if exists "item-images authenticated insert"   on storage.objects;
drop policy if exists "item-images authenticated update"   on storage.objects;
drop policy if exists "item-images authenticated delete"   on storage.objects;
drop policy if exists "item-images admin insert"           on storage.objects;
drop policy if exists "item-images admin update"           on storage.objects;
drop policy if exists "item-images admin delete"           on storage.objects;

create policy "item-images public read" on storage.objects
  for select using (bucket_id = 'item-images');

create policy "item-images admin insert" on storage.objects
  for insert with check (
    bucket_id = 'item-images'
    and public.is_admin_approved(auth.jwt() ->> 'email')
  );

create policy "item-images admin update" on storage.objects
  for update using (
    bucket_id = 'item-images'
    and public.is_admin_approved(auth.jwt() ->> 'email')
  );

create policy "item-images admin delete" on storage.objects
  for delete using (
    bucket_id = 'item-images'
    and public.is_admin_approved(auth.jwt() ->> 'email')
  );

-- ------------------------------------------------------------
-- 9) Realtime publication (idempotent)
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items') then
    alter publication supabase_realtime add table public.items;
  end if;

  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories') then
    alter publication supabase_realtime add table public.categories;
  end if;

  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admins') then
    alter publication supabase_realtime add table public.admins;
  end if;
end $$;

-- ============================================================
-- SELESAI. Struktur final sudah konsisten.
-- ============================================================
