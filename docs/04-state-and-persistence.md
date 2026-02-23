# 04 - State and Persistence

## Main stores

### `schemaStore`

Handles:

- database metadata
- tables and columns
- relations
- SQL import and template application
- selected table state

Persistence:

- key: `sql-canvas-project-v1`
- uses `partialize` + custom `merge`

### `layoutStore`

Handles:

- panel widths
- collapsed/maximized panels
- layout presets

Persistence key:

- `sql-canvas-layout-v1`

### `themeStore`

Handles:

- light/dark mode

Persistence key:

- `sql-canvas-theme-v1`

### `inspectorStore`

Handles:

- active inspector tab

Persistence key:

- `sql-canvas-inspector-v1`
- includes tab sanitization for legacy values

### `canvasViewStore`

Handles:

- imperative canvas events (fit view / center selected)

## Rules for new global state

1. Verify state must really be global.
2. Add persistence only when it improves UX.
3. If persisted shape may evolve, add safe merge logic.
4. Keep setters predictable and side-effect free.

## Immutable update pattern

```ts
set((state) => ({
  tables: state.tables.map((table) =>
    table.id === tableId ? { ...table, name: nextName } : table,
  ),
}))
```

## Important invariants

- at least one valid schema (`public` fallback)
- relation cleanup when source/target columns disappear
- stable IDs when merging imported SQL where possible
- `lastSavedAt` updated on meaningful project mutations
