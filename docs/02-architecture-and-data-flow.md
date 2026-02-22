# 02 - Architecture and Data Flow

## Architettura ad alto livello

Il progetto segue una separazione netta:

- UI in React (feature + componenti base)
- stato globale in Zustand
- logica SQL in moduli puri (`lib/sql`)

## Flusso principale GUI -> SQL

1. L'utente modifica database/tabelle/colonne/relazioni via UI.
2. Le azioni aggiornano `schemaStore`.
3. `App.tsx` calcola `sqlScript` con `generateProjectSql`.
4. `SqlPreview` visualizza SQL aggiornato.

## Flusso inverso SQL -> GUI

1. L'utente modifica SQL nel tab SQL.
2. `SqlPreview` avvia debounce.
3. `schemaStore.importSql` usa `parseSqlSchema`.
4. Se parsing valido:
   - database/tabelle/relazioni vengono aggiornati
   - canvas/explorer/inspector si riallineano.
5. Se parsing non valido:
   - warning non bloccanti
   - lo stato modello non viene corrotto.

## Flusso layout/UX

- `layoutStore` controlla:
  - larghezze pannelli
  - collapse/maximize
  - preset layout
- `inspectorStore` controlla tab attivo (`structure`, `relations`, `sql`)
- `themeStore` controlla tema (`light`, `dark`)

## Diagramma logico semplificato

```text
UI Events
  -> Zustand Stores (schema/layout/theme/inspector)
    -> Derived View State
      -> Render Features (Explorer, Canvas, Inspector)
        -> SQL Generator / SQL Parser
          -> Store Update
```

## Principio guida

Le feature non parlano tra loro direttamente.

- comunicano solo tramite store o funzioni pure in `lib`.
- questo riduce coupling e facilita refactor.
