# Matriks — Knowledge Vault + AI

A minimal, polished SaaS dashboard to store large amounts of information you can **copy** and **edit** with ease — credentials, notes, links, snippets — plus a **vault-aware AI chat** (Matriks AI).

Each user's data is private, synced across devices in real time, and protected by Postgres Row Level Security.

The data layer is **100% Supabase** (Postgres + Auth + RLS + Realtime). There is **no custom backend server** for vault data — the React frontend talks to Supabase directly via `@supabase/supabase-js`.

AI chat can call Kimi/Moonshot either:
- **Recommended:** via Supabase Edge Function (`supabase/functions/ai-chat`) so the API key never ships to the browser
- **Dev only:** `REACT_APP_KIMI_API_KEY` in frontend `.env` (not safe for production)

---

## Features

### Vault
- Email + password auth (Supabase Auth) with login / signup / logout / password reset
- Full CRUD for items, categories, move between categories
- Soft delete → **Tempat Sampah** (restore / permanent delete)
- One-click copy to clipboard with visual feedback
- Real-time search (title + content + tags), sorting (Newest / A–Z / Favorites / Updated)
- Per-item favorite toggle, bulk select
- Image upload (compress → Supabase Storage) + lightbox
- Password generator, item templates
- Realtime sync across tabs/devices
- Export vault to JSON / import from JSON
- Dark / light mode, fully responsive (sidebar → drawer below 768px)

### Matriks AI (`/ai`, shortcut **Ctrl+B**)
- **Vault-aware**: system prompt includes a live summary of the user's items
- **Multi-thread** chat history (sidebar: new / rename / delete)
- Persistence to Supabase (`chat_threads` / `chat_messages`) with localStorage fallback
- Streaming responses, **stop generation**, **regenerate**
- Markdown rendering (headings, lists, code blocks, links)
- Suggested prompt chips on empty state
- Access gated by `admins.ai_access` (owner always allowed)
- Optional secure proxy via Edge Function

---

## Setup

### 1. Create a Supabase project
1. Go to https://supabase.com/dashboard and create a new project.
2. Wait for it to finish provisioning.

### 2. Run database migrations
In **SQL Editor → New query**, run (in order or use the consolidated file):

- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_item_image_subtitle.sql`
- `supabase/migrations/0003_bank_jawaban_cs.sql`
- `supabase/migrations/0004_multi_admin.sql`
- `supabase/migrations/0005_admin_ai_access.sql`
- `supabase/migrations/0007_trash_and_templates.sql`
- `supabase/migrations/0008_app_settings.sql`
- **`supabase/migrations/0009_chat_threads.sql`** ← AI chat history

Or paste `supabase/migrations/9999_consolidated_setup.sql` if you maintain one.

Also create Storage bucket **`item-images`** (public read) for image uploads.

### 3. API keys
**Project Settings → API**
- Project URL → `REACT_APP_SUPABASE_URL`
- anon public key → `REACT_APP_SUPABASE_ANON_KEY`

### 4. Environment variables
```bash
cp frontend/.env.example frontend/.env
```

```env
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-public-key

# AI — production: proxy (recommended)
REACT_APP_AI_PROXY_URL=https://YOUR-PROJECT.supabase.co/functions/v1/ai-chat

# AI — development only (exposes key in browser)
# REACT_APP_KIMI_API_KEY=sk-...
REACT_APP_AI_MODEL=kimi-k3
```

### 5. Deploy AI Edge Function (recommended)
```bash
# from repo root, with Supabase CLI logged in
supabase secrets set KIMI_API_KEY=sk-your-moonshot-key
supabase functions deploy ai-chat
```

### 6. Run locally
```bash
cd frontend
yarn install
yarn start
```

Sign up, then grant AI access via the `admins` table (`ai_access = true`) or use the owner email.

---

## Project structure

```
frontend/
  src/
    App.jsx
    pages/
      VaultPage.jsx
      AIPage.jsx          # Matriks AI (multi-thread, vault context, markdown)
      TrashPage.jsx
      LoginPage.jsx
      ResetPasswordPage.jsx
    components/
      AI/                # ChatMessage, ChatSidebar, SuggestedPrompts, MarkdownContent
      Vault/
      Auth/
      Layout/
      UI/
    hooks/
      useChat.js         # threads + messages (DB + localStorage fallback)
      useItems.js
      useAdmin.js
      ...
    utils/
      markdown.js        # lightweight MD → HTML
supabase/
  migrations/
    0009_chat_threads.sql
  functions/
    ai-chat/index.ts     # secure API proxy
```

---

## How data isolation works (RLS)

Row Level Security is enabled on items, categories, chat tables, etc. Policies check `auth.uid() = user_id`.

---

## Live

[matriks-rouge.vercel.app](https://matriks-rouge.vercel.app)
