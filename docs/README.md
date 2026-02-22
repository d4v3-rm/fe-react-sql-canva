# Developer Docs

Questa cartella contiene la documentazione operativa per sviluppare sul progetto in modo coerente con architettura, convenzioni e standard di qualita.

## A chi serve

- nuovi sviluppatori che entrano nel progetto
- contributor che devono aggiungere feature senza regressioni
- reviewer che devono validare coerenza tecnica e UX

## Ordine consigliato di lettura

1. [01-project-map.md](./01-project-map.md)
2. [02-architecture-and-data-flow.md](./02-architecture-and-data-flow.md)
3. [03-coding-conventions.md](./03-coding-conventions.md)
4. [04-state-and-persistence.md](./04-state-and-persistence.md)
5. [05-sql-sync-engine.md](./05-sql-sync-engine.md)
6. [06-ui-ux-and-sass-guidelines.md](./06-ui-ux-and-sass-guidelines.md)
7. [07-development-workflow.md](./07-development-workflow.md)
8. [08-feature-playbook.md](./08-feature-playbook.md)
9. [09-quality-checklist.md](./09-quality-checklist.md)

## Regole non negoziabili

- TypeScript strict sempre rispettato.
- Nessuna logica business nei componenti UI riusabili.
- Nessun colore hardcoded nei moduli feature: usare token Sass.
- Ogni nuova feature deve passare `npm run lint` e `npm run build`.
- Ogni modifica UI deve evitare overflow orizzontale.

## Comandi base

```bash
npm install
npm run dev
npm run lint
npm run build
```
