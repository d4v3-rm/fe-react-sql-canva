# SQL Canvas Modeler

Applicazione client React + TypeScript + Vite per progettare schema PostgreSQL in modo visuale, generare script SQL, importare/esportare `.sql` e salvare tutto in locale.

## Stack

- React 19 + TypeScript strict
- Vite 7
- Zustand (`persist` su `localStorage`)
- Sass modulare (tokens + mixin)
- React Flow (`@xyflow/react`) per la visualizzazione relazionale
- Lucide React per iconografia UI
- Electron per runtime desktop

## Funzionalita principali

- Modellazione tabelle PostgreSQL (schema, nome, colonne, tipi, vincoli)
- Gestione relazioni Foreign Key con `ON UPDATE` / `ON DELETE`
- Canvas grafico trascinabile per mappa schema
- Generazione SQL live (DDL)
- Editor SQL bidirezionale con sync automatico
- Code Studio ORM (class-validator + sequelize + sequelize-typescript)
- Export archivio scaffolding ORM
- Persistenza locale automatica (riapertura progetto dall'ultimo stato)

## Struttura progetto

- `src/app`: layout e composizione pagine
- `src/domain`: tipi e factory di dominio
- `src/store`: stato globale con Zustand
- `src/lib/sql`: parser e generatore SQL
- `src/lib/codegen`: generazione scaffolding ORM
- `src/features`: moduli UI explorer/editor/canvas/inspector
- `src/components/ui`: componenti UI riusabili
- `src/styles`: tokens, mixins e base styles Sass
- `electron`: bootstrap desktop (main + preload)

## Avvio sviluppo desktop

```bash
npm install
npm run dev
```

`npm run dev` avvia insieme:

- frontend Vite
- shell Electron collegata al dev server locale

## Build Windows portable (no installer)

```bash
npm run build:win:portable
```

Output:

- `release/SQL-Canvas-<version>-portable-x64.exe`

Il file e portable, senza installer.

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
