<h1 align="center">🧩 SQL Canvas Modeler</h1>

<p align="center">
  <strong>Visual PostgreSQL modeling + bidirectional SQL editing, fully web-based.</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="Zustand" src="https://img.shields.io/badge/Zustand-Persist-black">
  <img alt="Sass" src="https://img.shields.io/badge/Sass-Modules-CC6699?logo=sass&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Modeler-336791?logo=postgresql&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-22c55e">
</p>

---

## ✨ What It Is

`SQL Canvas Modeler` is a frontend SPA to model PostgreSQL databases visually and edit SQL in real time with automatic synchronization between:

- 🧠 visual model (canvas + inspector)
- 📜 SQL script (live editor)

Goal: shorten the path from idea to consistent SQL schema while keeping a clean and productive UX.

---

## 🧭 Table of Contents

- [🎯 Main Features](#-main-features)
- [🖥️ User Experience](#️-user-experience)
- [🏗️ Technical Architecture](#️-technical-architecture)
- [📦 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [🛠️ Available Scripts](#️-available-scripts)
- [🧪 Code Quality](#-code-quality)
- [📚 SQL Support](#-sql-support)
- [💾 Local Persistence](#-local-persistence)
- [❓FAQ](#-faq)
- [🛣️ Suggested Roadmap](#️-suggested-roadmap)
- [📄 License](#-license)

---

## 🎯 Main Features

### 📐 Complete Database Modeling

- database metadata management (`name`, `owner`, `encoding`, `lc_collate`, `lc_ctype`, `template`)
- multi-schema support
- extension management
- create/duplicate/rename/move tables across schemas
- column modeling with PostgreSQL types, defaults, and constraints

### 🔗 Relations and Constraints

- foreign key creation between tables
- `ON UPDATE` / `ON DELETE` configuration
- constraint naming and lifecycle management
- relation rendering directly in the canvas

### 🗺️ Relationship Canvas

- draggable table nodes
- persisted node positions
- quick fit and center actions
- layout presets (balanced, focus canvas, focus inspector, focus SQL)

### 📜 Bidirectional SQL Editor (Core)

- live SQL generation from the model
- automatic re-import of SQL edits into the model
- non-blocking warnings and validation feedback
- export and copy to clipboard

### 🧰 Operational Workspace

- import SQL from `.sql` or `.txt` files
- built-in templates for quick bootstrap
- command palette (`Ctrl+K`) for fast actions
- light/dark mode
- resizable, collapsible, and maximizable panels

---

## 🖥️ User Experience

Three-panel layout:

1. `Explorer`:
project operations, schema/table management, SQL import, table actions.

2. `Canvas`:
visual graph of tables and relations with drag & drop.

3. `Inspector`:
table structure editing, relation editing, SQL editor.

### ⌨️ Shortcut

- `Ctrl+K`: open command palette

---

## 🏗️ Technical Architecture

### Stack

- ⚛️ React 19
- 🔷 TypeScript (strict)
- ⚡ Vite 7
- 🐻 Zustand with `persist` + `localStorage`
- 🎨 Modular Sass (`tokens`, `mixins`, feature modules)
- 🔄 `@xyflow/react` for relational canvas
- 🖼️ `lucide-react` for icons

### Data Flow (High Level)

1. Domain state is handled in `schemaStore` (database, tables, relations).
2. SQL output is generated via `generateProjectSql`.
3. SQL edits are parsed back via `parseSqlSchema`.
4. Explorer/canvas/inspector update in real time.

---

## 📦 Project Structure

```text
src/
  app/                 # main layout composition
  components/ui/       # reusable UI primitives
  domain/              # domain models and types
  features/            # functional UI modules
  lib/
    sql/               # SQL parser + generator
    file/              # file import/export helpers
    templates/         # ready-to-use SQL templates
  store/               # Zustand stores
  styles/              # base, tokens, mixins
```

---

## 🚀 Quick Start

### Requirements

- Node.js 20+ recommended
- npm 10+ recommended

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open `http://localhost:5173`.

---

## 🛠️ Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | start Vite dev server |
| `npm run build` | production build into `dist/` |
| `npm run preview` | preview production build |
| `npm run lint` | run ESLint |

---

## 🧪 Code Quality

```bash
npm run lint
npm run build
```

Both commands should pass before merging changes.

---

## 📚 SQL Support

Current import support covers common PostgreSQL patterns:

- `CREATE TABLE ... (...)`
- `PRIMARY KEY`, `UNIQUE`, `NOT NULL`, `DEFAULT`
- inline `FOREIGN KEY`
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...`

If some SQL statements cannot be mapped to the UI model:

- they are reported as warnings
- flow continues without hard failure

---

## 💾 Local Persistence

State is persisted through `localStorage`:

- schema project (database/tables/relations)
- panel layout and presets
- active inspector tab
- current theme

Main keys:

- `sql-canvas-project-v1`
- `sql-canvas-layout-v1`
- `sql-canvas-inspector-v1`
- `sql-canvas-theme-v1`

---

## ❓FAQ

### Can I work only in SQL without touching the canvas?

Yes. The SQL editor is synchronized with the model and updates the UI when parsing is valid.

### Can I import an existing SQL script?

Yes, from Explorer with `.sql`/`.txt` file import.

### Where are global quick commands?

Use command palette with `Ctrl+K`.

### Is the project auto-saved?

Yes, state is automatically persisted locally.

---

## 🛣️ Suggested Roadmap

- full JSON project export
- global undo/redo
- broader SQL parser support for PostgreSQL edge cases
- E2E tests for import/edit/export workflows
- advanced template plugin system

---

## 📄 License

This project is distributed under MIT license.

See [LICENSE](./LICENSE) for details.
