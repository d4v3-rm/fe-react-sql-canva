# 08 - Feature Playbook

This playbook explains how to add features while respecting project conventions.

## Case A - Add a new field to `ColumnModel`

Example: `comment?: string`.

Steps:

1. update `src/domain/schema.ts`
2. update defaults in `src/domain/defaults.ts`
3. update store mutations if needed
4. update SQL parser/generator if field affects SQL
5. update `TableEditor` UI
6. verify persistence compatibility

Quick checks:

- field survives reload
- SQL round-trip is consistent
- lint/build remain clean

## Case B - Add a new command palette action

Steps:

1. open `features/command-palette/CommandPalette.tsx`
2. add a new `CommandAction` item
3. wire stores/dialog API as needed
4. add meaningful keywords for search

Example:

```tsx
{
  id: 'layout-balanced',
  label: 'Layout: balanced',
  description: 'Restore default panel layout.',
  keywords: ['layout', 'reset'],
  icon: <PanelsTopLeft size={14} />,
  run: () => applyLayoutPreset('balanced'),
}
```

## Case C - Add a new inspector tab/section

Steps:

1. extend `InspectorTab` type in `inspectorStore` if required
2. add tab button in `InspectorPanel`
3. add conditional content rendering
4. update `sanitizeInspectorTab` for persistence migration

## Case D - Extend SQL parser support

Steps:

1. update parser logic in `parseSql.ts`
2. preserve backward compatibility with existing patterns
3. emit warnings instead of hard crashes
4. validate behavior with real SQL snippets and edge cases

## Case E - Add a new project template

Steps:

1. update `src/lib/templates/databaseTemplates.ts`
2. verify visibility in command palette and canvas quick actions
3. verify template import -> UI state -> generated SQL flow

## General implementation order

When multiple layers are touched, follow this order:

1. domain
2. store
3. pure library logic (`lib`)
4. UI
5. docs
