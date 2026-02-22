# 09 - Quality Checklist

Usare questa checklist prima di chiudere una feature.

## Build and lint

- [ ] `npm run lint` senza errori
- [ ] `npm run build` senza errori

## Smoke test funzionale

- [ ] creazione tabella da Explorer
- [ ] modifica colonne da Inspector
- [ ] creazione/modifica relazione
- [ ] drag tabella su Canvas e persistenza posizione
- [ ] modifica SQL e sync verso UI
- [ ] export SQL funzionante

## Persistenza

- [ ] refresh browser mantiene progetto
- [ ] refresh mantiene layout pannelli
- [ ] refresh mantiene tema
- [ ] refresh mantiene tab inspector valido

## UI/UX

- [ ] nessun overflow orizzontale nei pannelli principali
- [ ] stato collapsed/maximized coerente
- [ ] responsive leggibile su viewport stretta
- [ ] dark/light senza regressioni cromatiche evidenti

## Regressioni da evitare

- perdere relazioni durante rename/move tabelle
- invalidare id esistenti senza motivo
- rompere parser su SQL precedentemente supportato
- introdurre side effect che causano rerender inutili

## Quando aggiornare la documentazione

Aggiorna almeno i file docs rilevanti quando cambi:

- flusso architetturale
- convenzioni coding
- struttura store
- supporto parser/generator SQL
