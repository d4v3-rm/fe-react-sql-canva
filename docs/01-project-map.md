# 01 - Project Map

## Goal

Understand where new code should live and where it should not.

## Main structure

```text
src/
  app/                  # main layout orchestration
  components/ui/        # reusable generic UI primitives
  domain/               # domain types and defaults
  features/             # vertical functional modules
  lib/                  # pure logic: parser/generator/helpers
  store/                # global Zustand state
  styles/               # tokens, mixins, base styles
```

## Placement rules

### `src/app`

- composes top-level layout and panel behavior
- orchestrates feature modules
- should not contain deep SQL parsing logic

### `src/components/ui`

- reusable base components (`Button`, `Card`, `Field`, `Badge`, `Dialog`)
- no database-specific domain logic

### `src/domain`

- project language and contracts:
  - `DatabaseModel`
  - `TableModel`
  - `ColumnModel`
  - `RelationModel`
- update domain first when introducing new model fields

### `src/features`

- each folder is one vertical UI feature
- examples:
  - `explorer`
  - `canvas`
  - `inspector`
  - `sql-preview`
  - `table-editor`
  - `command-palette`

### `src/lib`

- pure testable logic without React dependencies
- current areas:
  - `sql/` parser + SQL generator
  - `templates/` built-in template SQL
  - `file/` text import/export helpers
  - `schemaHelpers.ts`, `id.ts`
- note: `lib/codegen/generateSequelizeScaffold.ts` exists but is not currently wired to the UI

### `src/store`

- global state and persistence
- separate stores by concern:
  - `schemaStore`
  - `layoutStore`
  - `themeStore`
  - `inspectorStore`
  - `canvasViewStore`

### `src/styles`

- `_tokens.scss`: semantic tokens
- `_mixins.scss`: shared mixins
- `_base.scss`: light/dark CSS variables + base reset

## Runtime entry points

- `src/main.tsx`: mounts `App` inside `DialogProvider`
- `src/app/App.tsx`: 3-panel layout, resize/collapse/maximize, command palette
