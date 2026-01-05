# SQL Canvas Modeler

Applicazione client React + TypeScript + Vite per progettare schema PostgreSQL in modo visuale, generare script SQL, importare/esportare `.sql` e salvare tutto in locale.

## Stack

- React 19 + TypeScript strict
- Vite 7
- Zustand (`persist` su `localStorage`)
- Sass modulare (tokens + mixin)
- React Flow (`@xyflow/react`) per la visualizzazione relazionale
- Lucide React per iconografia UI

## Funzionalità principali

- Modellazione tabelle PostgreSQL (schema, nome, colonne, tipi, vincoli)
- Gestione relazioni Foreign Key con `ON UPDATE` / `ON DELETE`
- Canvas grafico trascinabile per mappa schema
- Generazione SQL live (DDL)
- Import SQL da file (`CREATE TABLE` + FK da `ALTER TABLE`/inline)
- Export SQL in file
- Copia SQL negli appunti
- Persistenza locale automatica (riapertura progetto dall'ultimo stato)

## Struttura progetto

- `src/app`: layout e composizione pagine
- `src/domain`: tipi e factory di dominio
- `src/store`: stato globale con Zustand
- `src/lib/sql`: parser e generatore SQL
- `src/features`: moduli UI per toolbar/editor/canvas/preview
- `src/components/ui`: componenti UI riusabili
- `src/styles`: tokens, mixins e base styles Sass

## Avvio

```bash
npm install
npm run dev
```

## Verifica qualità

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
