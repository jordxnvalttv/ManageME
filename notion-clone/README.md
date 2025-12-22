# Notion-like Project Manager (localStorage)

A minimal, local-only Notion-style project manager built with React + Vite + Tailwind. Data is stored in localStorage so you can try it locally without a backend.

Quick start

1. Install dependencies:

   npm install

2. Start dev server:

   npm run dev

Notes

- This is an initial scaffold with block-based page editor and localStorage persistence.

Features implemented so far:

- Block-based page editor with headings, text, to-do blocks, Enter-to-insert, and drag-to-reorder.
- Boards / Kanban view with draggable cards and multi-column support.
- **Calendar (month view)** with clickable days to create events, event editing, reminders, and local notifications.
- Local persistence (localStorage) with simple migration skeleton.
- Export/Import (JSON backup) and Reset to defaults.
- Simple search and tag-based filtering across pages and cards.

Next steps: add keyboard shortcuts, richer editing (formatting), improved drag UX (dnd-kit), week/day calendar views, tests, and deployment.
