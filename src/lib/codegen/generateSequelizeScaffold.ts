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
  return normalizeIdentifier(raw)
    .split('_')
    .filter(Boolean)
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join('')
}

function toCamelCase(raw: string): string {
  const pascal = toPascalCase(raw)
  return pascal.length > 0 ? `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}` : 'item'
}

function toModelClassName(table: TableModel): string {
  const schemaPrefix = table.schema === 'public' ? '' : toPascalCase(table.schema)
  return `${schemaPrefix}${toPascalCase(table.name)}Model`
}

function toModelFileName(table: TableModel): string {
  const baseName = table.schema === 'public' ? normalizeIdentifier(table.name) : `${normalizeIdentifier(table.schema)}_${normalizeIdentifier(table.name)}`
  return `${baseName}.model.ts`
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

function renderColumnDecorators(
  table: TableModel,
  column: ColumnModel,
  relationByColumnKey: Map<string, RelationModel>,
  tableContextsById: Map<string, TableContext>,
): { lines: string[]; requiresForeignKey: boolean } {
  const decorators: string[] = []

  const columnRelation = relationByColumnKey.get(`${table.id}:${column.id}`)
  let requiresForeignKey = false

  if (columnRelation) {
    const targetContext = tableContextsById.get(columnRelation.targetTableId)
    if (targetContext) {
      decorators.push(`@ForeignKey(() => ${targetContext.className})`)
      requiresForeignKey = true
    }
  }

  if (column.isPrimary) {
    decorators.push('@PrimaryKey')
  }

  if (column.autoIncrement) {
    decorators.push('@AutoIncrement')
  }

  if (column.isUnique) {
    decorators.push('@Unique')
  }

  decorators.push(`@AllowNull(${column.nullable ? 'true' : 'false'})`)

  const columnConfig: string[] = [
    `field: '${column.name}'`,
    `type: ${toDataTypeExpression(column)}`,
    `allowNull: ${column.nullable ? 'true' : 'false'}`,
  ]

  if (column.isUnique) {
    columnConfig.push('unique: true')
  }

  if (column.defaultValue.trim()) {
    columnConfig.push(`defaultValue: '${column.defaultValue.replace(/'/g, "\\'")}'`)
  }

  decorators.push('@Column({')
  columnConfig.forEach((line) => {
    decorators.push(`  ${line},`)
  })
  decorators.push('})')

  decorators.push(...collectValidatorDecorators(column))

  return {
    lines: decorators,
    requiresForeignKey,
  }
}

function buildTableContexts(tables: TableModel[]): TableContext[] {
  return tables.map((table) => ({
    table,
    className: toModelClassName(table),
    fileName: toModelFileName(table),
  }))
}

function buildModelSource(
  context: TableContext,
  tableContextsById: Map<string, TableContext>,
  relationsBySourceTable: Map<string, RelationModel[]>,
  relationsByTargetTable: Map<string, RelationModel[]>,
  relationByColumnKey: Map<string, RelationModel>,
): string {
  const validatorImports = collectValidatorImports(context.table.columns)
  const outgoingRelations = relationsBySourceTable.get(context.table.id) ?? []
  const incomingRelations = relationsByTargetTable.get(context.table.id) ?? []

  const sequelizeDecoratorImports = new Set<string>(['Model', 'Table', 'Column', 'DataType', 'AllowNull'])
  const relationClassImports = new Set<string>()
  const relationLines: string[] = []

  const columnBlocks = context.table.columns.map((column) => {
    const columnDecorators = renderColumnDecorators(context.table, column, relationByColumnKey, tableContextsById)

    if (columnDecorators.requiresForeignKey) {
      sequelizeDecoratorImports.add('ForeignKey')
    }

    if (column.isPrimary) {
      sequelizeDecoratorImports.add('PrimaryKey')
    }

    if (column.autoIncrement) {
      sequelizeDecoratorImports.add('AutoIncrement')
    }

    if (column.isUnique) {
      sequelizeDecoratorImports.add('Unique')
    }

    const propertyType = toTsType(column)
    const nullableType = column.nullable ? `${propertyType} | null` : propertyType

    const lines = columnDecorators.lines.map((line) => `  ${line}`)
    lines.push(`  declare ${column.name}: ${nullableType}`)

    return lines.join('\n')
  })

  outgoingRelations.forEach((relation) => {
    const targetContext = tableContextsById.get(relation.targetTableId)
    if (!targetContext) {
      return
    }

    const sourceColumn = context.table.columns.find((column) => column.id === relation.sourceColumnId)
    const foreignKeyName = sourceColumn?.name ?? relation.sourceColumnId

    relationClassImports.add(targetContext.className)
    sequelizeDecoratorImports.add('BelongsTo')

    const relationName = toCamelCase(targetContext.table.name)
    relationLines.push(`  @BelongsTo(() => ${targetContext.className}, { foreignKey: '${foreignKeyName}', as: '${relationName}' })`)
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
    const foreignKeyName = sourceColumn?.name ?? relation.sourceColumnId
    const isOneToOne = Boolean(sourceColumn?.isUnique || sourceColumn?.isPrimary)

    if (isOneToOne) {
      sequelizeDecoratorImports.add('HasOne')
      const relationName = `${toCamelCase(sourceContext.table.name)}Item`
      relationLines.push(`  @HasOne(() => ${sourceContext.className}, { foreignKey: '${foreignKeyName}', as: '${relationName}' })`)
      relationLines.push(`  declare ${relationName}?: ${sourceContext.className}`)
      relationLines.push('')
      return
    }

    sequelizeDecoratorImports.add('HasMany')
    const relationName = `${toCamelCase(sourceContext.table.name)}List`
    relationLines.push(`  @HasMany(() => ${sourceContext.className}, { foreignKey: '${foreignKeyName}', as: '${relationName}' })`)
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
  sections.push(`  tableName: '${context.table.name}',`)
  sections.push(`  schema: '${context.table.schema}',`)
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
  const lines = contexts
    .slice()
    .sort((a, b) => a.className.localeCompare(b.className))
    .map((context) => `export { ${context.className} } from './${context.fileName.replace(/\.ts$/, '')}'`)

  return `${lines.join('\n')}\n`
}

function buildDatabaseBootstrap(database: DatabaseModel, contexts: TableContext[]): string {
  const classNames = contexts.map((context) => context.className).sort((a, b) => a.localeCompare(b))

  return `import 'reflect-metadata'
import { Sequelize } from 'sequelize-typescript'
import { ${classNames.join(', ')} } from '../models'

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? '${database.name}',
  models: [${classNames.join(', ')}],
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
    "lint": "eslint \\"src/**/*.ts\\"",
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
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
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
  return `# ${database.name} - Sequelize Scaffold

Scaffolding TypeScript generato in real-time da SQL Canvas.

## Stack
- sequelize
- sequelize-typescript
- class-validator

## Modelli generati
${contexts.map((context) => `- ${context.className}`).join('\n')}
`
}

export function generateSequelizeScaffold({ database, tables, relations }: GenerateSequelizeScaffoldInput): GeneratedScaffoldFile[] {
  const contexts = buildTableContexts(tables)
  const contextsById = new Map(contexts.map((context) => [context.table.id, context]))

  const relationsBySourceTable = new Map<string, RelationModel[]>()
  const relationsByTargetTable = new Map<string, RelationModel[]>()
  const relationByColumnKey = new Map<string, RelationModel>()

  relations.forEach((relation) => {
    const sourceList = relationsBySourceTable.get(relation.sourceTableId) ?? []
    sourceList.push(relation)
    relationsBySourceTable.set(relation.sourceTableId, sourceList)

    const targetList = relationsByTargetTable.get(relation.targetTableId) ?? []
    targetList.push(relation)
    relationsByTargetTable.set(relation.targetTableId, targetList)

    relationByColumnKey.set(`${relation.sourceTableId}:${relation.sourceColumnId}`, relation)
  })

  const modelFiles = contexts.map<GeneratedScaffoldFile>((context) => ({
    path: `src/models/${context.fileName}`,
    content: buildModelSource(context, contextsById, relationsBySourceTable, relationsByTargetTable, relationByColumnKey),
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
