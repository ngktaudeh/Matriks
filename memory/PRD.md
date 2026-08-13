# Knowledge Vault — PRD

## Problem Statement
A SaaS dashboard to store large amounts of copy-ready, editable information (credentials, notes, links, snippets). Migrated data layer to Supabase so each user's data is private, persistent, synced across devices, and protected by Row Level Security.

## Architecture (current)
- **Frontend**: React (craco) + Tailwind. Single app in `/app/frontend/src/App.js`.
- **Data layer**: 100% Supabase (Postgres + Auth + RLS + Realtime) via `@supabase/supabase-js@2.45.4`. Client in `/app/frontend/src/lib/supabaseClient.js`.
- **Auth**: Supabase email+password. Auth gate in `App()`; `Dashboard()` after login.
- **Backend**: `/app/backend/server.py` reduced to a health-check stub only (no data). MongoDB/motor data routes removed.
- **Schema/RLS**: `/app/supabase/migrations/0001_init.sql` (tables `items`, `categories`, updated_at trigger, unique (user_id, lower(name)), RLS policies `auth.uid() = user_id`, realtime publication).
- Env: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` (+ `.env.example`). Theme stays in localStorage.

## Core Requirements (static)
- Auth (login/signup/logout, session sync via onAuthStateChange)
- Per-user data isolation via RLS (verified: User B cannot read/delete User A rows)
- Full CRUD for items + categories via supabase client
- Copy w/ feedback, real-time search, sorting, favorites
- Realtime sync across tabs/devices
- Export/Import JSON, styled New Category modal, "All excludes Archive" tooltip
- Error toasts (sonner), config-error screen if env missing
- Responsive drawer, dark/light, Avenir/Garamond typography

## Implemented (2026-06)
- Full Supabase migration; RLS proven via REST (A/B isolation) and UI signup shows empty per-user vault
- All 17 UI flows passed (testing agent iteration_3); duplicate-category key warning fixed via defensive de-dupe in `categories` memo
- README with real setup steps; SQL migration file included and already applied to the live project

## Implemented (2026-06) — Editable categories
- Categories are now data-driven from the `categories` table (defaults Credentials/Notes/Links seeded per user on first load). All/Favorites/Archive are system (non-editable).
- Right-click a category (or hover ⋯) → context menu Rename / Delete (`/app/frontend/src/App.js`: Sidebar context menu, `renameCategory`, `deleteCategory`, `RenameCategoryModal`, `ConfirmCategoryDelete`).
- Rename updates the category row AND all items with that category (items follow). Delete moves items to Archive (never deletes item data). Verified live via browser.

## Backlog (P1/P2)
- P2: Undo on favorite/delete
- P2: Password reset / magic link
- P2: Error boundary around Dashboard
- P2: Optimistic realtime merge (currently refetch on change)

## Removed
- FastAPI/MongoDB data routes, motor usage, custom auth — replaced entirely by Supabase.
