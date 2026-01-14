import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  createDefaultColumn,
  createDefaultDatabase,
  createDefaultRelation,
  createDefaultRelationName,
  createDefaultTable,
} from '@/domain/defaults'
import type { ColumnModel, DatabaseModel, ForeignKeyAction, RelationModel, TableModel } from '@/domain/schema'
import { createId } from '@/lib/id'
import { ensureUniqueName, findTableById } from '@/lib/schemaHelpers'
import { getTemplateById } from '@/lib/templates/databaseTemplates'
import { parseSqlSchema } from '@/lib/sql/parseSql'

const STORAGE_KEY = 'sql-canvas-project-v1'

interface AddRelationInput {
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
}

interface UpdateRelationInput {
  constraintName?: string
  onDelete?: ForeignKeyAction
  onUpdate?: ForeignKeyAction
}

type DatabasePatch = Partial<Pick<DatabaseModel, 'name' | 'owner' | 'encoding' | 'lcCollate' | 'lcCType' | 'template'>>

interface SchemaStore {
  database: DatabaseModel
  tables: TableModel[]
  relations: RelationModel[]
  selectedTableId: string | null
  importWarnings: string[]
  lastSavedAt: string
  selectTable: (tableId: string | null) => void
  updateDatabase: (patch: DatabasePatch) => void
  addSchema: (schemaName: string) => boolean
  renameSchema: (currentSchema: string, nextSchema: string) => boolean
  deleteSchema: (schemaName: string) => boolean
  addExtension: (extensionName: string) => boolean
  removeExtension: (extensionName: string) => void
  addTable: () => void
  addTableInSchema: (schemaName: string) => void
  renameTable: (tableId: string, nextName: string) => boolean
  duplicateTable: (tableId: string) => void
  moveTableToSchema: (tableId: string, schemaName: string) => void
  updateTable: (tableId: string, patch: Partial<Pick<TableModel, 'schema' | 'name'>>) => void
  deleteTable: (tableId: string) => void
  addColumn: (tableId: string) => void
  updateColumn: (tableId: string, columnId: string, patch: Partial<ColumnModel>) => void
  deleteColumn: (tableId: string, columnId: string) => void
  addRelation: (input: AddRelationInput) => void
  updateRelation: (relationId: string, patch: UpdateRelationInput) => void
  deleteRelation: (relationId: string) => void
  setTablePosition: (tableId: string, x: number, y: number) => void
  importSql: (sql: string) => boolean
  applyTemplate: (templateId: string) => boolean
  replaceProject: (database: DatabaseModel, tables: TableModel[], relations: RelationModel[]) => void
  clearProject: () => void
  clearWarnings: () => void
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeEntityName(raw: string): string {
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
  const normalized = normalizeEntityName(raw)
  return normalized || 'public'
}

function normalizeExtensionName(raw: string): string {
  return normalizeEntityName(raw)
}

function dedupeCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []

  items.forEach((item) => {
    const normalized = item.trim()
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

function collectSchemasFromTables(tables: TableModel[]): string[] {
  const fromTables = tables.map((table) => normalizeSchemaName(table.schema))
  const schemas = dedupeCaseInsensitive(['public', ...fromTables])

  return schemas.length > 0 ? schemas : ['public']
}

function sanitizeDatabase(database: DatabaseModel, tables: TableModel[]): DatabaseModel {
  const fallback = createDefaultDatabase()

  const normalizedSchemas = dedupeCaseInsensitive(
    database.schemas.map((schema) => normalizeSchemaName(schema)).concat(collectSchemasFromTables(tables)),
  )

  const normalizedExtensions = dedupeCaseInsensitive(database.extensions.map((extension) => normalizeExtensionName(extension))).filter(
    Boolean,
  )

  return {
    ...fallback,
    ...database,
    name: normalizeEntityName(database.name) || fallback.name,
    owner: normalizeEntityName(database.owner) || fallback.owner,
    encoding: database.encoding.trim() || fallback.encoding,
    lcCollate: database.lcCollate.trim() || fallback.lcCollate,
    lcCType: database.lcCType.trim() || fallback.lcCType,
    template: normalizeEntityName(database.template) || fallback.template,
    schemas: normalizedSchemas.length > 0 ? normalizedSchemas : ['public'],
    extensions: normalizedExtensions,
  }
}

function dropRelationsForMissingColumns(relations: RelationModel[], tableId: string, deletedColumnId: string): RelationModel[] {
  return relations.filter(
    (relation) =>
      !(relation.sourceTableId === tableId && relation.sourceColumnId === deletedColumnId) &&
      !(relation.targetTableId === tableId && relation.targetColumnId === deletedColumnId),
  )
}

function buildUniqueTableName(existingTables: TableModel[]): string {
  const suggested = `table_${existingTables.length + 1}`
  return ensureUniqueName(
    suggested,
    existingTables.map((table) => table.name),
  )
}

function buildUniqueTableNameInSchema(existingTables: TableModel[], schemaName: string, baseName: string): string {
  return ensureUniqueName(
    baseName,
    existingTables.filter((table) => table.schema === schemaName).map((table) => table.name),
  )
}

function buildUniqueColumnName(table: TableModel): string {
  return ensureUniqueName(
    'column_1',
    table.columns.map((column) => column.name),
  )
}

function buildUniqueConstraintName(existingRelations: RelationModel[], baseName: string): string {
  return ensureUniqueName(
    baseName,
    existingRelations.map((relation) => relation.constraintName),
  )
}

function applySchemaRename(tables: TableModel[], currentSchema: string, nextSchema: string): TableModel[] {
  return tables.map((table) => {
    if (table.schema !== currentSchema) {
      return table
    }

    return {
      ...table,
      schema: nextSchema,
    }
  })
}

function cloneColumns(columns: ColumnModel[]): ColumnModel[] {
  return columns.map((column) => ({
    ...column,
    id: createId('col'),
  }))
}

const initialDatabase = createDefaultDatabase()

export const useSchemaStore = create<SchemaStore>()(
  persist(
    (set) => ({
      database: initialDatabase,
      tables: [],
      relations: [],
      selectedTableId: null,
      importWarnings: [],
      lastSavedAt: nowIso(),
      selectTable: (tableId) => {
        set({ selectedTableId: tableId })
      },
      updateDatabase: (patch) => {
        set((state) => ({
          database: sanitizeDatabase(
            {
              ...state.database,
              ...patch,
            },
            state.tables,
          ),
          lastSavedAt: nowIso(),
        }))
      },
      addSchema: (schemaName) => {
        let added = false

        set((state) => {
          const normalized = normalizeSchemaName(schemaName)
          const exists = state.database.schemas.some((schema) => schema.toLowerCase() === normalized.toLowerCase())

          if (exists) {
            return state
          }

          added = true

          return {
            database: {
              ...state.database,
              schemas: [...state.database.schemas, normalized],
            },
            lastSavedAt: nowIso(),
          }
        })

        return added
      },
      renameSchema: (currentSchema, nextSchema) => {
        let renamed = false

        set((state) => {
          const normalizedCurrent = normalizeSchemaName(currentSchema)
          const normalizedNext = normalizeSchemaName(nextSchema)

          if (normalizedCurrent === normalizedNext) {
            return state
          }

          const currentExists = state.database.schemas.some((schema) => schema.toLowerCase() === normalizedCurrent.toLowerCase())
          const nextExists = state.database.schemas.some((schema) => schema.toLowerCase() === normalizedNext.toLowerCase())

          if (!currentExists || nextExists) {
            return state
          }

          renamed = true

          return {
            database: {
              ...state.database,
              schemas: state.database.schemas.map((schema) => (schema === normalizedCurrent ? normalizedNext : schema)),
            },
            tables: applySchemaRename(state.tables, normalizedCurrent, normalizedNext),
            lastSavedAt: nowIso(),
          }
        })

        return renamed
      },
      deleteSchema: (schemaName) => {
        let removed = false

        set((state) => {
          const normalized = normalizeSchemaName(schemaName)

          if (state.database.schemas.length <= 1) {
            return state
          }

          if (!state.database.schemas.some((schema) => schema.toLowerCase() === normalized.toLowerCase())) {
            return state
          }

          removed = true

          const remainingSchemas = state.database.schemas.filter((schema) => schema.toLowerCase() !== normalized.toLowerCase())
          const fallbackSchema = remainingSchemas[0] ?? 'public'

          return {
            database: {
              ...state.database,
              schemas: remainingSchemas,
            },
            tables: state.tables.map((table) => {
              if (table.schema.toLowerCase() !== normalized.toLowerCase()) {
                return table
              }

              return {
                ...table,
                schema: fallbackSchema,
              }
            }),
            lastSavedAt: nowIso(),
          }
        })

        return removed
      },
      addExtension: (extensionName) => {
        let added = false

        set((state) => {
          const normalized = normalizeExtensionName(extensionName)
          if (!normalized) {
            return state
          }

          const exists = state.database.extensions.some((extension) => extension.toLowerCase() === normalized.toLowerCase())
          if (exists) {
            return state
          }

          added = true

          return {
            database: {
              ...state.database,
              extensions: [...state.database.extensions, normalized],
            },
            lastSavedAt: nowIso(),
          }
        })

        return added
      },
      removeExtension: (extensionName) => {
        set((state) => ({
          database: {
            ...state.database,
            extensions: state.database.extensions.filter(
              (extension) => extension.toLowerCase() !== normalizeExtensionName(extensionName).toLowerCase(),
            ),
          },
          lastSavedAt: nowIso(),
        }))
      },
      addTable: () => {
        set((state) => {
          const preferredSchema = state.database.schemas[0] ?? 'public'
          const draft = createDefaultTable(state.tables.length + 1, preferredSchema)
          draft.name = buildUniqueTableName(state.tables)

          return {
            tables: [...state.tables, draft],
            selectedTableId: draft.id,
            importWarnings: [],
            lastSavedAt: nowIso(),
          }
        })
      },
      addTableInSchema: (schemaName) => {
        set((state) => {
          const preferredSchema = normalizeSchemaName(schemaName)
          const draft = createDefaultTable(state.tables.length + 1, preferredSchema)
          draft.name = buildUniqueTableName(state.tables)

          const schemaExists = state.database.schemas.some((schema) => schema.toLowerCase() === preferredSchema.toLowerCase())
          const nextSchemas = schemaExists ? state.database.schemas : [...state.database.schemas, preferredSchema]

          return {
            database: {
              ...state.database,
              schemas: nextSchemas,
            },
            tables: [...state.tables, draft],
            selectedTableId: draft.id,
            importWarnings: [],
            lastSavedAt: nowIso(),
          }
        })
      },
      renameTable: (tableId, nextName) => {
        let renamed = false

        set((state) => {
          const normalizedName = normalizeEntityName(nextName)
          if (!normalizedName) {
            return state
          }

          const tableToRename = state.tables.find((table) => table.id === tableId)
          if (!tableToRename) {
            return state
          }

          const duplicatedInSchema = state.tables.some(
            (table) => table.id !== tableId && table.schema === tableToRename.schema && table.name === normalizedName,
          )
          if (duplicatedInSchema) {
            return state
          }

          renamed = true

          return {
            tables: state.tables.map((table) => {
              if (table.id !== tableId) {
                return table
              }

              return {
                ...table,
                name: normalizedName,
              }
            }),
            lastSavedAt: nowIso(),
          }
        })

        return renamed
      },
      duplicateTable: (tableId) => {
        set((state) => {
          const source = state.tables.find((table) => table.id === tableId)
          if (!source) {
            return state
          }

          const duplicatedName = buildUniqueTableNameInSchema(state.tables, source.schema, `${source.name}_copy`)
          const duplicatedTable: TableModel = {
            ...source,
            id: createId('tbl'),
            name: duplicatedName,
            columns: cloneColumns(source.columns),
            position: {
              x: source.position.x + 48,
              y: source.position.y + 48,
            },
          }

          return {
            tables: [...state.tables, duplicatedTable],
            selectedTableId: duplicatedTable.id,
            lastSavedAt: nowIso(),
          }
        })
      },
      moveTableToSchema: (tableId, schemaName) => {
        set((state) => {
          const normalizedSchema = normalizeSchemaName(schemaName)
          const source = state.tables.find((table) => table.id === tableId)
          if (!source) {
            return state
          }

          const movedName = buildUniqueTableNameInSchema(state.tables.filter((table) => table.id !== tableId), normalizedSchema, source.name)
          const schemaExists = state.database.schemas.some((schema) => schema.toLowerCase() === normalizedSchema.toLowerCase())

          return {
            database: {
              ...state.database,
              schemas: schemaExists ? state.database.schemas : [...state.database.schemas, normalizedSchema],
            },
            tables: state.tables.map((table) => {
              if (table.id !== tableId) {
                return table
              }

              return {
                ...table,
                schema: normalizedSchema,
                name: movedName,
              }
            }),
            lastSavedAt: nowIso(),
          }
        })
      },
      updateTable: (tableId, patch) => {
        set((state) => {
          const nextSchema = patch.schema ? normalizeSchemaName(patch.schema) : undefined
          const nextDatabaseSchemas =
            nextSchema && !state.database.schemas.some((schema) => schema.toLowerCase() === nextSchema.toLowerCase())
              ? [...state.database.schemas, nextSchema]
              : state.database.schemas

          return {
            database: {
              ...state.database,
              schemas: nextDatabaseSchemas,
            },
            tables: state.tables.map((table) => {
              if (table.id !== tableId) {
                return table
              }

              return {
                ...table,
                ...patch,
                schema: nextSchema ?? table.schema,
              }
            }),
            lastSavedAt: nowIso(),
          }
        })
      },
      deleteTable: (tableId) => {
        set((state) => {
          const nextTables = state.tables.filter((table) => table.id !== tableId)
          const nextRelations = state.relations.filter(
            (relation) => relation.sourceTableId !== tableId && relation.targetTableId !== tableId,
          )

          const selectedTableId =
            state.selectedTableId === tableId ? (nextTables.length > 0 ? nextTables[0].id : null) : state.selectedTableId

          return {
            database: sanitizeDatabase(state.database, nextTables),
            tables: nextTables,
            relations: nextRelations,
            selectedTableId,
            importWarnings: [],
            lastSavedAt: nowIso(),
          }
        })
      },
      addColumn: (tableId) => {
        set((state) => ({
          tables: state.tables.map((table) => {
            if (table.id !== tableId) {
              return table
            }

            const column = createDefaultColumn(buildUniqueColumnName(table))

            return {
              ...table,
              columns: [...table.columns, column],
            }
          }),
          lastSavedAt: nowIso(),
        }))
      },
      updateColumn: (tableId, columnId, patch) => {
        set((state) => ({
          tables: state.tables.map((table) => {
            if (table.id !== tableId) {
              return table
            }

            return {
              ...table,
              columns: table.columns.map((column) => {
                if (column.id !== columnId) {
                  return column
                }

                const merged = {
                  ...column,
                  ...patch,
                }

                if (merged.type === 'serial' || merged.type === 'bigserial') {
                  merged.autoIncrement = true
                  merged.nullable = false
                }

                if (merged.isPrimary) {
                  merged.nullable = false
                }

                return merged
              }),
            }
          }),
          lastSavedAt: nowIso(),
        }))
      },
      deleteColumn: (tableId, columnId) => {
        set((state) => ({
          tables: state.tables.map((table) => {
            if (table.id !== tableId) {
              return table
            }

            return {
              ...table,
              columns: table.columns.filter((column) => column.id !== columnId),
            }
          }),
          relations: dropRelationsForMissingColumns(state.relations, tableId, columnId),
          lastSavedAt: nowIso(),
        }))
      },
      addRelation: (input) => {
        set((state) => {
          const sourceTable = findTableById(state.tables, input.sourceTableId)
          const sourceColumn = sourceTable?.columns.find((column) => column.id === input.sourceColumnId)

          if (!sourceTable || !sourceColumn) {
            return state
          }

          const exists = state.relations.some(
            (relation) =>
              relation.sourceTableId === input.sourceTableId &&
              relation.sourceColumnId === input.sourceColumnId &&
              relation.targetTableId === input.targetTableId &&
              relation.targetColumnId === input.targetColumnId,
          )

          if (exists) {
            return state
          }

          const baseConstraint = createDefaultRelationName(sourceTable.name, sourceColumn.name)
          const relation = createDefaultRelation(
            input.sourceTableId,
            input.sourceColumnId,
            input.targetTableId,
            input.targetColumnId,
            buildUniqueConstraintName(state.relations, baseConstraint),
          )

          return {
            relations: [...state.relations, relation],
            importWarnings: [],
            lastSavedAt: nowIso(),
          }
        })
      },
      updateRelation: (relationId, patch) => {
        set((state) => ({
          relations: state.relations.map((relation) => {
            if (relation.id !== relationId) {
              return relation
            }

            return {
              ...relation,
              ...patch,
            }
          }),
          lastSavedAt: nowIso(),
        }))
      },
      deleteRelation: (relationId) => {
        set((state) => ({
          relations: state.relations.filter((relation) => relation.id !== relationId),
          lastSavedAt: nowIso(),
        }))
      },
      setTablePosition: (tableId, x, y) => {
        set((state) => ({
          tables: state.tables.map((table) => {
            if (table.id !== tableId) {
              return table
            }

            return {
              ...table,
              position: {
                x,
                y,
              },
            }
          }),
          lastSavedAt: nowIso(),
        }))
      },
      importSql: (sql) => {
        const result = parseSqlSchema(sql)

        if (result.parsedEntities === 0) {
          set({
            importWarnings: result.warnings,
          })
          return false
        }

        set({
          database: sanitizeDatabase(result.database, result.tables),
          tables: result.tables,
          relations: result.relations,
          selectedTableId: result.tables[0]?.id ?? null,
          importWarnings: result.warnings,
          lastSavedAt: nowIso(),
        })

        return true
      },
      applyTemplate: (templateId) => {
        const template = getTemplateById(templateId)
        if (!template) {
          return false
        }

        const result = parseSqlSchema(template.sql)
        if (result.parsedEntities === 0) {
          return false
        }

        set({
          database: sanitizeDatabase(result.database, result.tables),
          tables: result.tables,
          relations: result.relations,
          selectedTableId: result.tables[0]?.id ?? null,
          importWarnings: result.warnings,
          lastSavedAt: nowIso(),
        })

        return true
      },
      replaceProject: (database, tables, relations) => {
        set({
          database: sanitizeDatabase(database, tables),
          tables,
          relations,
          selectedTableId: tables[0]?.id ?? null,
          importWarnings: [],
          lastSavedAt: nowIso(),
        })
      },
      clearProject: () => {
        set({
          database: createDefaultDatabase(),
          tables: [],
          relations: [],
          selectedTableId: null,
          importWarnings: [],
          lastSavedAt: nowIso(),
        })
      },
      clearWarnings: () => {
        set({ importWarnings: [] })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        database: state.database,
        tables: state.tables,
        relations: state.relations,
        selectedTableId: state.selectedTableId,
      }),
      merge: (persistedState, currentState) => {
        const parsed = persistedState as Partial<SchemaStore>
        const persistedTables = parsed.tables ?? currentState.tables

        return {
          ...currentState,
          database: sanitizeDatabase(parsed.database ?? currentState.database, persistedTables),
          tables: persistedTables,
          relations: parsed.relations ?? currentState.relations,
          selectedTableId: parsed.selectedTableId ?? currentState.selectedTableId,
          importWarnings: [],
          lastSavedAt: nowIso(),
        }
      },
    },
  ),
)

export function useSelectedTable(): TableModel | null {
  return useSchemaStore((state) => {
    if (!state.selectedTableId) {
      return null
    }

    return state.tables.find((table) => table.id === state.selectedTableId) ?? null
  })
}
