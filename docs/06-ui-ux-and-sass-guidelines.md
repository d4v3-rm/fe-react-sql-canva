# 06 - UI/UX and Sass Guidelines

## Obiettivo UX

- interfaccia densa ma leggibile
- azioni frequenti raggiungibili in pochi click
- zero overflow orizzontale nei pannelli principali

## Regole UI

- usare componenti base da `components/ui` quando possibile
- mantenere comportamento coerente:
  - button variant (`primary`, `secondary`, `ghost`, `danger`)
  - `Card` per sezioni semantiche
  - `EmptyState` per mancanza dati
- command palette come entry-point per azioni globali

## Layout pannelli

`App.tsx` supporta:

- resize manuale pannelli sinistro/destro
- collapse/expand per ogni pannello
- maximize per singolo pannello
- preset layout

Qualsiasi nuova sezione deve funzionare in tutti gli stati sopra.

## Regole Sass

- import standard in ogni modulo:

```scss
@use '../../styles/mixins' as m;
@use '../../styles/tokens' as t;
```

- niente colori hardcoded nei moduli feature
- usare token (`t.$color-*`)
- usare mixin condivisi (`m.panel`, `m.input-base`, `m.slim-scrollbar`, `m.text-ellipsis`)

## Theming

- variabili CSS in `_base.scss`
- tema controllato da `data-theme` su `document.documentElement`
- non bypassare variabili tema con colori assoluti

## Responsive

Linee guida pratiche:

- impostare `min-width: 0` su container flex/grid critici
- usare `overflow-x: hidden` o `clip` sulle sezioni scrollabili
- preferire `overflow-wrap: anywhere` su testi dinamici lunghi
- introdurre media query quando il layout perde leggibilita

## Accessibilita minima

- bottoni con `type="button"` dove necessario
- label/input associati
- uso di `aria-label` su splitter/controlli non testuali
- contrasto sufficiente tra foreground/background
