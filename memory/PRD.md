# Knowledge Vault — PRD

## Problem Statement
A frontend-only SaaS dashboard to store large amounts of information that can be copied and edited with ease. React + Tailwind, state in localStorage, no backend.

## Architecture
- React (CRA/craco) + Tailwind CSS, single-file app in `/app/frontend/src/App.js`
- State: `useReducer` for items + `useState` for categories/theme, persisted to localStorage
- localStorage keys: `vault-items`, `vault-categories`, `vault-theme`
- Fonts (Tailwind fontFamily): `sans` = Avenir stack (UI chrome), `serif` = EB Garamond stack (body/content)

## User Persona
Individuals/teams storing credentials, notes, links, snippets they need to copy and edit quickly.

## Core Requirements (static)
- Full CRUD for items, move between categories
- One-click copy with "Copied!" feedback (1.5s)
- Real-time search (title + content + tags)
- Sorting: Newest / A-Z / Favorites first
- Per-item favorite toggle
- localStorage persistence (load on mount, save on change)
- Responsive: sidebar → hamburger drawer below 768px
- Informative empty states
- Dark/light mode

## Implemented (2026-06)
- Sidebar (categories All/Favorites/Credentials/Notes/Links/Archive + custom, counts, quick search, + New Category)
- Header (global search, + Add Item, theme toggle)
- Card grid with title/content preview/tags/category + Copy/Edit/Delete/Favorite
- Create/Edit modal (title, content textarea, category select, tags, favorite toggle)
- Delete confirm dialog
- Seeded demo data on first load
- Verified 100% via testing agent (iteration_1.json)

## Backlog (P1/P2)
- P2: Replace window.prompt New Category with a styled modal
- P2: Import/export vault as JSON
- P2: Tooltip clarifying "All" excludes Archive
