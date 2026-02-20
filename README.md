# SQL Canvas Modeler

Applicazione web React + TypeScript + Vite per progettare database PostgreSQL in modo visuale, generare SQL, importare/esportare `.sql` e salvare tutto in locale.

## Stack

- React 19 + TypeScript strict
- Vite 7
- Zustand (`persist` su `localStorage`)
- Sass modulare (tokens + mixin)
- React Flow (`@xyflow/react`) per la visualizzazione relazionale
- Lucide React per iconografia UI

## Funzionalita principali

- Modellazione database/tabelle PostgreSQL (schema, nome, colonne, tipi, vincoli)
- Gestione relazioni Foreign Key con `ON UPDATE` / `ON DELETE`
- Canvas grafico trascinabile per mappa schema
- Generazione SQL live (DDL)
- Editor SQL bidirezionale con sync automatico
- Persistenza locale automatica (riapertura progetto dall'ultimo stato)

## Struttura progetto

- `src/app`: layout e composizione pagine
- `src/domain`: tipi e factory di dominio
- `src/store`: stato globale con Zustand
- `src/lib/sql`: parser e generatore SQL
- `src/features`: moduli UI explorer/editor/canvas/inspector
- `src/components/ui`: componenti UI riusabili
- `src/styles`: tokens, mixins e base styles Sass

## Avvio sviluppo web

```bash
npm install
npm run dev
```

## Build produzione web

```bash
npm run build
```

Output in `dist/`.

## Verifica qualita

```bash
npm run lint
npm run build
```

## Note import SQL

L'import supporta in modo affidabile SQL generato dall'app e script PostgreSQL con pattern comuni:

- `CREATE TABLE ... (...)`
- vincoli `PRIMARY KEY`, `UNIQUE`, `NOT NULL`, `DEFAULT`
- `FOREIGN KEY` inline e `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...`

Se alcune istruzioni non sono mappabili al modello UI, vengono mostrate come warning non bloccanti.
