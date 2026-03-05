# 09 - Quality Checklist

Use this checklist before closing any feature.

## Build and lint

- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## Functional smoke tests

- [ ] create table from Explorer
- [ ] edit columns from Inspector
- [ ] create/edit relation
- [ ] drag table on Canvas and verify position persistence
- [ ] edit SQL and verify reverse sync to UI
- [ ] export SQL works

## Persistence checks

- [ ] browser refresh keeps project state
- [ ] refresh keeps panel layout
- [ ] refresh keeps selected theme
- [ ] refresh keeps valid inspector tab

## UI/UX checks

- [ ] no horizontal overflow in core panels
- [ ] collapse/maximize state is coherent
- [ ] layout remains readable on narrow viewport
- [ ] light/dark themes remain visually consistent

## Regressions to avoid

- relation loss during table rename/move
- unstable ID remapping during SQL import
- parser breakage on previously supported SQL
- unnecessary rerender loops caused by side effects

## When to update docs

Update relevant docs when you change:

- architecture flow
- coding conventions
- store/persistence model
- SQL parser/generator capabilities
