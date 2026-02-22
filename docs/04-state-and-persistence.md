# 04 - State and Persistence

## Store principali

### `schemaStore`

Responsabile di:

- metadati database
- tabelle e colonne
- relazioni
- import SQL / apply template
- selezione tabella

Persistenza:

- chiave: `sql-canvas-project-v1`
- `partialize`: salva solo stato necessario
- `merge`: riallinea schema persistito con fallback correnti

### `layoutStore`

Responsabile di:

- larghezze pannelli
- collapse/maximize
- preset layout

Persistenza:

- chiave: `sql-canvas-layout-v1`

### `themeStore`

Responsabile di:

- tema `light` / `dark`

Persistenza:

- chiave: `sql-canvas-theme-v1`

### `inspectorStore`

Responsabile di:

- tab attivo inspector (`structure`, `relations`, `sql`)

Persistenza:

- chiave: `sql-canvas-inspector-v1`
- include sanitizzazione valori legacy

### `canvasViewStore`

Responsabile di:

- trigger imperativi per `fit view` e `center selected`

## Regole per aggiungere nuovo stato

1. Valutare se e realmente globale.
2. Se e persistente, aggiungere `partialize`.
3. Aggiungere `merge` se esistono rischi di dati legacy.
4. Evitare side-effect dentro setter store (tenere setter prevedibili).

## Pattern aggiornamento immutabile

Esempio da seguire:

```ts
set((state) => ({
  tables: state.tables.map((table) =>
    table.id === tableId ? { ...table, name: nextName } : table,
  ),
}))
```

## Invarianti importanti

- almeno uno schema valido (`public` fallback)
- id stabili su merge import SQL quando possibile
- relazioni eliminate se colonna sorgente/target viene rimossa
- `lastSavedAt` aggiornato per ogni mutazione semantica
