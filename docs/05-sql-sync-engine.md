# 05 - SQL Sync Engine

## Moduli coinvolti

- generazione SQL: `src/lib/sql/generateSql.ts`
- parsing SQL: `src/lib/sql/parseSql.ts`
- tipi SQL: `src/lib/sql/types.ts`
- identificatori SQL: `src/lib/sql/identifiers.ts`

## Generazione SQL (model -> script)

Input:

- `database`
- `tables`
- `relations`

Output:

- script SQL PostgreSQL con:
  - `CREATE DATABASE`
  - `CREATE SCHEMA IF NOT EXISTS`
  - `CREATE EXTENSION IF NOT EXISTS`
  - `BEGIN/COMMIT`
  - `CREATE TABLE`
  - `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`

## Parsing SQL (script -> model)

`parseSqlSchema` esegue:

1. pulizia commenti
2. estrazione metadati database
3. estrazione schemi ed estensioni
4. parsing `CREATE TABLE`
5. parsing relazioni:
   - inline `REFERENCES`
   - `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
6. materializzazione relazioni con validazione riferimenti
7. raccolta warnings non bloccanti

## Supporto attuale

- `CREATE TABLE`
- `PRIMARY KEY` inline o table-level
- `UNIQUE`, `NOT NULL`, `DEFAULT`
- `FOREIGN KEY` inline e alter table
- azioni FK: `NO ACTION`, `CASCADE`, `SET NULL`, `RESTRICT`, `SET DEFAULT`

## Contratto di sicurezza

- se `parsedEntities === 0`, l'import fallisce in modo controllato
- warnings non devono rompere UI
- nessun throw non gestito verso il layer React

## Come aggiungere un nuovo tipo SQL

1. aggiornare `src/domain/schema.ts` (`DATA_TYPES`)
2. aggiornare mapping in `src/lib/sql/types.ts`
3. aggiornare UI `TableEditor` per eventuali campi extra (es. precision/scale)
4. validare round-trip:
   - GUI -> SQL
   - SQL -> GUI
   - GUI -> SQL (secondo passaggio)

## Test manuale minimo SQL sync

1. creare tabella da GUI
2. verificare SQL generato
3. modificare SQL (nuova colonna o relazione)
4. verificare update automatico GUI
5. riesportare SQL e confrontare coerenza semantica
