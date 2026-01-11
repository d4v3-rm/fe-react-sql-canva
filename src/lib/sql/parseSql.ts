import { createDefaultColumn, createDefaultDatabase } from '@/domain/defaults'
import type { ColumnModel, DatabaseModel, ForeignKeyAction, RelationModel, SqlImportResult, TableModel } from '@/domain/schema'
import { createId } from '@/lib/id'
import { normalizeIdentifier } from '@/lib/sql/identifiers'
import { normalizeDataType } from '@/lib/sql/types'

interface RawRelation {
  constraintName: string
  sourceTableKey: string
  sourceColumn: string
  targetTableKey: string
  targetColumn: string
  onDelete: ForeignKeyAction
  onUpdate: ForeignKeyAction
}

interface ParsedTableRef {
  schema: string
  name: string
  key: string
}

interface ParsedDatabaseMeta {
  databasePatch: Partial<DatabaseModel>
  parsedCount: number
}

const ACTIONS: ForeignKeyAction[] = ['NO ACTION', 'CASCADE', 'SET NULL', 'RESTRICT', 'SET DEFAULT']

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim()
}

function splitTopLevelByComma(text: string): string[] {
  const chunks: string[] = []
  let current = ''
  let depth = 0
  let inSingleQuote = false
  let inDoubleQuote = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote && next === "'") {
        current += "''"
        index += 1
        continue
      }

      inSingleQuote = !inSingleQuote
      current += char
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      current += char
      continue
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '(') {
        depth += 1
      }

      if (char === ')') {
        depth = Math.max(0, depth - 1)
      }

      if (char === ',' && depth === 0) {
        chunks.push(current.trim())
        current = ''
        continue
      }
    }

    current += char
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}

function dedupeInsensitive(values: string[]): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []

  values.forEach((value) => {
    const normalized = value.trim()
    if (!normalized) {
      return
    }

    const lower = normalized.toLowerCase()
    if (seen.has(lower)) {
      return
    }

    seen.add(lower)
    deduped.push(normalized)
  })

  return deduped
}

function normalizeName(raw: string): string {
  const normalized = raw
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

  return normalized
}

function normalizeSchemaName(raw: string): string {
  return normalizeName(raw) || 'public'
}

function parseTableRef(rawIdentifier: string): ParsedTableRef {
  const tokens = rawIdentifier
    .split('.')
    .map((token) => normalizeIdentifier(token.trim()))
    .filter(Boolean)

  if (tokens.length === 1) {
    const schema = 'public'
    const name = tokens[0]
    return {
      schema,
      name,
      key: `${schema}.${name}`.toLowerCase(),
    }
  }

  const [schema, name] = tokens
  return {
    schema,
    name,
    key: `${schema}.${name}`.toLowerCase(),
  }
}

function extractAction(text: string, actionName: 'DELETE' | 'UPDATE'): ForeignKeyAction {
  const match = text.match(new RegExp(`ON\\s+${actionName}\\s+(CASCADE|RESTRICT|SET\\s+NULL|SET\\s+DEFAULT|NO\\s+ACTION)`, 'i'))
  if (!match) {
    return 'NO ACTION'
  }

  const normalized = match[1].toUpperCase().replace(/\s+/g, ' ') as ForeignKeyAction
  return ACTIONS.includes(normalized) ? normalized : 'NO ACTION'
}

function splitTypeAndConstraints(raw: string): { typeSql: string; constraintsSql: string } {
  const match = raw.match(/\s+(NOT\s+NULL|NULL|DEFAULT|PRIMARY\s+KEY|UNIQUE|REFERENCES|CHECK|CONSTRAINT)\b/i)
  if (!match || match.index === undefined) {
    return {
      typeSql: raw.trim(),
      constraintsSql: '',
    }
  }

  return {
    typeSql: raw.slice(0, match.index).trim(),
    constraintsSql: raw.slice(match.index).trim(),
  }
}

function parseDatabaseMeta(cleanedSql: string): ParsedDatabaseMeta {
  const databasePattern = /CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)([\s\S]*?);/i
  const match = cleanedSql.match(databasePattern)

  if (!match) {
    return {
      databasePatch: {},
      parsedCount: 0,
    }
  }

  const options = match[2] ?? ''
  const ownerMatch = options.match(/OWNER\s*=\s*("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)/i)
  const encodingMatch =
    options.match(/ENCODING\s*=\s*'([^']+)'/i) ?? options.match(/ENCODING\s*=\s*("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)/i)
  const collateMatch =
    options.match(/LC_COLLATE\s*=\s*'([^']+)'/i) ?? options.match(/LC_COLLATE\s*=\s*("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$.-]*)/i)
  const cTypeMatch =
    options.match(/LC_CTYPE\s*=\s*'([^']+)'/i) ?? options.match(/LC_CTYPE\s*=\s*("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$.-]*)/i)
  const templateMatch = options.match(/TEMPLATE\s*=\s*("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)/i)

  return {
    databasePatch: {
      name: normalizeName(normalizeIdentifier(match[1])) || createDefaultDatabase().name,
      owner: ownerMatch ? normalizeName(normalizeIdentifier(ownerMatch[1])) : undefined,
      encoding: encodingMatch ? normalizeIdentifier(encodingMatch[1]).replace(/^'|'$/g, '') : undefined,
      lcCollate: collateMatch ? normalizeIdentifier(collateMatch[1]).replace(/^'|'$/g, '') : undefined,
      lcCType: cTypeMatch ? normalizeIdentifier(cTypeMatch[1]).replace(/^'|'$/g, '') : undefined,
      template: templateMatch ? normalizeName(normalizeIdentifier(templateMatch[1])) : undefined,
    },
    parsedCount: 1,
  }
}

function parseSchemaDefinitions(cleanedSql: string): { schemas: string[]; parsedCount: number } {
  const schemas: string[] = []
  const schemaPattern =
    /CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)(?:\s+AUTHORIZATION\s+(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*))?\s*;/gi

  let match = schemaPattern.exec(cleanedSql)
  while (match) {
    schemas.push(normalizeSchemaName(normalizeIdentifier(match[1])))
    match = schemaPattern.exec(cleanedSql)
  }

  return {
    schemas: dedupeInsensitive(schemas),
    parsedCount: schemas.length,
  }
}

function parseExtensions(cleanedSql: string): { extensions: string[]; parsedCount: number } {
  const extensions: string[] = []
  const extensionPattern =
    /CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)(?:\s+WITH\s+SCHEMA\s+(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*))?\s*;/gi

  let match = extensionPattern.exec(cleanedSql)
  while (match) {
    const parsed = normalizeName(normalizeIdentifier(match[1]))
    if (parsed) {
      extensions.push(parsed)
    }

    match = extensionPattern.exec(cleanedSql)
  }

  return {
    extensions: dedupeInsensitive(extensions),
    parsedCount: extensions.length,
  }
}

function parseColumnDefinition(
  tableKey: string,
  line: string,
  rawRelations: RawRelation[],
  warnings: string[],
): ColumnModel | null {
  const match = line.match(/^("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)\s+(.+)$/)
  if (!match) {
    warnings.push(`Definizione colonna ignorata: ${line}`)
    return null
  }

  const columnName = normalizeIdentifier(match[1])
  const rest = match[2].trim()
  const { typeSql, constraintsSql } = splitTypeAndConstraints(rest)
  const normalizedType = normalizeDataType(typeSql)
  const nullable = !/NOT\s+NULL/i.test(constraintsSql)
  const isPrimary = /PRIMARY\s+KEY/i.test(constraintsSql)
  const isUnique = /\bUNIQUE\b/i.test(constraintsSql)
  const defaultMatch = constraintsSql.match(/\bDEFAULT\s+(.+?)(?=\s+(?:NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|REFERENCES|CHECK|CONSTRAINT)\b|$)/i)

  const referencesMatch = constraintsSql.match(
    /REFERENCES\s+((?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*))?)\s*\(("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)\)/i,
  )

  if (referencesMatch) {
    const targetTable = parseTableRef(referencesMatch[1])
    rawRelations.push({
      constraintName: `fk_${tableKey.replace('.', '_')}_${columnName}`.toLowerCase(),
      sourceTableKey: tableKey,
      sourceColumn: columnName,
      targetTableKey: targetTable.key,
      targetColumn: normalizeIdentifier(referencesMatch[2]),
      onDelete: extractAction(constraintsSql, 'DELETE'),
      onUpdate: extractAction(constraintsSql, 'UPDATE'),
    })
  }

  return {
    ...createDefaultColumn(columnName),
    name: columnName,
    type: normalizedType.type,
    length: normalizedType.length,
    scale: normalizedType.scale,
    nullable,
    defaultValue: defaultMatch ? defaultMatch[1].trim() : '',
    isPrimary,
    isUnique,
    autoIncrement: normalizedType.type === 'serial' || normalizedType.type === 'bigserial',
  }
}

function parseForeignConstraint(line: string, sourceTableKey: string): RawRelation | null {
  const pattern =
    /(?:CONSTRAINT\s+("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)\s+)?FOREIGN\s+KEY\s*\(("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)\)\s+REFERENCES\s+((?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*))?)\s*\(("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)\)([\s\S]*)/i
  const match = line.match(pattern)
  if (!match) {
    return null
  }

  const targetTable = parseTableRef(match[3])
  const constraint = normalizeIdentifier(match[1] ?? `fk_${sourceTableKey.replace('.', '_')}_${normalizeIdentifier(match[2])}`)

  return {
    constraintName: constraint,
    sourceTableKey,
    sourceColumn: normalizeIdentifier(match[2]),
    targetTableKey: targetTable.key,
    targetColumn: normalizeIdentifier(match[4]),
    onDelete: extractAction(match[5] ?? '', 'DELETE'),
    onUpdate: extractAction(match[5] ?? '', 'UPDATE'),
  }
}

function parseTableLevelPrimaryKey(line: string): string[] {
  const match = line.match(/^PRIMARY\s+KEY\s*\((.+)\)$/i)
  if (!match) {
    return []
  }

  return splitTopLevelByComma(match[1]).map((column) => normalizeIdentifier(column.trim()))
}

function parseCreateTableStatements(cleanedSql: string): {
  tables: TableModel[]
  rawRelations: RawRelation[]
  warnings: string[]
} {
  const createTablePattern =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*))?)\s*\(([\s\S]*?)\)\s*;/gi

  const tables: TableModel[] = []
  const rawRelations: RawRelation[] = []
  const warnings: string[] = []
  const tableKeys = new Set<string>()

  let match = createTablePattern.exec(cleanedSql)
  while (match) {
    const tableRef = parseTableRef(match[1])
    if (tableKeys.has(tableRef.key)) {
      warnings.push(`Tabella duplicata ignorata: ${tableRef.schema}.${tableRef.name}`)
      match = createTablePattern.exec(cleanedSql)
      continue
    }

    tableKeys.add(tableRef.key)
    const lines = splitTopLevelByComma(match[2])
    const columns: ColumnModel[] = []
    const primaryFromConstraints: string[] = []

    lines.forEach((line) => {
      if (!line) {
        return
      }

      const trimmed = line.trim()

      if (/^(CONSTRAINT\s+.+\s+)?FOREIGN\s+KEY/i.test(trimmed)) {
        const relation = parseForeignConstraint(trimmed, tableRef.key)
        if (relation) {
          rawRelations.push(relation)
        }

        return
      }

      if (/^PRIMARY\s+KEY/i.test(trimmed)) {
        primaryFromConstraints.push(...parseTableLevelPrimaryKey(trimmed))
        return
      }

      const parsedColumn = parseColumnDefinition(tableRef.key, trimmed, rawRelations, warnings)
      if (parsedColumn) {
        columns.push(parsedColumn)
      }
    })

    if (columns.length === 0) {
      columns.push(createDefaultColumn('id'))
      warnings.push(`Tabella ${tableRef.schema}.${tableRef.name} senza colonne valide. Creata colonna di fallback 'id'.`)
    }

    if (primaryFromConstraints.length > 0) {
      columns.forEach((column) => {
        if (primaryFromConstraints.includes(column.name)) {
          column.isPrimary = true
          column.nullable = false
        }
      })
    }

    tables.push({
      id: createId('tbl'),
      schema: tableRef.schema,
      name: tableRef.name,
      columns,
      position: {
        x: 80 + ((tables.length - 1) % 3) * 320,
        y: 80 + Math.floor((tables.length - 1) / 3) * 220,
      },
    })

    match = createTablePattern.exec(cleanedSql)
  }

  return {
    tables,
    rawRelations,
    warnings,
  }
}

function parseAlterTableRelations(cleanedSql: string): RawRelation[] {
  const pattern =
    /ALTER\s+TABLE\s+((?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*))?)\s+ADD\s+CONSTRAINT\s+("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)\s+FOREIGN\s+KEY\s*\(("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)\)\s+REFERENCES\s+((?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*))?)\s*\(("[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*)\)([\s\S]*?);/gi

  const relations: RawRelation[] = []

  let match = pattern.exec(cleanedSql)
  while (match) {
    const sourceTable = parseTableRef(match[1])
    const targetTable = parseTableRef(match[5])

    relations.push({
      constraintName: normalizeIdentifier(match[2]),
      sourceTableKey: sourceTable.key,
      sourceColumn: normalizeIdentifier(match[3]),
      targetTableKey: targetTable.key,
      targetColumn: normalizeIdentifier(match[6]),
      onDelete: extractAction(match[7] ?? '', 'DELETE'),
      onUpdate: extractAction(match[7] ?? '', 'UPDATE'),
    })

    match = pattern.exec(cleanedSql)
  }

  return relations
}

function materializeRelations(
  tableList: TableModel[],
  relationSeeds: RawRelation[],
  warnings: string[],
): RelationModel[] {
  const tableMap = new Map<string, TableModel>()

  tableList.forEach((table) => {
    tableMap.set(`${table.schema}.${table.name}`.toLowerCase(), table)
  })

  const seen = new Set<string>()
  const relations: RelationModel[] = []

  relationSeeds.forEach((seed) => {
    const sourceTable = tableMap.get(seed.sourceTableKey)
    const targetTable = tableMap.get(seed.targetTableKey)

    if (!sourceTable || !targetTable) {
      warnings.push(`Relazione ignorata (tabella mancante): ${seed.constraintName}`)
      return
    }

    const sourceColumn = sourceTable.columns.find((column) => column.name === seed.sourceColumn)
    const targetColumn = targetTable.columns.find((column) => column.name === seed.targetColumn)

    if (!sourceColumn || !targetColumn) {
      warnings.push(`Relazione ignorata (colonna mancante): ${seed.constraintName}`)
      return
    }

    const dedupeKey = `${sourceTable.id}:${sourceColumn.id}:${targetTable.id}:${targetColumn.id}`
    if (seen.has(dedupeKey)) {
      return
    }

    seen.add(dedupeKey)

    relations.push({
      id: createId('rel'),
      constraintName: seed.constraintName,
      sourceTableId: sourceTable.id,
      sourceColumnId: sourceColumn.id,
      targetTableId: targetTable.id,
      targetColumnId: targetColumn.id,
      onDelete: seed.onDelete,
      onUpdate: seed.onUpdate,
    })
  })

  return relations
}

function buildImportedDatabase(
  dbPatch: Partial<DatabaseModel>,
  schemas: string[],
  extensions: string[],
  tables: TableModel[],
): DatabaseModel {
  const fallback = createDefaultDatabase()
  const tableSchemas = tables.map((table) => normalizeSchemaName(table.schema))
  const mergedSchemas = dedupeInsensitive(['public', ...schemas, ...tableSchemas])

  return {
    ...fallback,
    ...dbPatch,
    name: normalizeName(dbPatch.name ?? fallback.name) || fallback.name,
    owner: normalizeName(dbPatch.owner ?? fallback.owner) || fallback.owner,
    template: normalizeName(dbPatch.template ?? fallback.template) || fallback.template,
    encoding: dbPatch.encoding?.trim() || fallback.encoding,
    lcCollate: dbPatch.lcCollate?.trim() || fallback.lcCollate,
    lcCType: dbPatch.lcCType?.trim() || fallback.lcCType,
    schemas: mergedSchemas.length > 0 ? mergedSchemas : ['public'],
    extensions: dedupeInsensitive(extensions),
  }
}

export function parseSqlSchema(sql: string): SqlImportResult {
  const cleaned = stripComments(sql)

  const parsedDb = parseDatabaseMeta(cleaned)
  const parsedSchemas = parseSchemaDefinitions(cleaned)
  const parsedExtensions = parseExtensions(cleaned)

  const { tables, rawRelations: createTableRelations, warnings } = parseCreateTableStatements(cleaned)
  const alterRelations = parseAlterTableRelations(cleaned)
  const relationSeeds = [...createTableRelations, ...alterRelations]
  const relations = materializeRelations(tables, relationSeeds, warnings)

  const parsedEntities =
    parsedDb.parsedCount + parsedSchemas.parsedCount + parsedExtensions.parsedCount + tables.length + relationSeeds.length

  if (parsedEntities === 0) {
    warnings.push('Nessuna istruzione SQL compatibile trovata nel file.')
  }

  return {
    database: buildImportedDatabase(parsedDb.databasePatch, parsedSchemas.schemas, parsedExtensions.extensions, tables),
    tables,
    relations,
    warnings,
    parsedEntities,
  }
}
