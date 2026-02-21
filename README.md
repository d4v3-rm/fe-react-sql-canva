<h1 align="center">🧩 SQL Canvas Modeler</h1>

<p align="center">
  <strong>Progettazione visuale PostgreSQL + editor SQL bidirezionale, totalmente web.</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="Zustand" src="https://img.shields.io/badge/Zustand-Persist-black">
  <img alt="Sass" src="https://img.shields.io/badge/Sass-Modules-CC6699?logo=sass&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Modeler-336791?logo=postgresql&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-22c55e">
</p>

---

## ✨ Cos'è

`SQL Canvas Modeler` è un applicativo frontend (SPA) per modellare un database PostgreSQL in modo visuale e modificare SQL in tempo reale, con sincronizzazione automatica tra:

- 🧠 modello grafico (canvas + inspector)
- 📜 script SQL (editor live)

Obiettivo: ridurre il tempo tra idea e schema SQL consistente, mantenendo UX semplice e rapida.

---

## 🧭 Indice

- [🎯 Feature principali](#-feature-principali)
- [🖥️ Esperienza utente](#️-esperienza-utente)
- [🏗️ Architettura tecnica](#️-architettura-tecnica)
- [📦 Struttura progetto](#-struttura-progetto)
- [🚀 Avvio rapido](#-avvio-rapido)
- [🛠️ Script disponibili](#️-script-disponibili)
- [🧪 Qualità codice](#-qualità-codice)
- [📚 Supporto SQL](#-supporto-sql)
- [💾 Persistenza locale](#-persistenza-locale)
- [❓FAQ](#-faq)
- [🛣️ Roadmap suggerita](#️-roadmap-suggerita)
- [📄 Licenza](#-licenza)

---

## 🎯 Feature principali

### 📐 Modellazione database completa

- gestione metadati database (`name`, `owner`, `encoding`, `lc_collate`, `lc_ctype`, `template`)
- gestione schemi multipli
- gestione estensioni database
- creazione/duplicazione/rinomina/spostamento tabelle tra schemi
- gestione colonne con tipizzazione PostgreSQL, default e vincoli

### 🔗 Relazioni e vincoli

- creazione Foreign Key tra tabelle
- configurazione `ON UPDATE` / `ON DELETE`
- vincoli e naming dei constraint
- visualizzazione relazioni direttamente nel canvas

### 🗺️ Canvas relazionale

- drag & drop tabelle
- aggiornamento posizioni persistito localmente
- auto-fit e center tabella selezionata
- preset layout (balanced, focus canvas, focus inspector, focus SQL)

### 📜 SQL editor bidirezionale (core)

- generazione SQL live dal modello
- modifica SQL con re-import automatico nel modello
- validazione e warning non bloccanti
- export SQL e copia rapida in clipboard

### 🧰 Workspace operativo

- import SQL da file `.sql` o `.txt`
- template predefiniti per bootstrap rapido
- command palette (`Ctrl+K`) con azioni contestuali
- tema light/dark
- pannelli ridimensionabili, collassabili e massimizzabili

---

## 🖥️ Esperienza utente

Interfaccia a 3 pannelli:

1. `Explorer`:
creazione progetto, schemi, tabelle, import SQL, azioni rapide su tabella.

2. `Canvas`:
mappa visuale delle tabelle e relazioni con interazioni drag & drop.

3. `Inspector`:
editor struttura tabella, gestione relazioni e SQL editor.

### ⌨️ Shortcut

- `Ctrl+K`: apre command palette

---

## 🏗️ Architettura tecnica

### Stack

- ⚛️ React 19
- 🔷 TypeScript strict
- ⚡ Vite 7
- 🐻 Zustand con `persist` su `localStorage`
- 🎨 Sass modulare (`tokens`, `mixins`, moduli per feature)
- 🔄 `@xyflow/react` per canvas relazionale
- 🖼️ `lucide-react` per iconografia

### Flusso dati (alto livello)

1. Stato dominio in `schemaStore` (database, tabelle, relazioni).
2. Generazione SQL con `generateProjectSql`.
3. Modifiche SQL re-importate via `parseSqlSchema`.
4. UI aggiornata in tempo reale su explorer/canvas/inspector.

---

## 📦 Struttura progetto

```text
src/
  app/                 # composizione layout principale
  components/ui/       # componenti UI riusabili
  domain/              # modelli e tipi dominio
  features/            # moduli funzionali (explorer, canvas, inspector, sql)
  lib/
    sql/               # parser SQL + generatore SQL
    file/              # utility import/export file
    templates/         # template database iniziali
  store/               # zustand stores (schema, layout, tema, inspector)
  styles/              # base, tokens, mixins
```

---

## 🚀 Avvio rapido

### Prerequisiti

- Node.js 20+ consigliato
- npm 10+ consigliato

### Installazione

```bash
npm install
```

### Sviluppo locale

```bash
npm run dev
```

Apri il browser su `http://localhost:5173`.

---

## 🛠️ Script disponibili

| Script | Descrizione |
|---|---|
| `npm run dev` | avvia Vite in sviluppo |
| `npm run build` | build produzione in `dist/` |
| `npm run preview` | preview locale della build |
| `npm run lint` | lint codebase con ESLint |

---

## 🧪 Qualità codice

```bash
npm run lint
npm run build
```

Entrambi i comandi devono passare prima del rilascio.

---

## 📚 Supporto SQL

L'import SQL copre i pattern PostgreSQL più comuni:

- `CREATE TABLE ... (...)`
- vincoli `PRIMARY KEY`, `UNIQUE`, `NOT NULL`, `DEFAULT`
- `FOREIGN KEY` inline
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...`

Se alcune istruzioni non sono mappabili al modello UI:

- vengono segnalate come warning
- il flusso non si interrompe

---

## 💾 Persistenza locale

Lo stato è persistito via `localStorage`:

- progetto schema (database/tabelle/relazioni)
- layout pannelli e preset
- tab inspector attiva
- tema UI

Chiavi principali:

- `sql-canvas-project-v1`
- `sql-canvas-layout-v1`
- `sql-canvas-inspector-v1`
- `sql-canvas-theme-v1`

---

## ❓FAQ

### Posso usare solo SQL senza toccare il canvas?

Sì. L'editor SQL è sincronizzato con il modello e aggiorna la UI quando il parsing è valido.

### Posso importare uno script SQL esistente?

Sì, da Explorer con import file `.sql`/`.txt`.

### Dove trovo i comandi rapidi dell'app?

Apri la command palette con `Ctrl+K`.

### L'app salva automaticamente?

Sì, lo stato viene salvato automaticamente in locale.

---

## 🛣️ Roadmap suggerita

- esportazione progetto JSON completa
- undo/redo globale
- validazioni SQL più estese su edge-case PostgreSQL
- test E2E su workflow import/edit/export
- sistema plugin template avanzato

---

## 📄 Licenza

Distribuito sotto licenza MIT.

Vedi [LICENSE](./LICENSE) per i dettagli.
