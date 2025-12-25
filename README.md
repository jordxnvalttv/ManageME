
# ManageME — Project Manager (localStorage)

A minimal, client-side project manager built with React, Vite, and Tailwind.
Data is stored in localStorage so you can run it locally without a backend.

## 🚀 Quick start

```bash
# from the project root
cd notion-clone
npm install
npm run dev    # open http://localhost:5173/ (or another port if 5173 is in use)
```

## 🧭 Features

- Boards / Kanban with columns and draggable cards
- Teams with team-labeled tasks and "From <source>" metadata (shows where a task was created)
- Calendar with event creation, reminders, and local notifications
- Export / Import JSON backups and Reset to defaults
- Simple local persistence (migrations included)

## 📁 Project structure

- `src/` — application source
- `src/components/` — UI components (Workspace, Calendar, CardModal, etc.)
- `src/storage.js` — persistence helpers and event scheduling
- `index.html`, `package.json`, `README.md`

## 🛠 Development

- `npm run dev` — starts the dev server
- `npm run build` — production build
- `npm run preview` — preview the build

## 🏷 Contributing

1. Create a branch: `git checkout -b chore/add-readme`
2. Make changes, then `git commit -m "chore: add README"`
3. Push and open a pull request for review

## Future plans

- Deploy ManageME as a hosted web app so it’s accessible from any device, with optional account-based syncing.
- Improve the UI/UX with a cleaner, more responsive design, mobile support, and accessibility enhancements.
- Add collaboration features (shared boards, permissions, activity history) and improve export/import workflows.
