# 01 - Project Map

## Obiettivo

Capire subito dove mettere codice nuovo e dove non metterlo.

## Struttura principale

```text
src/
  app/                  # composizione layout principale
  components/ui/        # componenti UI riusabili e generici
  domain/               # tipi e factory dominio
  features/             # moduli funzionali verticali
  lib/                  # logica pura, parser/generator, helper
  store/                # stato globale Zustand
  styles/               # token, mixin, base style
```

## Dove mettere cosa

### `src/app`

- tiene insieme i pannelli principali
- gestisce layout globale e orchestrazione feature
- non deve contenere parser SQL o logica dominio profonda

### `src/components/ui`

- componenti base (`Button`, `Card`, `Field`, `Badge`, `Dialog`)
- niente dipendenze dal dominio database
- riusabili in qualsiasi feature

### `src/domain`

- definisce il linguaggio del progetto:
  - `DatabaseModel`
  - `TableModel`
  - `ColumnModel`
  - `RelationModel`
- aggiungere qui prima i nuovi campi dominio

### `src/features`

- ogni cartella rappresenta un modulo UI verticale:
  - `explorer`
  - `canvas`
  - `inspector`
  - `sql-preview`
  - `table-editor`
  - `command-palette`
- ogni feature ha `*.tsx` + `*.module.scss`

### `src/lib`

- logica pura, testabile e senza dipendenze React
- aree attuali:
  - `sql/` parser e generator SQL
  - `templates/` template SQL pronti
  - `file/` import/export file
  - `schemaHelpers.ts` utility dominio
  - `id.ts` id generation
- nota: `lib/codegen/generateSequelizeScaffold.ts` e presente ma non wired nella UI corrente

### `src/store`

- stato globale e persistenza localStorage
- store separati per responsabilita:
  - `schemaStore`
  - `layoutStore`
  - `themeStore`
  - `inspectorStore`
  - `canvasViewStore`

### `src/styles`

- `_tokens.scss`: variabili semantiche
- `_mixins.scss`: mixin condivisi
- `_base.scss`: css variables tema light/dark + reset base

## Entry point runtime

- `src/main.tsx`: monta `App` e `DialogProvider`
- `src/app/App.tsx`: layout 3 pannelli + command palette + resize/collapse/maximize
