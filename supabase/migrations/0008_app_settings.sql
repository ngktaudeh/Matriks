-- ============================================================
-- Matriks — app settings (invite code) + owner admin management
-- Idempotent. Owner: danielsmb385@gmail.com
-- ============================================================

-- ---------- 1) app_settings (singleton row id=1) ----------
create table if not exists public.app_settings (
  id          int primary key,
  invite_code text not null default 'MATRIKS2026',
  updated_at  timestamptz default now()
);

insert into public.app_settings (id, invite_code)
values (1, 'MATRIKS2026')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- Invite code is readable by anyone (soft gate). The anon key can read it.
drop policy if exists app_settings_select_public on public.app_settings;
create policy app_settings_select_public on public.app_settings
  for select using (true);

-- Only the owner can change it.
drop policy if exists app_settings_update_owner on public.app_settings;
create policy app_settings_update_owner on public.app_settings
  for update
  using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

drop policy if exists app_settings_insert_owner on public.app_settings;
create policy app_settings_insert_owner on public.app_settings
  for insert with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

-- ---------- 2) ensure ai_access column exists (idempotent) ----------
alter table public.admins
  add column if not exists ai_access boolean not null default false;

-- Owner always has AI access.
update public.admins
  set ai_access = true
  where role = 'owner' and ai_access = false;

-- ---------- 3) allow owner to add admins by email ----------
drop policy if exists admins_insert_owner on public.admins;
create policy admins_insert_owner on public.admins
  for insert with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');
