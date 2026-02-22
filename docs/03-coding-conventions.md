# 03 - Coding Conventions

## TypeScript

- `strict: true` sempre rispettato.
- evitare `any`; preferire type espliciti.
- nessun cast inutile per "forzare" compilazione.
- funzioni pure in `lib` con input/output tipizzati.

## Naming

- componenti React: `PascalCase` (`TableEditor.tsx`)
- hook/store: `camelCase` (`useSchemaStore`)
- cartelle feature: `kebab-case` (`table-editor`)
- file style: stesso nome componente + `.module.scss`

## Import e alias

- usare alias `@/` per codice in `src`.
- esempio:

```ts
import { useSchemaStore } from '@/store/schemaStore'
import { generateProjectSql } from '@/lib/sql/generateSql'
```

## Responsabilita del file

- un file deve avere responsabilita chiara.
- evitare file monolitici con logica non correlata.
- se una funzione cresce troppo, estrarla in `lib` o helper locale.

## Pattern componenti

Struttura raccomandata:

1. import
2. type/interface locali
3. helper puri locali
4. componente
5. return JSX

Esempio minimo:

```tsx
interface ExampleProps {
  label: string
}

function normalize(raw: string): string {
  return raw.trim().toLowerCase()
}

export function Example({ label }: ExampleProps) {
  const value = normalize(label)
  return <span>{value}</span>
}
```

## Stato e side effect

- usare `useMemo` per derivazioni costose.
- usare `useEffect` solo per side effect reali.
- non derivare stato locale duplicando stato store se non serve.

## Gestione errori UI

- usare `DialogProvider` (`confirm`, `prompt`, `alert`) per conferme critiche.
- fallback UI espliciti (`EmptyState`) quando manca contesto (es. nessuna tabella selezionata).

## Regole lint da rispettare

- `npm run lint` deve essere pulito.
- no warning ignorati in modo sistematico.
- no codice morto introdotto da nuove feature.
