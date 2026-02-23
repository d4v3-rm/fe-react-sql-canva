# Developer Docs

This folder contains the operational documentation needed to work in this repository with consistent architecture, conventions, and quality standards.

## Who should read this

- new developers onboarding the project
- contributors adding or refactoring features
- reviewers validating technical consistency and regressions

## Recommended reading order

1. [01-project-map.md](./01-project-map.md)
2. [02-architecture-and-data-flow.md](./02-architecture-and-data-flow.md)
3. [03-coding-conventions.md](./03-coding-conventions.md)
4. [04-state-and-persistence.md](./04-state-and-persistence.md)
5. [05-sql-sync-engine.md](./05-sql-sync-engine.md)
6. [06-ui-ux-and-sass-guidelines.md](./06-ui-ux-and-sass-guidelines.md)
7. [07-development-workflow.md](./07-development-workflow.md)
8. [08-feature-playbook.md](./08-feature-playbook.md)
9. [09-quality-checklist.md](./09-quality-checklist.md)

## Non-negotiable rules

- Keep TypeScript strict compliance.
- Keep business logic out of reusable UI primitives.
- Do not hardcode colors inside feature modules: use Sass tokens.
- Every feature must pass `npm run lint` and `npm run build`.
- Avoid horizontal overflow in all primary panels.

## Basic commands

```bash
npm install
npm run dev
npm run lint
npm run build
```
