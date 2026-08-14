-- ============================================================
-- Bank Jawaban CS — multi-admin (owner + approved admins)
-- Idempotent. Owner: danielsmb385@gmail.com
--
-- Sudah diterapkan langsung ke DB. Disimpan sebagai arsip.
-- ============================================================

-- ---------- 1) admins table ----------
create table if not exists public.admins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  email       text not null unique,
  role        text not null default 'admin',   -- 'owner' | 'admin'
  status      text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at  timestamptz default now()
);
create index if not exists admins_email_idx on public.admins (email);
create index if not exists admins_status_idx on public.admins (status);

-- ---------- 2) seed owner ----------
insert into public.admins (user_id, email, role, status)
select id, email, 'owner', 'approved'
from auth.users where email = 'danielsmb385@gmail.com'
on conflict (email) do nothing;

-- ---------- 3) helper (avoid policy recursion) ----------
create or replace function public.is_admin_approved(target_email text)
returns boolean language sql security definer stable
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(target_email) and status = 'approved'
  );
$$;

-- ---------- 4) RLS: admins ----------
alter table public.admins enable row level security;

drop policy if exists admins_select_owner on public.admins;
create policy admins_select_owner on public.admins
  for select using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

drop policy if exists admins_select_approved on public.admins;
create policy admins_select_approved on public.admins
  for select using (status = 'approved');

drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select using (auth.jwt() ->> 'email' = email);

drop policy if exists admins_insert_self on public.admins;
create policy admins_insert_self on public.admins
  for insert with check (
    auth.jwt() ->> 'email' = email
    and auth.uid() = user_id
    and role = 'admin'
    and status = 'pending'
    and auth.jwt() ->> 'email' <> 'danielsmb385@gmail.com'
  );

drop policy if exists admins_update_owner on public.admins;
create policy admins_update_owner on public.admins
  for update
  using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

drop policy if exists admins_delete_owner on public.admins;
create policy admins_delete_owner on public.admins
  for delete using (
    auth.jwt() ->> 'email' = 'danielsmb385@gmail.com'
    and email <> 'danielsmb385@gmail.com'
  );

-- ---------- 5) rewrite items/categories/storage → approved admins ----------
drop policy if exists items_insert_admin on public.items;
create policy items_insert_admin on public.items for insert
  with check (public.is_admin_approved(auth.jwt() ->> 'email'));

drop policy if exists items_update_admin on public.items;
create policy items_update_admin on public.items for update
  using (public.is_admin_approved(auth.jwt() ->> 'email'))
  with check (public.is_admin_approved(auth.jwt() ->> 'email'));

drop policy if exists items_delete_admin on public.items;
create policy items_delete_admin on public.items for delete
  using (public.is_admin_approved(auth.jwt() ->> 'email'));

drop policy if exists categories_insert_admin on public.categories;
create policy categories_insert_admin on public.categories for insert
  with check (public.is_admin_approved(auth.jwt() ->> 'email'));

drop policy if exists categories_update_admin on public.categories;
create policy categories_update_admin on public.categories for update
  using (public.is_admin_approved(auth.jwt() ->> 'email'))
  with check (public.is_admin_approved(auth.jwt() ->> 'email'));

drop policy if exists categories_delete_admin on public.categories;
create policy categories_delete_admin on public.categories for delete
  using (public.is_admin_approved(auth.jwt() ->> 'email'));

drop policy if exists "item-images admin insert" on storage.objects;
create policy "item-images admin insert" on storage.objects for insert
  with check (bucket_id = 'item-images' and public.is_admin_approved(auth.jwt() ->> 'email'));

drop policy if exists "item-images admin update" on storage.objects;
create policy "item-images admin update" on storage.objects for update
  using (bucket_id = 'item-images' and public.is_admin_approved(auth.jwt() ->> 'email'));

drop policy if exists "item-images admin delete" on storage.objects;
create policy "item-images admin delete" on storage.objects for delete
  using (bucket_id = 'item-images' and public.is_admin_approved(auth.jwt() ->> 'email'));

-- ---------- 6) realtime ----------
alter publication supabase_realtime add table public.admins;
