-- ============================================================
-- Knowledge Vault — Supabase / Postgres schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- gen_random_uuid() lives in pgcrypto (usually enabled on Supabase)
create extension if not exists pgcrypto;

-- ---------- updated_at trigger function ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- items
-- ============================================================
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  content     text default '',
  tags        text[] default '{}',
  category    text default 'Notes',
  favorite    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists items_user_id_idx     on public.items (user_id);
create index if not exists items_created_at_idx   on public.items (created_at desc);

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- ============================================================
-- categories
-- ============================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

-- one category name per user, case-insensitive
create unique index if not exists categories_user_lower_name_idx
  on public.categories (user_id, lower(name));

-- ============================================================
-- ROW LEVEL SECURITY  (this is what protects each user's data)
-- ============================================================
alter table public.items       enable row level security;
alter table public.categories  enable row level security;

-- ---- items policies: a user may only touch their own rows ----
drop policy if exists items_select_own on public.items;
create policy items_select_own on public.items
  for select using (auth.uid() = user_id);

drop policy if exists items_insert_own on public.items;
create policy items_insert_own on public.items
  for insert with check (auth.uid() = user_id);

drop policy if exists items_update_own on public.items;
create policy items_update_own on public.items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists items_delete_own on public.items;
create policy items_delete_own on public.items
  for delete using (auth.uid() = user_id);

-- ---- categories policies ----
drop policy if exists categories_select_own on public.categories;
create policy categories_select_own on public.categories
  for select using (auth.uid() = user_id);

drop policy if exists categories_insert_own on public.categories;
create policy categories_insert_own on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists categories_update_own on public.categories;
create policy categories_update_own on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists categories_delete_own on public.categories;
create policy categories_delete_own on public.categories
  for delete using (auth.uid() = user_id);

-- ============================================================
-- REALTIME — stream item changes to other tabs/devices
-- ============================================================
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.categories;
