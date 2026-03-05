# 03 - Coding Conventions

## TypeScript

- Keep `strict` compliance.
- Avoid `any`; use explicit types/interfaces.
- Avoid unsafe casts used only to silence errors.
- Keep pure functions in `lib` with typed input/output.

## Naming

- React components: `PascalCase` (`TableEditor.tsx`)
- hooks/stores/functions: `camelCase` (`useSchemaStore`)
- feature folders: `kebab-case` (`table-editor`)
- styles: same component name + `.module.scss`

## Imports and aliases

- Prefer `@/` alias for source imports.

```ts
import { useSchemaStore } from '@/store/schemaStore'
import { generateProjectSql } from '@/lib/sql/generateSql'
```

## Single responsibility

- each file should have one clear responsibility
- split large logic into helpers (`lib` or local pure helpers)
- avoid monolithic components

## Component file layout

Recommended order:

1. imports
2. local types/interfaces
3. pure local helpers
4. component implementation
5. JSX return

## State and effects

- use `useMemo` for expensive derived data
- use `useEffect` only for real side effects
- avoid duplicating store state in local state unless required

## Error handling in UI

- use dialog API (`confirm`, `prompt`, `alert`) for critical actions
- provide explicit fallback UI (`EmptyState`) when context is missing

## Lint compliance

- `npm run lint` must be clean
- do not leave dead code after refactor
- do not suppress lint errors without clear justification
