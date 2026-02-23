# 06 - UI/UX and Sass Guidelines

## UX objective

- dense but readable interface
- frequent actions reachable quickly
- no horizontal overflow in primary panels

## UI rules

- prefer reusable primitives from `components/ui`
- keep behavior consistent across modules:
  - button variants
  - card semantics
  - empty states
- command palette is the global action entrypoint

## Panel layout behavior

`App.tsx` supports:

- manual resize (left/right panels)
- collapse and expand per panel
- maximize single panel
- layout presets

New UI sections must remain usable in every layout mode above.

## Sass rules

Standard imports in feature modules:

```scss
@use '../../styles/mixins' as m;
@use '../../styles/tokens' as t;
```

Rules:

- no hardcoded colors in feature styles
- use semantic tokens (`t.$color-*`)
- use shared mixins where applicable

## Theme system

- CSS variables defined in `_base.scss`
- runtime theme selector uses `data-theme` on root element
- avoid bypassing semantic theme variables

## Responsive checklist

- set `min-width: 0` in critical flex/grid containers
- prevent horizontal overflow in scroll areas
- use safe text wrapping for long dynamic labels
- add media queries when readability degrades

## Minimum accessibility baseline

- explicit `type="button"` where required
- proper label/input association
- `aria-label` for non-text controls
- maintain sufficient color contrast in both themes
