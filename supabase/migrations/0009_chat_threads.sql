-- ============================================================
-- Matriks AI — Chat threads & messages
-- Menyimpan riwayat percakapan per user agar tidak hilang
-- saat ganti device / clear localStorage.
-- Idempotent.
-- ============================================================

-- Threads (satu percakapan = satu thread)
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Percakapan baru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages dalam thread
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  is_error boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_user_id_idx on public.chat_threads (user_id);
create index if not exists chat_threads_updated_at_idx on public.chat_threads (updated_at desc);
create index if not exists chat_messages_thread_id_idx on public.chat_messages (thread_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at);

-- updated_at trigger untuk threads
create or replace function public.set_chat_thread_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
  before update on public.chat_threads
  for each row execute function public.set_chat_thread_updated_at();

-- Saat ada pesan baru, update updated_at thread
create or replace function public.touch_chat_thread()
returns trigger
language plpgsql
as $$
begin
  update public.chat_threads
    set updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch_thread on public.chat_messages;
create trigger chat_messages_touch_thread
  after insert on public.chat_messages
  for each row execute function public.touch_chat_thread();

-- RLS
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_threads_select_own" on public.chat_threads;
create policy "chat_threads_select_own" on public.chat_threads
  for select using (auth.uid() = user_id);

drop policy if exists "chat_threads_insert_own" on public.chat_threads;
create policy "chat_threads_insert_own" on public.chat_threads
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_threads_update_own" on public.chat_threads;
create policy "chat_threads_update_own" on public.chat_threads
  for update using (auth.uid() = user_id);

drop policy if exists "chat_threads_delete_own" on public.chat_threads;
create policy "chat_threads_delete_own" on public.chat_threads
  for delete using (auth.uid() = user_id);

drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own" on public.chat_messages
  for select using (auth.uid() = user_id);

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own" on public.chat_messages
  for delete using (auth.uid() = user_id);

-- Realtime (opsional)
do $$
begin
  alter publication supabase_realtime add table public.chat_threads;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;
