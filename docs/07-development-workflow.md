# 07 - Development Workflow

## Local setup

```bash
npm install
npm run dev
```

## Branch naming

Suggested format:

- `feat/<scope>-<short-description>`
- `fix/<scope>-<short-description>`
- `refactor/<scope>-<short-description>`
- `docs/<scope>-<short-description>`

Examples:

- `feat/sql-composite-unique-support`
- `fix/explorer-schema-drop-highlight`

## Commit style

Use clear prefixes:

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `chore:`

Example:

```text
feat(sql): support composite unique constraints in parser
```

## Recommended implementation cycle

1. analyze impact on domain/store/UI
2. implement minimum working change
3. refactor naming/splitting
4. run lint + build
5. run manual smoke checks
6. commit in small logical steps

## Definition of done

A task is complete only when:

- requested behavior is implemented
- no visible regression on main flows
- `npm run lint` and `npm run build` pass
- docs are updated when conventions or flows change

## What to avoid

- bypass fixes that weaken type safety
- duplicated logic across features
- business side effects inside presentational components
- hardcoded domain constants inside UI layers
