# Knowledge Vault + Matriks AI — PRD

## Problem Statement
A SaaS dashboard to store large amounts of copy-ready, editable information (credentials, notes, links, snippets), with a vault-aware AI assistant.

## Architecture (current)
- **Frontend**: React 19 + Tailwind + craco, modular pages/components/hooks
- **Data layer**: Supabase (Postgres + Auth + RLS + Realtime)
- **AI**: Kimi/Moonshot via optional Edge Function proxy; multi-thread chat; vault context injection
- **Backend**: health-check only (no app data)

## Core Requirements
- Auth (login/signup/logout, password reset)
- Per-user RLS isolation
- CRUD items + categories, soft delete / trash
- Search, sort, favorites, images, export/import
- Matriks AI: streaming, markdown, multi-thread, vault-aware system prompt, stop/regenerate, suggested prompts
- Admin gate for AI (`admins.ai_access`)

## Implemented
- Full Supabase migration + modular frontend refactor
- Image upload + lightbox
- Trash / soft delete as default from Vault
- Chat threads schema (`0009_chat_threads.sql`)
- useChat (DB + localStorage fallback)
- AIPage rewrite (sidebar, markdown, context, stop, regenerate, prompts)
- Edge Function template `supabase/functions/ai-chat`

## Backlog
- Function calling (search/create/update items from AI)
- Optimistic realtime merge
- PWA / offline
- Field-level encryption UX for sensitive items
- Model selector UI
- Attachment in chat
