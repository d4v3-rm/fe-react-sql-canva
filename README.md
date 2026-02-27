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

### Sample SQL Script (Enterprise)

```sql
CREATE SCHEMA IF NOT EXISTS enterprise;

CREATE TABLE enterprise.business_units (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  region_code VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE enterprise.departments (
  id BIGSERIAL PRIMARY KEY,
  business_unit_id BIGINT NOT NULL REFERENCES enterprise.business_units(id) ON DELETE RESTRICT,
  parent_department_id BIGINT REFERENCES enterprise.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  budget_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_unit_id, code)
);

CREATE TABLE enterprise.locations (
  id BIGSERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  address_line TEXT,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'
);

CREATE TABLE enterprise.roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT
);

CREATE TABLE enterprise.permissions (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL
);

CREATE TABLE enterprise.employees (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES enterprise.departments(id) ON DELETE RESTRICT,
  location_id BIGINT REFERENCES enterprise.locations(id) ON DELETE SET NULL,
  manager_id BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('invited','active','on_leave','inactive')),
  hourly_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  hired_at DATE NOT NULL,
  resigned_at DATE
);

CREATE TABLE enterprise.role_permissions (
  role_id BIGINT NOT NULL REFERENCES enterprise.roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES enterprise.permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE enterprise.employee_roles (
  employee_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES enterprise.roles(id) ON DELETE RESTRICT,
  granted_by BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (employee_id, role_id, granted_at)
);

CREATE TABLE enterprise.skills (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  category VARCHAR(80) NOT NULL,
  description TEXT
);

CREATE TABLE enterprise.employee_skills (
  employee_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES enterprise.skills(id) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL CHECK (proficiency BETWEEN 1 AND 5),
  certified BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (employee_id, skill_id)
);

CREATE TABLE enterprise.teams (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES enterprise.departments(id) ON DELETE RESTRICT,
  lead_id BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  objective TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);

CREATE TABLE enterprise.team_members (
  team_id BIGINT NOT NULL REFERENCES enterprise.teams(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE CASCADE,
  is_lead BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at DATE NOT NULL DEFAULT now(),
  left_at DATE,
  PRIMARY KEY (team_id, employee_id)
);

CREATE TABLE enterprise.project_templates (
  id BIGSERIAL PRIMARY KEY,
  created_by BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE enterprise.projects (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES enterprise.departments(id) ON DELETE RESTRICT,
  owner_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE RESTRICT,
  template_id BIGINT REFERENCES enterprise.project_templates(id) ON DELETE SET NULL,
  parent_project_id BIGINT REFERENCES enterprise.projects(id) ON DELETE SET NULL,
  name VARCHAR(220) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('planning','active','paused','completed','archived')),
  start_date DATE NOT NULL,
  target_end_date DATE,
  actual_end_date DATE,
  budget_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  UNIQUE (department_id, slug)
);

CREATE TABLE enterprise.project_tags (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  color_hex CHAR(7) NOT NULL DEFAULT '#6c757d'
);

CREATE TABLE enterprise.project_tag_links (
  project_id BIGINT NOT NULL REFERENCES enterprise.projects(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES enterprise.project_tags(id) ON DELETE CASCADE,
  tagged_by BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  tagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, tag_id)
);

CREATE TABLE enterprise.project_memberships (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES enterprise.projects(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE CASCADE,
  team_id BIGINT REFERENCES enterprise.teams(id) ON DELETE SET NULL,
  role_id BIGINT REFERENCES enterprise.roles(id) ON DELETE SET NULL,
  assigned_by BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (project_id, employee_id)
);

CREATE TABLE enterprise.project_dependencies (
  project_id BIGINT NOT NULL REFERENCES enterprise.projects(id) ON DELETE CASCADE,
  depends_on_project_id BIGINT NOT NULL REFERENCES enterprise.projects(id) ON DELETE RESTRICT,
  dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('hard','soft')),
  reason TEXT,
  PRIMARY KEY (project_id, depends_on_project_id),
  CHECK (project_id <> depends_on_project_id)
);

CREATE TABLE enterprise.sprints (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES enterprise.projects(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  goal TEXT,
  sequence_no INTEGER NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (project_id, sequence_no)
);

CREATE TABLE enterprise.milestones (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES enterprise.projects(id) ON DELETE CASCADE,
  owner_id BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  due_date DATE NOT NULL,
  state VARCHAR(20) NOT NULL CHECK (state IN ('upcoming','active','achieved','late')),
  depends_on_milestone_id BIGINT REFERENCES enterprise.milestones(id) ON DELETE SET NULL
);

CREATE TABLE enterprise.milestone_tasks (
  milestone_id BIGINT NOT NULL REFERENCES enterprise.milestones(id) ON DELETE CASCADE,
  project_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  position_in_list INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (milestone_id, task_id),
  FOREIGN KEY (project_id, task_id) REFERENCES enterprise.tasks(project_id, id) ON DELETE CASCADE
);

CREATE TABLE enterprise.tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL,
  sprint_id BIGINT REFERENCES enterprise.sprints(id) ON DELETE SET NULL,
  milestone_id BIGINT REFERENCES enterprise.milestones(id) ON DELETE SET NULL,
  parent_task_id BIGINT REFERENCES enterprise.tasks(id) ON DELETE SET NULL,
  reporter_id BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  assignee_id BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  title VARCHAR(260) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('todo','in_progress','review','blocked','done')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical','high','medium','low')),
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  started_at TIMESTAMP WITH TIME ZONE,
  due_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (project_id > 0),
  FOREIGN KEY (project_id) REFERENCES enterprise.projects(id) ON DELETE CASCADE
);

CREATE TABLE enterprise.task_dependencies (
  task_id BIGINT NOT NULL REFERENCES enterprise.tasks(id) ON DELETE CASCADE,
  depends_on_task_id BIGINT NOT NULL REFERENCES enterprise.tasks(id) ON DELETE RESTRICT,
  dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('finish_to_start','start_to_start','finish_to_finish')),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE enterprise.labels (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color_hex CHAR(7) NOT NULL DEFAULT '#007bff'
);

CREATE TABLE enterprise.task_labels (
  task_id BIGINT NOT NULL REFERENCES enterprise.tasks(id) ON DELETE CASCADE,
  label_id BIGINT NOT NULL REFERENCES enterprise.labels(id) ON DELETE CASCADE,
  added_by BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE enterprise.task_comments (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES enterprise.tasks(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE RESTRICT,
  parent_comment_id BIGINT REFERENCES enterprise.task_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE enterprise.task_attachments (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES enterprise.tasks(id) ON DELETE CASCADE,
  uploader_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  checksum CHAR(64),
  mime_type VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE enterprise.documents (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES enterprise.projects(id) ON DELETE CASCADE,
  created_by BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE RESTRICT,
  task_id BIGINT REFERENCES enterprise.tasks(id) ON DELETE SET NULL,
  parent_document_id BIGINT REFERENCES enterprise.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (project_id, title, version)
);

CREATE TABLE enterprise.document_accesses (
  document_id BIGINT NOT NULL REFERENCES enterprise.documents(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('viewer','editor','owner')),
  granted_by BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, employee_id)
);

CREATE TABLE enterprise.time_entries (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES enterprise.tasks(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE RESTRICT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  billable BOOLEAN NOT NULL DEFAULT TRUE,
  work_description TEXT,
  approved_by BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE enterprise.notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE CASCADE,
  actor_id BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  task_id BIGINT REFERENCES enterprise.tasks(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES enterprise.projects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email','in_app','slack')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE enterprise.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES enterprise.employees(id) ON DELETE SET NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id BIGINT NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('create','update','delete','restore','archive')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE enterprise.resource_allocations (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES enterprise.projects(id) ON DELETE CASCADE,
  sprint_id BIGINT REFERENCES enterprise.sprints(id) ON DELETE SET NULL,
  employee_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES enterprise.tasks(id) ON DELETE CASCADE,
  allocation_pct NUMERIC(5,2) NOT NULL CHECK (allocation_pct BETWEEN 0 AND 100),
  assigned_from DATE NOT NULL,
  assigned_to DATE NOT NULL,
  note TEXT,
  UNIQUE (project_id, sprint_id, employee_id, task_id)
);

CREATE TABLE enterprise.meeting_rooms (
  id BIGSERIAL PRIMARY KEY,
  location_id BIGINT NOT NULL REFERENCES enterprise.locations(id) ON DELETE CASCADE,
  code VARCHAR(40) NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  has_video BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE enterprise.meetings (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES enterprise.meeting_rooms(id) ON DELETE RESTRICT,
  organizer_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE RESTRICT,
  project_id BIGINT REFERENCES enterprise.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  minutes_summary TEXT,
  CHECK (ends_at > starts_at)
);

CREATE TABLE enterprise.meeting_attendees (
  meeting_id BIGINT NOT NULL REFERENCES enterprise.meetings(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL REFERENCES enterprise.employees(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  attended_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (meeting_id, employee_id)
);
```

---

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
