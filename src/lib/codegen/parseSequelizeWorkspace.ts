import { createDefaultColumn } from '@/domain/defaults'
import type { ColumnModel, DataType, DatabaseModel, RelationModel, TableModel } from '@/domain/schema'
import { createId } from '@/lib/id'

export interface WorkspaceSourceFile {
  path: string
  content: string
}

interface ParseSequelizeWorkspaceInput {
  files: WorkspaceSourceFile[]
  currentDatabase: DatabaseModel
  currentTables: TableModel[]
  currentRelations: RelationModel[]
}

export interface ParseSequelizeWorkspaceResult {
  database: DatabaseModel
  tables: TableModel[]
  relations: RelationModel[]
  parsedModels: number
  warnings: string[]
}

interface ParsedColumnDraft extends Omit<ColumnModel, 'id'> {
  propertyName: string
}

interface ParsedModelDraft {
  className: string
  schema: string
  tableName: string
  columns: ParsedColumnDraft[]
  propertyToColumnName: Map<string, string>
}

interface RelationSeed {
  sourceClassName: string
  targetClassName: string
  foreignKeyProperty: string
}

function normalizeIdentifier(raw: string): string {
  return (
    raw
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'entity'
  )
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

function tableLookupKey(schema: string, tableName: string): string {
  return `${normalizeIdentifier(schema)}.${normalizeIdentifier(tableName)}`
}

function relationLookupKey(
  sourceSchema: string,
  sourceTable: string,
  sourceColumn: string,
  targetSchema: string,
  targetTable: string,
  targetColumn: string,
): string {
  return [
    normalizeIdentifier(sourceSchema),
    normalizeIdentifier(sourceTable),
    normalizeIdentifier(sourceColumn),
    normalizeIdentifier(targetSchema),
    normalizeIdentifier(targetTable),
    normalizeIdentifier(targetColumn),
  ].join(':')
}

function extractBalancedBlock(text: string, openingBraceIndex: number): { body: string; endIndex: number } | null {
  if (openingBraceIndex < 0 || text[openingBraceIndex] !== '{') {
    return null
  }

  let depth = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inTemplateString = false

  for (let index = openingBraceIndex; index < text.length; index += 1) {
    const char = text[index]
    const prev = text[index - 1]

    if (char === "'" && !inDoubleQuote && !inTemplateString && prev !== '\\') {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote && !inTemplateString && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (char === '`' && !inSingleQuote && !inDoubleQuote && prev !== '\\') {
      inTemplateString = !inTemplateString
      continue
    }

    if (inSingleQuote || inDoubleQuote || inTemplateString) {
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return {
          body: text.slice(openingBraceIndex + 1, index),
          endIndex: index + 1,
        }
      }
    }
  }

  return null
}

function parseColumnType(expression: string, declaredType: string, autoIncrement: boolean): { type: DataType; length?: number; scale?: number } {
  const compact = expression.replace(/\s+/g, '')
  const normalized = compact.toUpperCase()

  if (normalized.includes('DATATYPE.SMALLINT')) {
    return { type: 'smallint' }
  }

  if (normalized.includes('DATATYPE.INTEGER')) {
    return { type: autoIncrement ? 'serial' : 'integer' }
  }

  if (normalized.includes('DATATYPE.BIGINT')) {
    return { type: autoIncrement ? 'bigserial' : 'bigint' }
  }

  if (normalized.includes('DATATYPE.STRING')) {
    const lengthMatch = compact.match(/STRING\((\d+)\)/i)
    return {
      type: 'varchar',
      length: lengthMatch ? Number(lengthMatch[1]) : 255,
    }
  }

  if (normalized.includes('DATATYPE.TEXT')) {
    return { type: 'text' }
  }

  if (normalized.includes('DATATYPE.BOOLEAN')) {
    return { type: 'boolean' }
  }

  if (normalized.includes('DATATYPE.DATEONLY')) {
    return { type: 'date' }
  }

  if (normalized.includes('DATATYPE.DATE')) {
    return { type: 'timestamp' }
  }

  if (normalized.includes('DATATYPE.UUID')) {
    return { type: 'uuid' }
  }

  if (normalized.includes('DATATYPE.JSONB')) {
    return { type: 'jsonb' }
  }

  if (normalized.includes('DATATYPE.DECIMAL')) {
    const decimalMatch = compact.match(/DECIMAL\((\d+)(?:,(\d+))?\)/i)
    if (!decimalMatch) {
      return { type: 'numeric' }
    }

    return {
      type: 'numeric',
      length: Number(decimalMatch[1]),
      scale: decimalMatch[2] ? Number(decimalMatch[2]) : undefined,
    }
  }

  const normalizedDeclared = declaredType.toLowerCase().replace(/\s+/g, '')

  if (normalizedDeclared.includes('number')) {
    return { type: 'integer' }
  }

  if (normalizedDeclared.includes('boolean')) {
    return { type: 'boolean' }
  }

  if (normalizedDeclared.includes('date')) {
    return { type: 'timestamp' }
  }

  if (normalizedDeclared.includes('record<')) {
    return { type: 'jsonb' }
  }

  return { type: 'varchar', length: 255 }
}

function stripWrappingQuotes(raw: string): string {
  const trimmed = raw.trim()

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function extractObjectPropertyValue(objectBody: string, propertyName: string): string | null {
  const propertyPattern = new RegExp(`\\b${propertyName}\\s*:\\s*`, 'i')
  const match = propertyPattern.exec(objectBody)

  if (!match) {
    return null
  }

  let index = match.index + match[0].length
  let parenDepth = 0
  let braceDepth = 0
  let bracketDepth = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inTemplateString = false

  for (; index < objectBody.length; index += 1) {
    const char = objectBody[index]
    const prev = objectBody[index - 1]

    if (char === "'" && !inDoubleQuote && !inTemplateString && prev !== '\\') {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote && !inTemplateString && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (char === '`' && !inSingleQuote && !inDoubleQuote && prev !== '\\') {
      inTemplateString = !inTemplateString
      continue
    }

    if (inSingleQuote || inDoubleQuote || inTemplateString) {
      continue
    }

    if (char === '(') {
      parenDepth += 1
      continue
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      continue
    }

    if (char === '{') {
      braceDepth += 1
      continue
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1)
      continue
    }

    if (char === '[') {
      bracketDepth += 1
      continue
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1)
      continue
    }

    if (char === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
      break
    }
  }

  return objectBody.slice(match.index + match[0].length, index).trim()
}

function parseModelDraftsFromFile(file: WorkspaceSourceFile, warnings: string[]): { models: ParsedModelDraft[]; relationSeeds: RelationSeed[] } {
  const models: ParsedModelDraft[] = []
  const relationSeeds: RelationSeed[] = []

  const modelHeaderPattern = /@Table\s*\(\s*\{([\s\S]*?)\}\s*\)\s*export\s+class\s+([A-Za-z_][A-Za-z0-9_]*)\s+extends\s+Model[^{]*\{/g
  let match = modelHeaderPattern.exec(file.content)

  while (match) {
    const tableConfig = match[1]
    const className = match[2]
    const openBraceOffset = match[0].lastIndexOf('{')
    const openBraceIndex = match.index + openBraceOffset
    const classBlock = extractBalancedBlock(file.content, openBraceIndex)

    if (!classBlock) {
      warnings.push(`Blocco classe non chiuso correttamente in ${file.path}.`)
      match = modelHeaderPattern.exec(file.content)
      continue
    }

    modelHeaderPattern.lastIndex = classBlock.endIndex

    const tableName = normalizeIdentifier(tableConfig.match(/tableName\s*:\s*['"`]([^'"`]+)['"`]/i)?.[1] ?? className)
    const schema = normalizeIdentifier(tableConfig.match(/schema\s*:\s*['"`]([^'"`]+)['"`]/i)?.[1] ?? 'public')

    const columns: ParsedColumnDraft[] = []
    const propertyToColumnName = new Map<string, string>()

    const propertyBlockPattern = /((?:\s*@[\s\S]*?\n)+)\s*declare\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^;\n]+)/g
    let propertyMatch = propertyBlockPattern.exec(classBlock.body)

    while (propertyMatch) {
      const decoratorBlock = propertyMatch[1]
      const propertyName = propertyMatch[2]
      const declaredType = propertyMatch[3].trim()

      const columnConfigMatch = decoratorBlock.match(/@Column\s*\(\s*\{([\s\S]*?)\}\s*\)/)
      const belongsToMatch = decoratorBlock.match(
        /@BelongsTo\s*\(\s*\(\)\s*=>\s*([A-Za-z_][A-Za-z0-9_]*)[\s\S]*?foreignKey\s*:\s*['"`]([^'"`]+)['"`][\s\S]*?\)/,
      )

      if (belongsToMatch) {
        relationSeeds.push({
          sourceClassName: className,
          targetClassName: belongsToMatch[1],
          foreignKeyProperty: belongsToMatch[2],
        })
      }

      if (!columnConfigMatch) {
        propertyMatch = propertyBlockPattern.exec(classBlock.body)
        continue
      }

      const configText = columnConfigMatch[1]
      const fieldExpression = extractObjectPropertyValue(configText, 'field')
      const allowNullExpression = extractObjectPropertyValue(configText, 'allowNull')
      const uniqueExpression = extractObjectPropertyValue(configText, 'unique')
      const defaultValueExpression = extractObjectPropertyValue(configText, 'defaultValue')
      const typeExpression = extractObjectPropertyValue(configText, 'type') ?? ''
      const allowNullDecorator = decoratorBlock.match(/@AllowNull\s*\(\s*(true|false)\s*\)/i)?.[1]

      const isPrimary = /@PrimaryKey\b/.test(decoratorBlock)
      const autoIncrement = /@AutoIncrement\b/.test(decoratorBlock)
      const parsedType = parseColumnType(typeExpression, declaredType, autoIncrement)
      const allowNull = allowNullExpression
        ? allowNullExpression.trim().toLowerCase() === 'true'
        : allowNullDecorator
          ? allowNullDecorator.trim().toLowerCase() === 'true'
          : declaredType.includes('| null')
      const fieldName = normalizeIdentifier(stripWrappingQuotes(fieldExpression ?? propertyName))
      const isUnique = /@Unique\b/.test(decoratorBlock) || uniqueExpression?.trim().toLowerCase() === 'true'
      const defaultValue = defaultValueExpression ? stripWrappingQuotes(defaultValueExpression) : ''

      propertyToColumnName.set(propertyName, fieldName)

      columns.push({
        ...createDefaultColumn(fieldName),
        name: fieldName,
        type: parsedType.type,
        length: parsedType.length,
        scale: parsedType.scale,
        nullable: allowNull,
        defaultValue,
        isPrimary,
        isUnique,
        autoIncrement,
        propertyName,
      })

      propertyMatch = propertyBlockPattern.exec(classBlock.body)
    }

    if (columns.length > 0) {
      models.push({
        className,
        schema,
        tableName,
        columns,
        propertyToColumnName,
      })
    }

    match = modelHeaderPattern.exec(file.content)
  }

  return {
    models,
    relationSeeds,
  }
}

function buildSchemaSignature(database: DatabaseModel, tables: TableModel[], relations: RelationModel[]): string {
  const tableKeyById = new Map<string, string>(
    tables.map((table) => [
      table.id,
      `${table.schema}.${table.name}`.toLowerCase(),
    ]),
  )

  const serializedTables = tables
    .map((table) => ({
      schema: table.schema,
      name: table.name,
      columns: table.columns
        .map((column) => ({
          name: column.name,
          type: column.type,
          length: column.length,
          scale: column.scale,
          nullable: column.nullable,
          isPrimary: column.isPrimary,
          isUnique: column.isUnique,
          autoIncrement: column.autoIncrement,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => `${a.schema}.${a.name}`.localeCompare(`${b.schema}.${b.name}`))

  const serializedRelations = relations
    .map((relation) => ({
      sourceTable: tableKeyById.get(relation.sourceTableId) ?? relation.sourceTableId,
      sourceColumn: relation.sourceColumnId,
      targetTable: tableKeyById.get(relation.targetTableId) ?? relation.targetTableId,
      targetColumn: relation.targetColumnId,
      onDelete: relation.onDelete,
      onUpdate: relation.onUpdate,
    }))
    .sort((a, b) =>
      `${a.sourceTable}:${a.sourceColumn}:${a.targetTable}:${a.targetColumn}`.localeCompare(
        `${b.sourceTable}:${b.sourceColumn}:${b.targetTable}:${b.targetColumn}`,
      ),
    )

  return JSON.stringify({
    database: {
      name: database.name,
      schemas: [...database.schemas].sort((a, b) => a.localeCompare(b)),
    },
    tables: serializedTables,
    relations: serializedRelations,
  })
}

export function parseSequelizeWorkspace({
  files,
  currentDatabase,
  currentTables,
  currentRelations,
}: ParseSequelizeWorkspaceInput): ParseSequelizeWorkspaceResult {
  const warnings: string[] = []
  const parsedModels: ParsedModelDraft[] = []
  const relationSeeds: RelationSeed[] = []

  files
    .filter((file) => file.path.endsWith('.model.ts'))
    .forEach((file) => {
      const parsed = parseModelDraftsFromFile(file, warnings)
      parsedModels.push(...parsed.models)
      relationSeeds.push(...parsed.relationSeeds)
    })

  if (parsedModels.length === 0) {
    return {
      database: currentDatabase,
      tables: currentTables,
      relations: currentRelations,
      parsedModels: 0,
      warnings,
    }
  }

  const currentTableByKey = new Map(currentTables.map((table) => [tableLookupKey(table.schema, table.name), table]))
  const currentRelationByKey = new Map<string, RelationModel>()

  currentRelations.forEach((relation) => {
    const sourceTable = currentTables.find((table) => table.id === relation.sourceTableId)
    const targetTable = currentTables.find((table) => table.id === relation.targetTableId)
    const sourceColumn = sourceTable?.columns.find((column) => column.id === relation.sourceColumnId)
    const targetColumn = targetTable?.columns.find((column) => column.id === relation.targetColumnId)

    if (!sourceTable || !targetTable || !sourceColumn || !targetColumn) {
      return
    }

    currentRelationByKey.set(
      relationLookupKey(sourceTable.schema, sourceTable.name, sourceColumn.name, targetTable.schema, targetTable.name, targetColumn.name),
      relation,
    )
  })

  const tables: TableModel[] = parsedModels.map((model, index) => {
    const existingTable = currentTableByKey.get(tableLookupKey(model.schema, model.tableName))
    const existingColumnByName = new Map(existingTable?.columns.map((column) => [column.name.toLowerCase(), column]) ?? [])

    const columns: ColumnModel[] = model.columns.map((column) => {
      const existingColumn = existingColumnByName.get(column.name.toLowerCase())
      return {
        id: existingColumn?.id ?? createId('col'),
        name: column.name,
        type: column.type,
        length: column.length,
        scale: column.scale,
        nullable: column.nullable,
        defaultValue: column.defaultValue,
        isPrimary: column.isPrimary,
        isUnique: column.isUnique,
        autoIncrement: column.autoIncrement,
      }
    })

    return {
      id: existingTable?.id ?? createId('tbl'),
      schema: model.schema,
      name: model.tableName,
      columns,
      position: existingTable?.position ?? {
        x: 80 + (index % 3) * 320,
        y: 80 + Math.floor(index / 3) * 220,
      },
    }
  })

  const tableByClassName = new Map<string, { table: TableModel; propertyToColumnName: Map<string, string> }>()

  parsedModels.forEach((model) => {
    const table = tables.find((tableItem) => tableLookupKey(tableItem.schema, tableItem.name) === tableLookupKey(model.schema, model.tableName))
    if (!table) {
      return
    }

    tableByClassName.set(model.className, {
      table,
      propertyToColumnName: model.propertyToColumnName,
    })
  })

  const relations: RelationModel[] = []
  const seenRelationKeys = new Set<string>()

  relationSeeds.forEach((seed) => {
    const sourceModel = tableByClassName.get(seed.sourceClassName)
    const targetModel = tableByClassName.get(seed.targetClassName)

    if (!sourceModel || !targetModel) {
      return
    }

    const sourceColumnName = sourceModel.propertyToColumnName.get(seed.foreignKeyProperty) ?? normalizeIdentifier(seed.foreignKeyProperty)
    const sourceColumn = sourceModel.table.columns.find((column) => column.name === sourceColumnName)
    const targetPrimaryColumn =
      targetModel.table.columns.find((column) => column.isPrimary) ??
      targetModel.table.columns.find((column) => column.name === 'id') ??
      targetModel.table.columns[0]

    if (!sourceColumn || !targetPrimaryColumn) {
      return
    }

    const relationKey = relationLookupKey(
      sourceModel.table.schema,
      sourceModel.table.name,
      sourceColumn.name,
      targetModel.table.schema,
      targetModel.table.name,
      targetPrimaryColumn.name,
    )

    if (seenRelationKeys.has(relationKey)) {
      return
    }

    seenRelationKeys.add(relationKey)

    const existingRelation = currentRelationByKey.get(relationKey)

    relations.push({
      id: existingRelation?.id ?? createId('rel'),
      constraintName:
        existingRelation?.constraintName ?? `fk_${normalizeIdentifier(sourceModel.table.name)}_${normalizeIdentifier(sourceColumn.name)}`,
      sourceTableId: sourceModel.table.id,
      sourceColumnId: sourceColumn.id,
      targetTableId: targetModel.table.id,
      targetColumnId: targetPrimaryColumn.id,
      onDelete: existingRelation?.onDelete ?? 'NO ACTION',
      onUpdate: existingRelation?.onUpdate ?? 'NO ACTION',
    })
  })

  const schemas = dedupeInsensitive(['public', ...currentDatabase.schemas, ...tables.map((table) => table.schema)])

  const database: DatabaseModel = {
    ...currentDatabase,
    schemas,
  }

  const signatureFromParsed = buildSchemaSignature(database, tables, relations)
  const currentSignature = buildSchemaSignature(currentDatabase, currentTables, currentRelations)

  if (signatureFromParsed === currentSignature) {
    return {
      database: currentDatabase,
      tables: currentTables,
      relations: currentRelations,
      parsedModels: parsedModels.length,
      warnings,
    }
  }

  return {
    database,
    tables,
    relations,
    parsedModels: parsedModels.length,
    warnings,
  }
}
