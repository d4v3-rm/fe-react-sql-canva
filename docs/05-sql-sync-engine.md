# 05 - SQL Sync Engine

## Modules involved

- SQL generation: `src/lib/sql/generateSql.ts`
- SQL parsing: `src/lib/sql/parseSql.ts`
- SQL type mapping: `src/lib/sql/types.ts`
- SQL identifiers helpers: `src/lib/sql/identifiers.ts`

## SQL generation (model -> script)

Input:

- `database`
- `tables`
- `relations`

Output:

- PostgreSQL script with:
  - `CREATE DATABASE`
  - `CREATE SCHEMA IF NOT EXISTS`
  - `CREATE EXTENSION IF NOT EXISTS`
  - `BEGIN/COMMIT`
  - `CREATE TABLE`
  - `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`

## SQL parsing (script -> model)

`parseSqlSchema` pipeline:

1. strip comments
2. parse database metadata
3. parse schemas and extensions
4. parse `CREATE TABLE` blocks
5. parse relation definitions:
   - inline `REFERENCES`
   - `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
6. materialize validated relations
7. collect non-blocking warnings

## Currently supported patterns

- `CREATE TABLE`
- inline or table-level `PRIMARY KEY`
- `UNIQUE`, `NOT NULL`, `DEFAULT`
- inline and alter-table foreign keys
- FK actions:
  - `NO ACTION`
  - `CASCADE`
  - `SET NULL`
  - `RESTRICT`
  - `SET DEFAULT`

## Safety contract

- if `parsedEntities === 0`, import returns failure gracefully
- warnings should never crash rendering
- parser errors should stay controlled inside import flow

## Adding a new SQL type

1. update `src/domain/schema.ts` (`DATA_TYPES`)
2. update mapping in `src/lib/sql/types.ts`
3. update UI inputs in `TableEditor` if needed
4. validate round-trip:
   - GUI -> SQL
   - SQL -> GUI
   - GUI -> SQL again

## Minimum manual sync test

1. create table via GUI
2. verify generated SQL
3. edit SQL (new column/relation)
4. verify GUI updates automatically
5. export SQL and confirm semantic consistency
