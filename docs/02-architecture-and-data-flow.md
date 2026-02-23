# 02 - Architecture and Data Flow

## High-level architecture

The project uses a clear separation:

- React UI in feature modules
- global state in Zustand stores
- SQL logic in pure modules (`lib/sql`)

## Main flow: GUI -> SQL

1. User edits database/tables/columns/relations from the UI.
2. Actions update `schemaStore`.
3. `App.tsx` derives `sqlScript` via `generateProjectSql`.
4. `SqlPreview` shows synchronized SQL output.

## Reverse flow: SQL -> GUI

1. User edits SQL in the SQL tab.
2. `SqlPreview` triggers a debounced import.
3. `schemaStore.importSql` calls `parseSqlSchema`.
4. If parsing is valid, database/tables/relations are updated.
5. If parsing fails, warnings are shown without corrupting model state.

## Layout and UX flow

- `layoutStore` controls:
  - panel widths
  - collapsed/maximized state
  - layout presets
- `inspectorStore` controls active inspector tab (`structure`, `relations`, `sql`)
- `themeStore` controls light/dark theme

## Simplified logical diagram

```text
UI Events
  -> Zustand Stores (schema/layout/theme/inspector)
    -> Derived State
      -> Feature Rendering (Explorer, Canvas, Inspector)
        -> SQL Generator / SQL Parser
          -> Store Update
```

## Guiding principle

Features should not talk to each other directly.

- share data through stores
- share logic through pure `lib` modules

This keeps coupling low and refactors predictable.
