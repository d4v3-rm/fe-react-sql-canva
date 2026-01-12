import clsx from 'clsx'
import { Database, FolderTree, Plus, Search, Table2, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './DatabaseExplorer.module.scss'

interface SchemaGroup {
  schema: string
  tables: Array<{
    id: string
    name: string
    schema: string
    columnCount: number
  }>
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

function sortBySchema(items: SchemaGroup[]): SchemaGroup[] {
  return [...items].sort((a, b) => a.schema.localeCompare(b.schema))
}

export function DatabaseExplorer() {
  const [query, setQuery] = useState('')

  const database = useSchemaStore((state) => state.database)
  const tables = useSchemaStore((state) => state.tables)
  const selectedTableId = useSchemaStore((state) => state.selectedTableId)
  const selectTable = useSchemaStore((state) => state.selectTable)
  const addTable = useSchemaStore((state) => state.addTable)
  const addTableInSchema = useSchemaStore((state) => state.addTableInSchema)
  const deleteTable = useSchemaStore((state) => state.deleteTable)

  const normalizedQuery = query.trim().toLowerCase()

  const schemaGroups = useMemo<SchemaGroup[]>(() => {
    const tableBySchema = new Map<string, SchemaGroup['tables']>()

    sortByName(tables).forEach((table) => {
      const tableEntry = {
        id: table.id,
        name: table.name,
        schema: table.schema,
        columnCount: table.columns.length,
      }

      const current = tableBySchema.get(table.schema) ?? []
      current.push(tableEntry)
      tableBySchema.set(table.schema, current)
    })

    return sortBySchema(database.schemas.map((schema) => ({ schema, tables: sortByName(tableBySchema.get(schema) ?? []) })))
  }, [database.schemas, tables])

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) {
      return schemaGroups
    }

    return schemaGroups
      .map((group) => {
        const schemaMatch = group.schema.toLowerCase().includes(normalizedQuery)
        const filteredTables = schemaMatch
          ? group.tables
          : group.tables.filter((table) => table.name.toLowerCase().includes(normalizedQuery))

        return {
          ...group,
          tables: filteredTables,
        }
      })
      .filter((group) => group.tables.length > 0 || group.schema.toLowerCase().includes(normalizedQuery))
  }, [normalizedQuery, schemaGroups])

  return (
    <Card className={styles.explorer} title="Database Explorer" subtitle="Naviga database, schemi e tabelle in modo gerarchico.">
      <div className={styles.topRow}>
        <label className={styles.searchField}>
          <Search size={14} />
          <input
            placeholder="Cerca schema o tabella"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <Button compact onClick={addTable}>
          <Plus size={12} />
          Tabella
        </Button>
      </div>

      <button
        className={clsx(styles.databaseRoot, selectedTableId === null && styles.selectedRoot)}
        onClick={() => selectTable(null)}
        type="button"
      >
        <div className={styles.rootInfo}>
          <Database size={15} />
          <strong>{database.name}</strong>
        </div>
        <Badge>{tables.length} tabelle</Badge>
      </button>

      {filteredGroups.length === 0 ? (
        <EmptyState title="Nessun risultato" body="Nessuno schema o tabella corrisponde al filtro corrente." />
      ) : (
        <div className={styles.tree}>
          {filteredGroups.map((group) => (
            <section key={group.schema} className={styles.schemaBlock}>
              <header>
                <div className={styles.schemaInfo}>
                  <FolderTree size={14} />
                  <strong>{group.schema}</strong>
                  <Badge>{group.tables.length}</Badge>
                </div>

                <Button compact onClick={() => addTableInSchema(group.schema)}>
                  <Plus size={11} />
                </Button>
              </header>

              {group.tables.length === 0 ? (
                <p className={styles.emptySchema}>Nessuna tabella nello schema.</p>
              ) : (
                <div className={styles.tableRows}>
                  {group.tables.map((table) => (
                    <button
                      key={table.id}
                      className={clsx(styles.tableRow, selectedTableId === table.id && styles.selectedTable)}
                      onClick={() => selectTable(table.id)}
                      type="button"
                    >
                      <div className={styles.tableInfo}>
                        <Table2 size={13} />
                        <span>{table.name}</span>
                      </div>

                      <div className={styles.tableActions}>
                        <Badge>{table.columnCount}</Badge>
                        <Button
                          variant="danger"
                          compact
                          onClick={(event) => {
                            event.stopPropagation()
                            deleteTable(table.id)
                          }}
                        >
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}
