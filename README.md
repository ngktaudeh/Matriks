# Knowledge Vault

A minimal, polished SaaS dashboard to store large amounts of information you can **copy** and **edit** with ease — credentials, notes, links, snippets. Each user's data is private, synced across devices in real time, and protected by Postgres Row Level Security.

The data layer is **100% Supabase** (Postgres + Auth + RLS + Realtime). There is **no custom backend server** — the React frontend talks to Supabase directly via `@supabase/supabase-js`.

---

## Features

- Email + password auth (Supabase Auth) with login / signup / logout
- Full CRUD for items, categories, move between categories
- One-click copy to clipboard with visual feedback
- Real-time search (title + content + tags), sorting (Newest / A–Z / Favorites first)
- Per-item favorite toggle
- Realtime sync — changes appear live across tabs/devices for the same user
- Export vault to JSON / import from JSON
- Dark / light mode, fully responsive (sidebar → drawer below 768px)
- Avenir (UI chrome) + EB Garamond (body/content) typography

---

## 1. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and create a new project.
2. Wait for it to finish provisioning.

## 2. Run the database migration

1. In the Supabase Dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
3. Click **Run**.

This creates the `items` and `categories` tables, the `updated_at` trigger, the case-insensitive unique category constraint, **enables Row Level Security with per-user policies**, and adds both tables to the Realtime publication.

## 3. Get your API keys

In the Supabase Dashboard: **Project Settings → API**

- **Project URL** → `REACT_APP_SUPABASE_URL`
- **anon public** (a.k.a. publishable) key → `REACT_APP_SUPABASE_ANON_KEY`

> Never use or expose the `service_role` key in the frontend — it bypasses RLS.

## 4. Configure environment variables

Copy the example file and fill it in:

```bash
cp frontend/.env.example frontend/.env
```

```env
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-public-key
```

If these are missing, the app shows a clear full-screen "Supabase is not configured" message instead of crashing.

## 5. Run locally

```bash
cd frontend
yarn install
yarn start
```

Open the app, **sign up** with an email + password, and start adding items.

> Depending on your Supabase project's Auth settings, signup may require email confirmation. You can disable "Confirm email" under **Authentication → Providers → Email** for faster local testing.

---

## How data isolation works (RLS)

Row Level Security is enabled on both tables. Every policy checks `auth.uid() = user_id`, so:

- A logged-in user can only `SELECT / INSERT / UPDATE / DELETE` **their own** rows.
- No row is publicly readable or writable.
- The frontend never filters by `user_id` in queries — RLS enforces ownership on the server. The app only sets `user_id` on insert.

You can verify: create items with User A, log out, sign up as User B — User B sees an empty vault.

---

## What was removed (and why)

The previous version used a **FastAPI + MongoDB** backend (`/api/items`, `/api/categories`). That has been retired:

- **MongoDB / `motor` data routes removed** — Supabase Postgres is now the single source of truth.
- **No custom auth** — replaced by Supabase Auth (secure, managed, with RLS integration).
- `backend/server.py` is reduced to a tiny health-check endpoint only, so the process/container stays healthy in this hosting environment. It stores and serves **no application data**.

The result: less code to maintain, real authentication, per-user data isolation enforced at the database level, and live multi-device sync — all without running a custom server.

---

## Project structure

```
frontend/
  src/
    App.js                  # entire UI + Supabase data layer + auth gate
    lib/supabaseClient.js   # single Supabase client init
  .env.example              # REACT_APP_SUPABASE_URL / _ANON_KEY
supabase/
  migrations/0001_init.sql  # tables, triggers, RLS policies, realtime
backend/
  server.py                 # health-check only (no data layer)
```
