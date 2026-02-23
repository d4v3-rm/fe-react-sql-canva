import type { ColumnModel, DatabaseModel, RelationModel, TableModel } from '@/domain/schema'

export interface GeneratedScaffoldFile {
  path: string
  content: string
}

interface GenerateSequelizeScaffoldInput {
  database: DatabaseModel
  tables: TableModel[]
  relations: RelationModel[]
}

interface TableContext {
  table: TableModel
  className: string
  fileName: string
  columnPropertyById: Map<string, string>
}

const TS_RESERVED_KEYWORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'as',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'any',
  'boolean',
  'constructor',
  'declare',
  'get',
  'module',
  'require',
  'number',
  'set',
  'string',
  'symbol',
  'type',
  'from',
  'of',
])

function escapeSingleQuotes(raw: string): string {
  return raw.replace(/'/g, "\\'")
}

function normalizeIdentifier(raw: string): string {
  const normalized = raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

  return normalized || 'entity'
}

function toPascalCase(raw: string): string {
  const pascal = normalizeIdentifier(raw)
    .split('_')
    .filter(Boolean)
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join('')

  return pascal || 'Entity'
}

function toCamelCase(raw: string): string {
  const pascal = toPascalCase(raw)
  return pascal.length > 0 ? `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}` : 'item'
}

function sanitizeMemberName(raw: string, fallback: string): string {
  const base = toCamelCase(raw)
  let next = base || fallback

  if (/^[0-9]/.test(next)) {
    next = `${fallback}${toPascalCase(next)}`
  }

  if (TS_RESERVED_KEYWORDS.has(next.toLowerCase())) {
    next = `${next}Value`
  }

  return next
}

function sanitizeClassName(raw: string, fallback: string): string {
  let next = toPascalCase(raw)
  if (!next) {
    next = fallback
  }

  if (/^[0-9]/.test(next)) {
    next = `${fallback}${next}`
  }

  if (TS_RESERVED_KEYWORDS.has(next.toLowerCase())) {
    next = `${next}Model`
  }

  return next
}

function allocateUnique(base: string, usedLower: Set<string>, format: (value: string, index: number) => string): string {
  let candidate = base
  let index = 2

  while (usedLower.has(candidate.toLowerCase())) {
    candidate = format(base, index)
    index += 1
  }

  usedLower.add(candidate.toLowerCase())
  return candidate
}

function toTsType(column: ColumnModel): string {
  if (column.type === 'smallint' || column.type === 'integer' || column.type === 'serial' || column.type === 'bigint' || column.type === 'bigserial') {
    return 'number'
  }

  if (column.type === 'numeric') {
    return 'number'
  }

  if (column.type === 'boolean') {
    return 'boolean'
  }

  if (column.type === 'date' || column.type === 'timestamp' || column.type === 'timestamptz') {
    return 'Date'
  }

  if (column.type === 'jsonb') {
    return 'Record<string, unknown>'
  }

  return 'string'
}

function toDataTypeExpression(column: ColumnModel): string {
  if (column.type === 'smallint') {
    return 'DataType.SMALLINT'
  }

  if (column.type === 'integer' || column.type === 'serial') {
    return 'DataType.INTEGER'
  }

  if (column.type === 'bigint' || column.type === 'bigserial') {
    return 'DataType.BIGINT'
  }

  if (column.type === 'varchar') {
    return column.length ? `DataType.STRING(${column.length})` : 'DataType.STRING(255)'
  }

  if (column.type === 'text') {
    return 'DataType.TEXT'
  }

  if (column.type === 'boolean') {
    return 'DataType.BOOLEAN'
  }

  if (column.type === 'date') {
    return 'DataType.DATEONLY'
  }

  if (column.type === 'timestamp' || column.type === 'timestamptz') {
    return 'DataType.DATE'
  }

  if (column.type === 'numeric') {
    if (column.length && column.scale !== undefined) {
      return `DataType.DECIMAL(${column.length}, ${column.scale})`
    }

    if (column.length) {
      return `DataType.DECIMAL(${column.length})`
    }

    return 'DataType.DECIMAL'
  }

  if (column.type === 'uuid') {
    return 'DataType.UUID'
  }

  return 'DataType.JSONB'
}

function collectValidatorDecorators(column: ColumnModel): string[] {
  const decorators: string[] = []

  if (column.nullable) {
    decorators.push('@IsOptional()')
  } else {
    decorators.push('@IsNotEmpty()')
  }

  if (column.type === 'varchar' || column.type === 'text') {
    decorators.push('@IsString()')
    if (column.type === 'varchar' && column.length) {
      decorators.push(`@MaxLength(${column.length})`)
    }
  } else if (column.type === 'uuid') {
    decorators.push('@IsUUID()')
  } else if (
    column.type === 'smallint' ||
    column.type === 'integer' ||
    column.type === 'serial' ||
    column.type === 'bigint' ||
    column.type === 'bigserial'
  ) {
    decorators.push('@IsInt()')
  } else if (column.type === 'numeric') {
    decorators.push('@IsNumber()')
  } else if (column.type === 'boolean') {
    decorators.push('@IsBoolean()')
  } else if (column.type === 'date' || column.type === 'timestamp' || column.type === 'timestamptz') {
    decorators.push('@IsDate()')
  } else if (column.type === 'jsonb') {
    decorators.push('@IsObject()')
  }

  return decorators
}

function collectValidatorImports(columns: ColumnModel[]): string[] {
  const imports = new Set<string>()

  columns.forEach((column) => {
    collectValidatorDecorators(column).forEach((decorator) => {
      const match = decorator.match(/^@([A-Za-z0-9_]+)/)
      if (match?.[1]) {
        imports.add(match[1])
      }
    })
  })

  return [...imports].sort((a, b) => a.localeCompare(b))
}

function buildColumnPropertyMap(table: TableModel): Map<string, string> {
  const usedNames = new Set<string>()
  const map = new Map<string, string>()

  table.columns.forEach((column) => {
    const baseName = sanitizeMemberName(column.name, 'column')
    const propertyName = allocateUnique(baseName, usedNames, (value, index) => `${value}${index}`)
    map.set(column.id, propertyName)
  })

  return map
}

function buildTableContexts(tables: TableModel[]): TableContext[] {
  const usedClasses = new Set<string>()
  const usedFiles = new Set<string>()

  return tables.map((table) => {
    const schemaPrefix = table.schema === 'public' ? '' : toPascalCase(table.schema)
    const classBase = sanitizeClassName(`${schemaPrefix}${toPascalCase(table.name)}Model`, 'Entity')
    const className = allocateUnique(classBase, usedClasses, (value, index) => `${value}${index}`)

    const fileBaseCore = table.schema === 'public' ? normalizeIdentifier(table.name) : `${normalizeIdentifier(table.schema)}_${normalizeIdentifier(table.name)}`
    const fileBase = normalizeIdentifier(fileBaseCore)
    const fileCore = allocateUnique(fileBase, usedFiles, (value, index) => `${value}_${index}`)

    return {
      table,
      className,
      fileName: `${fileCore}.model.ts`,
      columnPropertyById: buildColumnPropertyMap(table),
    }
  })
}

function resolveColumnProperty(context: TableContext, columnId: string, fallbackRaw: string): string {
  return context.columnPropertyById.get(columnId) ?? sanitizeMemberName(fallbackRaw, 'column')
}

function buildModelSource(
  context: TableContext,
  tableContextsById: Map<string, TableContext>,
  relationsBySourceTable: Map<string, RelationModel[]>,
  relationsByTargetTable: Map<string, RelationModel[]>,
  relationBySourceColumnKey: Map<string, RelationModel[]>,
): string {
  const validatorImports = collectValidatorImports(context.table.columns)
  const outgoingRelations = relationsBySourceTable.get(context.table.id) ?? []
  const incomingRelations = relationsByTargetTable.get(context.table.id) ?? []

  const usedMemberNames = new Set<string>([...context.columnPropertyById.values()].map((value) => value.toLowerCase()))
  const sequelizeDecoratorImports = new Set<string>(['Model', 'Table', 'Column', 'DataType', 'AllowNull'])
  const relationClassImports = new Set<string>()
  const relationLines: string[] = []

  const ensureUniqueMember = (baseRaw: string, fallback: string): string => {
    const base = sanitizeMemberName(baseRaw, fallback)
    return allocateUnique(base, usedMemberNames, (value, index) => `${value}${index}`)
  }

  const columnBlocks = context.table.columns.map((column) => {
    const decorators: string[] = []
    const sourceRelations = relationBySourceColumnKey.get(`${context.table.id}:${column.id}`) ?? []
    const sourceRelation = sourceRelations[0]
    const propertyName = resolveColumnProperty(context, column.id, column.name)

    if (sourceRelation) {
      const targetContext = tableContextsById.get(sourceRelation.targetTableId)
      if (targetContext) {
        decorators.push(`@ForeignKey(() => ${targetContext.className})`)
        sequelizeDecoratorImports.add('ForeignKey')
      }
    }

    if (column.isPrimary) {
      decorators.push('@PrimaryKey')
      sequelizeDecoratorImports.add('PrimaryKey')
    }

    if (column.autoIncrement) {
      decorators.push('@AutoIncrement')
      sequelizeDecoratorImports.add('AutoIncrement')
    }

    if (column.isUnique) {
      decorators.push('@Unique')
      sequelizeDecoratorImports.add('Unique')
    }

    decorators.push(`@AllowNull(${column.nullable ? 'true' : 'false'})`)
    decorators.push('@Column({')
    decorators.push(`  field: '${escapeSingleQuotes(column.name)}',`)
    decorators.push(`  type: ${toDataTypeExpression(column)},`)
    decorators.push(`  allowNull: ${column.nullable ? 'true' : 'false'},`)

    if (column.isUnique) {
      decorators.push('  unique: true,')
    }

    if (column.defaultValue.trim()) {
      decorators.push(`  defaultValue: '${escapeSingleQuotes(column.defaultValue)}',`)
    }

    decorators.push('})')
    decorators.push(...collectValidatorDecorators(column))

    const propertyType = toTsType(column)
    const nullableType = column.nullable ? `${propertyType} | null` : propertyType

    const lines = decorators.map((line) => `  ${line}`)
    lines.push(`  declare ${propertyName}: ${nullableType}`)

    return lines.join('\n')
  })

  outgoingRelations.forEach((relation) => {
    const targetContext = tableContextsById.get(relation.targetTableId)
    if (!targetContext) {
      return
    }

    const sourceColumn = context.table.columns.find((column) => column.id === relation.sourceColumnId)
    const foreignKeyProperty = resolveColumnProperty(context, relation.sourceColumnId, sourceColumn?.name ?? 'column')

    relationClassImports.add(targetContext.className)
    sequelizeDecoratorImports.add('BelongsTo')

    const relationName = ensureUniqueMember(`${toCamelCase(targetContext.table.name)}By${toPascalCase(foreignKeyProperty)}`, 'related')
    relationLines.push(`  @BelongsTo(() => ${targetContext.className}, { foreignKey: '${foreignKeyProperty}', as: '${relationName}' })`)
    relationLines.push(`  declare ${relationName}?: ${targetContext.className}`)
    relationLines.push('')
  })

  incomingRelations.forEach((relation) => {
    const sourceContext = tableContextsById.get(relation.sourceTableId)
    if (!sourceContext) {
      return
    }

    relationClassImports.add(sourceContext.className)

    const sourceColumn = sourceContext.table.columns.find((column) => column.id === relation.sourceColumnId)
    const sourceForeignKey = resolveColumnProperty(sourceContext, relation.sourceColumnId, sourceColumn?.name ?? 'column')
    const isOneToOne = Boolean(sourceColumn?.isUnique || sourceColumn?.isPrimary)

    if (isOneToOne) {
      sequelizeDecoratorImports.add('HasOne')
      const relationName = ensureUniqueMember(`${toCamelCase(sourceContext.table.name)}By${toPascalCase(sourceForeignKey)}`, 'related')
      relationLines.push(`  @HasOne(() => ${sourceContext.className}, { foreignKey: '${sourceForeignKey}', as: '${relationName}' })`)
      relationLines.push(`  declare ${relationName}?: ${sourceContext.className}`)
      relationLines.push('')
      return
    }

    sequelizeDecoratorImports.add('HasMany')
    const relationName = ensureUniqueMember(`${toCamelCase(sourceContext.table.name)}ListBy${toPascalCase(sourceForeignKey)}`, 'relatedList')
    relationLines.push(`  @HasMany(() => ${sourceContext.className}, { foreignKey: '${sourceForeignKey}', as: '${relationName}' })`)
    relationLines.push(`  declare ${relationName}?: ${sourceContext.className}[]`)
    relationLines.push('')
  })

  const relationshipImportLines = [...relationClassImports]
    .filter((className) => className !== context.className)
    .sort((a, b) => a.localeCompare(b))
    .map((className) => {
      const target = [...tableContextsById.values()].find((item) => item.className === className)
      if (!target) {
        return ''
      }

      const importPath = `./${target.fileName.replace(/\.ts$/, '')}`
      return `import { ${className} } from '${importPath}'`
    })
    .filter(Boolean)

  const sections: string[] = []

  sections.push(`import { ${[...sequelizeDecoratorImports].sort((a, b) => a.localeCompare(b)).join(', ')} } from 'sequelize-typescript'`)

  if (validatorImports.length > 0) {
    sections.push(`import { ${validatorImports.join(', ')} } from 'class-validator'`)
  }

  if (relationshipImportLines.length > 0) {
    sections.push(...relationshipImportLines)
  }

  sections.push('')
  sections.push('@Table({')
  sections.push(`  tableName: '${escapeSingleQuotes(context.table.name)}',`)
  sections.push(`  schema: '${escapeSingleQuotes(context.table.schema)}',`)
  sections.push('  timestamps: false,')
  sections.push('})')
  sections.push(`export class ${context.className} extends Model<${context.className}> {`)
  sections.push(columnBlocks.join('\n\n'))

  if (relationLines.length > 0) {
    sections.push('')
    sections.push(...relationLines.slice(0, -1))
  }

  sections.push('}')
  sections.push('')

  return sections.join('\n')
}

function buildModelsIndex(contexts: TableContext[]): string {
  if (contexts.length === 0) {
    return 'export {}\n'
  }

  const lines = contexts
    .slice()
    .sort((a, b) => a.className.localeCompare(b.className))
    .map((context) => `export { ${context.className} } from './${context.fileName.replace(/\.ts$/, '')}'`)

  return `${lines.join('\n')}\n`
}

function buildDatabaseBootstrap(database: DatabaseModel, contexts: TableContext[]): string {
  const classNames = contexts.map((context) => context.className).sort((a, b) => a.localeCompare(b))
  const importModelsLine = classNames.length > 0 ? `import { ${classNames.join(', ')} } from '../models'\n` : ''
  const modelsArray = classNames.length > 0 ? `[${classNames.join(', ')}]` : '[]'

  return `import 'reflect-metadata'
import { Sequelize } from 'sequelize-typescript'
${importModelsLine}
export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? '${escapeSingleQuotes(database.name)}',
  models: ${modelsArray},
  logging: false,
})

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate()
}
`
}

function buildPackageJson(database: DatabaseModel): string {
  return `{
  "name": "${normalizeIdentifier(database.name)}-sequelize-scaffold",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/database/sequelize.js"
  },
  "dependencies": {
    "class-validator": "^0.14.2",
    "pg": "^8.16.3",
    "pg-hstore": "^2.3.4",
    "reflect-metadata": "^0.2.2",
    "sequelize": "^6.37.7",
    "sequelize-typescript": "^2.1.6"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "typescript": "^5.9.3"
  }
}
`
}

function buildTsConfig(): string {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
`
}

function buildReadme(database: DatabaseModel, contexts: TableContext[]): string {
  const modelLines = contexts.length > 0 ? contexts.map((context) => `- ${context.className}`).join('\n') : '- No models available'

  return `# ${database.name} - Sequelize Scaffold

TypeScript scaffolding generated in real time by SQL Canvas.

## Stack
- sequelize
- sequelize-typescript
- class-validator

## Modelli generati
${modelLines}
`
}

export function generateSequelizeScaffold({ database, tables, relations }: GenerateSequelizeScaffoldInput): GeneratedScaffoldFile[] {
  const contexts = buildTableContexts(tables)
  const contextsById = new Map(contexts.map((context) => [context.table.id, context]))

  const relationsBySourceTable = new Map<string, RelationModel[]>()
  const relationsByTargetTable = new Map<string, RelationModel[]>()
  const relationBySourceColumnKey = new Map<string, RelationModel[]>()

  relations.forEach((relation) => {
    const sourceList = relationsBySourceTable.get(relation.sourceTableId) ?? []
    sourceList.push(relation)
    relationsBySourceTable.set(relation.sourceTableId, sourceList)

    const targetList = relationsByTargetTable.get(relation.targetTableId) ?? []
    targetList.push(relation)
    relationsByTargetTable.set(relation.targetTableId, targetList)

    const key = `${relation.sourceTableId}:${relation.sourceColumnId}`
    const byColumn = relationBySourceColumnKey.get(key) ?? []
    byColumn.push(relation)
    relationBySourceColumnKey.set(key, byColumn)
  })

  const modelFiles = contexts.map<GeneratedScaffoldFile>((context) => ({
    path: `src/models/${context.fileName}`,
    content: buildModelSource(context, contextsById, relationsBySourceTable, relationsByTargetTable, relationBySourceColumnKey),
  }))

  const files: GeneratedScaffoldFile[] = [
    {
      path: 'package.json',
      content: buildPackageJson(database),
    },
    {
      path: 'tsconfig.json',
      content: buildTsConfig(),
    },
    {
      path: 'README.md',
      content: buildReadme(database, contexts),
    },
    {
      path: 'src/models/index.ts',
      content: buildModelsIndex(contexts),
    },
    {
      path: 'src/database/sequelize.ts',
      content: buildDatabaseBootstrap(database, contexts),
    },
    ...modelFiles,
  ]

  return files.sort((a, b) => a.path.localeCompare(b.path))
}
