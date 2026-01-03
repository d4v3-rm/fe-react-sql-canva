import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { createDefaultColumn, createDefaultRelation, createDefaultRelationName, createDefaultTable } from '@/domain/defaults'
import type { ColumnModel, ForeignKeyAction, RelationModel, TableModel } from '@/domain/schema'
import { ensureUniqueName, findTableById } from '@/lib/schemaHelpers'
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

interface SchemaStore {
  tables: TableModel[]
  relations: RelationModel[]
  selectedTableId: string | null
  importWarnings: string[]
  lastSavedAt: string
  selectTable: (tableId: string | null) => void
  addTable: () => void
  updateTable: (tableId: string, patch: Partial<Pick<TableModel, 'schema' | 'name'>>) => void
  deleteTable: (tableId: string) => void
  addColumn: (tableId: string) => void
  updateColumn: (tableId: string, columnId: string, patch: Partial<ColumnModel>) => void
  deleteColumn: (tableId: string, columnId: string) => void
  addRelation: (input: AddRelationInput) => void
  updateRelation: (relationId: string, patch: UpdateRelationInput) => void
  deleteRelation: (relationId: string) => void
  setTablePosition: (tableId: string, x: number, y: number) => void
  importSql: (sql: string) => void
  replaceProject: (tables: TableModel[], relations: RelationModel[]) => void
  clearProject: () => void
  clearWarnings: () => void
}

function nowIso(): string {
  return new Date().toISOString()
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

export const useSchemaStore = create<SchemaStore>()(
  persist(
    (set) => ({
      tables: [],
      relations: [],
      selectedTableId: null,
      importWarnings: [],
      lastSavedAt: nowIso(),
      selectTable: (tableId) => {
        set({ selectedTableId: tableId })
      },
      addTable: () => {
        set((state) => {
          const draft = createDefaultTable(state.tables.length + 1)
          draft.name = buildUniqueTableName(state.tables)

          return {
            tables: [...state.tables, draft],
            selectedTableId: draft.id,
            importWarnings: [],
            lastSavedAt: nowIso(),
          }
        })
      },
      updateTable: (tableId, patch) => {
        set((state) => ({
          tables: state.tables.map((table) => {
            if (table.id !== tableId) {
              return table
            }

            return {
              ...table,
              ...patch,
            }
          }),
          lastSavedAt: nowIso(),
        }))
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

        if (result.tables.length === 0) {
          set({
            importWarnings: result.warnings,
          })
          return
        }

        set({
          tables: result.tables,
          relations: result.relations,
          selectedTableId: result.tables[0]?.id ?? null,
          importWarnings: result.warnings,
          lastSavedAt: nowIso(),
        })
      },
      replaceProject: (tables, relations) => {
        set({
          tables,
          relations,
          selectedTableId: tables[0]?.id ?? null,
          importWarnings: [],
          lastSavedAt: nowIso(),
        })
      },
      clearProject: () => {
        set({
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
        tables: state.tables,
        relations: state.relations,
        selectedTableId: state.selectedTableId,
      }),
      merge: (persistedState, currentState) => {
        const parsed = persistedState as Partial<SchemaStore>

        return {
          ...currentState,
          tables: parsed.tables ?? currentState.tables,
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
