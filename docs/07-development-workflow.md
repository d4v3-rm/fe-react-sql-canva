# 07 - Development Workflow

## Setup locale

```bash
npm install
npm run dev
```

## Branching consigliato

Formato suggerito:

- `feat/<scope>-<short-description>`
- `fix/<scope>-<short-description>`
- `refactor/<scope>-<short-description>`
- `docs/<scope>-<short-description>`

Esempi:

- `feat/sql-add-partial-index-support`
- `fix/explorer-schema-drop-highlight`

## Stile commit

Usare prefissi chiari:

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `chore:`

Esempio:

```text
feat(sql): support composite unique constraints in parser
```

## Ciclo operativo consigliato

1. analisi impatto su dominio/store/UI
2. implementazione minima funzionante
3. rifinitura naming e splitting file
4. lint + build
5. smoke test manuale
6. commit atomico

## Definition of Done

Una task e completa solo se:

- comportamento richiesto presente
- nessuna regressione evidente nel flusso principale
- `npm run lint` e `npm run build` passano
- documentazione aggiornata se cambia una convenzione o un flusso

## Cosa evitare

- fix veloci che aggirano tipi/architettura
- codice duplicato in piu feature
- side effect in componenti presentazionali
- hardcode di costanti dominio direttamente in UI
