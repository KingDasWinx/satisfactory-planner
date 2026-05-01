<div align="center">
  <img src="docs/screenshots/banner.png" alt="Satisfactory Factory Planner" width="100%" />
</div>

### 🏭 Plan your Satisfactory factories visually

<div align="center">

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![@xyflow/react](https://img.shields.io/badge/@xyflow-12-FF0072)](https://reactflow.dev/)

</div>

**Satisfactory Factory Planner** is a visual production-chain editor for the
game *Satisfactory*. Build your assembly lines by dragging machines, connecting
belts and pipes, and watch rates, efficiency, and power consumption update in
real time — all in your browser, with no backend.

- 🧩 **Interactive graph editor** — drag, connect, and configure nodes
- ⚡ **Real-time flow calculation** — rates, efficiency, and power
- 🪄 **Magic Planner Wizard** — auto-generates production chains
- 💾 **Multiple projects** — saved locally, no login required
- 🖼️ **PNG export** — share your blueprints

---

## 🎬 Demo

> **Demo video**
>
> https://github.com/user-attachments/assets/PLACEHOLDER-VIDEO-ID
>
> *To host: drag the `.mp4` into a GitHub issue, PR, or comment — GitHub will
> generate a `user-attachments` URL that you can paste here.*

<div align="center">
  <img src="docs/screenshots/demo.gif" alt="Editor demo" width="85%" />
</div>

---

## ✨ Features

### Graph editor

<div align="center">
  <img src="docs/screenshots/editor.png" alt="Graph editor" width="85%" />
</div>

- Supported nodes: **Machines**, **Splitters**, **Mergers**, **Storage**, **Text**, and **Frames**
- Edges colored by efficiency: green ≥ 100%, yellow 50–99%, red < 50%
- Keyboard shortcuts, **undo / redo**, **auto-save**, and internal clipboard
- Context menu and quick search to insert new nodes

### Machine configuration

<div align="center">
  <img src="docs/screenshots/machine-config.png" alt="Machine config popup" width="60%" />
</div>

- **Clock speed** from `0.01` to `2.5` (official formula: `P = P_base × clockSpeed^1.322`)
- Manual or auto-calculated machine count
- Miner variants (Mk.1 / Mk.2 / Mk.3) and output overrides
- Alternate recipes filtered by machine

### Magic Planner Wizard

<div align="center">
  <img src="docs/screenshots/magic-planner.png" alt="Magic Planner Wizard" width="60%" />
</div>

Pick a target part and a desired rate — the wizard builds the entire production
chain, from raw resource to final item.

### Projects panel

- Multiple projects in the same browser
- Rename, duplicate, and delete
- `localStorage` persistence — nothing leaves your machine

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (tested on v24)
- **npm**

### Installation

```bash
git clone https://github.com/<your-username>/satisfactory-planner.git
cd satisfactory-planner
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run cli` | Game data extractor (not part of the web app) |

---

## 🔐 Cloud save (optional)

By default, projects are saved only in your browser (`localStorage`) and **no login is required**.

If you want to enable **cloud save** (Postgres + login), create a `.env` file:

- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public`
- `AUTH_SECRET=...` (required)
- `AUTH_TRUST_HOST=true` (may be required depending on your host)
- `AUTH_GITHUB_ID=...` / `AUTH_GITHUB_SECRET=...` (optional)
- `AUTH_GOOGLE_ID=...` / `AUTH_GOOGLE_SECRET=...` (optional)

Then run Prisma generate/migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

---

## 🏗️ Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Visual graph | [@xyflow/react](https://reactflow.dev/) 12 |
| Global state | Zustand 5 |
| Language | TypeScript 6 (`strict`) |
| Runtime | Node.js |

---

## 📁 Structure

```
├── app/                  # Next.js routes (App Router)
├── components/
│   ├── nodes/            # Graph nodes (Machine, Splitter, Merger, Storage, Text, Frame)
│   ├── panels/           # Floating panels (search, context, Magic Planner, projects)
│   ├── layout/           # Layout wrappers
│   └── FactoryEditor.tsx # Main canvas compositor
├── lib/
│   ├── types/            # TypeScript interfaces and types
│   ├── hooks/            # Reusable custom hooks
│   ├── utils/            # Pure functions (export, flow calculation)
│   ├── gameData.ts       # Server-side loader
│   └── flowCalc.ts       # Single source of truth for calculations
├── store/                # Zustand stores (factory, projects)
├── data/
│   ├── game/             # game_data.json (already parsed)
│   ├── Docs/             # Game language JSONs
│   └── scripts/          # Extraction scripts
├── scripts/              # Extraction CLI (outside the app)
└── public/               # Static assets
```

Detailed conventions in [CLAUDE.md](CLAUDE.md).

---

## 🎮 Game data

The data in `data/game/game_data.json` is extracted from the official files
exported by [@satisfactory-dev/docs.json.ts](https://www.npmjs.com/package/@satisfactory-dev/docs.json.ts).
To regenerate:

```bash
npm run cli
```

Scope covers machines, recipes (including alternates), items, buildings, and
power/tier metadata.

---

## 🤝 Contributing

Pull requests are welcome! Before opening a PR:

1. Read [CLAUDE.md](CLAUDE.md) — code conventions, color palette, and folder organization
2. Keep components ≤ 150 lines and hooks ≤ 80 lines
3. Types always in `lib/types/`, never inline
4. Commit messages in English, imperative mood

---

## 📄 License

Distributed under the **GNU General Public License v3.0** (or later).
See [LICENSE](LICENSE) for the full text.

> This project is **not affiliated** with Coffee Stain Studios. *Satisfactory*
> is a trademark of its respective owners.

---

## 🔗 Links

- [Satisfactory (official game)](https://www.satisfactorygame.com/)
- [@xyflow/react — graph library](https://reactflow.dev/)
- [Issues](https://github.com/<your-username>/satisfactory-planner/issues)

