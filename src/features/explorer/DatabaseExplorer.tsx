import clsx from 'clsx'
import { ArrowRightLeft, Copy, Database, FolderPlus, FolderTree, MoreHorizontal, Pencil, Plus, Search, Table2, Trash2 } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './DatabaseExplorer.module.scss'

interface ExplorerTable {
  id: string
  name: string
  schema: string
  columnCount: number
}

interface SchemaGroup {
  schema: string
  tables: ExplorerTable[]
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

function sortBySchema(items: SchemaGroup[]): SchemaGroup[] {
  return [...items].sort((a, b) => a.schema.localeCompare(b.schema))
}

export function DatabaseExplorer() {
  const [query, setQuery] = useState('')
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null)
  const [dropSchema, setDropSchema] = useState<string | null>(null)
  const [openMenuTableId, setOpenMenuTableId] = useState<string | null>(null)

  const database = useSchemaStore((state) => state.database)
  const tables = useSchemaStore((state) => state.tables)
  const selectedTableId = useSchemaStore((state) => state.selectedTableId)
  const selectTable = useSchemaStore((state) => state.selectTable)
  const addTable = useSchemaStore((state) => state.addTable)
  const addSchema = useSchemaStore((state) => state.addSchema)
  const addTableInSchema = useSchemaStore((state) => state.addTableInSchema)
  const deleteTable = useSchemaStore((state) => state.deleteTable)
  const renameTable = useSchemaStore((state) => state.renameTable)
  const duplicateTable = useSchemaStore((state) => state.duplicateTable)
  const moveTableToSchema = useSchemaStore((state) => state.moveTableToSchema)

  const normalizedQuery = query.trim().toLowerCase()

  const tableMap = useMemo(() => new Map(tables.map((table) => [table.id, table])), [tables])

  const schemaGroups = useMemo<SchemaGroup[]>(() => {
    const tableBySchema = new Map<string, SchemaGroup['tables']>()

    sortByName(tables).forEach((table) => {
      const tableEntry: ExplorerTable = {
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

  function closeContextMenu() {
    setOpenMenuTableId(null)
  }

  function handleRenameTable(tableId: string) {
    closeContextMenu()

    const table = tableMap.get(tableId)
    if (!table) {
      return
    }

    const nextName = window.prompt('Nuovo nome tabella', table.name)
    if (!nextName || nextName === table.name) {
      return
    }

    const success = renameTable(tableId, nextName)
    if (!success) {
      window.alert('Impossibile rinominare: esiste già una tabella con questo nome nello stesso schema.')
    }
  }

  function handleDuplicateTable(tableId: string) {
    closeContextMenu()
    duplicateTable(tableId)
  }

  function handleMoveTable(tableId: string) {
    closeContextMenu()

    const table = tableMap.get(tableId)
    if (!table) {
      return
    }

    const nextSchema = window.prompt(
      `Sposta tabella nello schema (disponibili: ${database.schemas.join(', ')})`,
      table.schema,
    )

    if (!nextSchema || nextSchema.trim() === table.schema) {
      return
    }

    moveTableToSchema(tableId, nextSchema)
  }

  function handleDeleteTable(tableId: string) {
    closeContextMenu()

    const table = tableMap.get(tableId)
    const confirmed = window.confirm(`Eliminare la tabella ${table?.schema}.${table?.name}?`)
    if (confirmed) {
      deleteTable(tableId)
    }
  }

  function handleAddSchema() {
    const suggestedSchema = `schema_${database.schemas.length + 1}`
    const nextSchema = window.prompt('Nome nuovo schema PostgreSQL', suggestedSchema)
    if (!nextSchema) {
      return
    }

    const success = addSchema(nextSchema)
    if (!success) {
      window.alert('Schema gia esistente o nome non valido.')
    }
  }

  function handleTableDragStart(tableId: string, event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData('application/x-sql-canvas-table', tableId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingTableId(tableId)
    setOpenMenuTableId(null)
  }

  function handleSchemaDragOver(schemaName: string, event: DragEvent<HTMLElement>) {
    if (!draggingTableId) {
      return
    }

    const draggedTable = tableMap.get(draggingTableId)
    if (!draggedTable || draggedTable.schema === schemaName) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropSchema(schemaName)
  }

  function handleSchemaDragLeave(schemaName: string, event: DragEvent<HTMLElement>) {
    const currentTarget = event.currentTarget
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && currentTarget.contains(nextTarget)) {
      return
    }

    if (dropSchema === schemaName) {
      setDropSchema(null)
    }
  }

  function handleSchemaDrop(schemaName: string, event: DragEvent<HTMLElement>) {
    event.preventDefault()

    const transferredTableId = event.dataTransfer.getData('application/x-sql-canvas-table')
    const tableId = transferredTableId || draggingTableId
    if (!tableId) {
      setDropSchema(null)
      return
    }

    const draggedTable = tableMap.get(tableId)
    if (!draggedTable || draggedTable.schema === schemaName) {
      setDropSchema(null)
      setDraggingTableId(null)
      return
    }

    moveTableToSchema(tableId, schemaName)
    setDropSchema(null)
    setDraggingTableId(null)
  }

  function handleTableDragEnd() {
    setDraggingTableId(null)
    setDropSchema(null)
  }

  return (
    <section className={styles.explorer}>
      <p className={styles.explorerIntro}>Naviga database, schemi e tabelle in modo gerarchico.</p>
      <div className={styles.topRow}>
        <label className={styles.searchField}>
          <Search size={14} />
          <input
            placeholder="Cerca schema o tabella"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className={styles.topActions}>
          <Button compact variant="ghost" onClick={handleAddSchema}>
            <FolderPlus size={12} />
            Schema
          </Button>

          <Button compact onClick={addTable}>
            <Plus size={12} />
            Tabella
          </Button>
        </div>
      </div>

      <button
        className={clsx(styles.databaseRoot, selectedTableId === null && styles.selectedRoot)}
        onClick={() => {
          selectTable(null)
          closeContextMenu()
        }}
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
            <section
              key={group.schema}
              className={clsx(styles.schemaBlock, dropSchema === group.schema && styles.schemaDropTarget)}
              onDragOver={(event) => handleSchemaDragOver(group.schema, event)}
              onDragLeave={(event) => handleSchemaDragLeave(group.schema, event)}
              onDrop={(event) => handleSchemaDrop(group.schema, event)}
            >
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
                <p className={styles.emptySchema}>Trascina qui una tabella oppure creane una nuova.</p>
              ) : (
                <div className={styles.tableRows}>
                  {group.tables.map((table) => (
                    <div
                      key={table.id}
                      className={clsx(
                        styles.tableRow,
                        selectedTableId === table.id && styles.selectedTable,
                        draggingTableId === table.id && styles.draggingTable,
                      )}
                      draggable
                      onDragStart={(event) => handleTableDragStart(table.id, event)}
                      onDragEnd={handleTableDragEnd}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        selectTable(table.id)
                        setOpenMenuTableId(table.id)
                      }}
                    >
                      <button
                        className={styles.tableSelect}
                        onClick={() => {
                          selectTable(table.id)
                          closeContextMenu()
                        }}
                        type="button"
                      >
                        <div className={styles.tableInfo}>
                          <Table2 size={13} />
                          <span>{table.name}</span>
                        </div>
                      </button>

                      <div className={styles.tableActions}>
                        <Badge>{table.columnCount}</Badge>
                        <button
                          className={styles.menuTrigger}
                          onClick={(event) => {
                            event.stopPropagation()
                            setOpenMenuTableId((current) => (current === table.id ? null : table.id))
                          }}
                          type="button"
                        >
                          <MoreHorizontal size={13} />
                        </button>

                        {openMenuTableId === table.id ? (
                          <div className={styles.contextMenu}>
                            <button onClick={() => handleRenameTable(table.id)} type="button">
                              <Pencil size={12} />
                              Rinomina
                            </button>
                            <button onClick={() => handleDuplicateTable(table.id)} type="button">
                              <Copy size={12} />
                              Duplica
                            </button>
                            <button onClick={() => handleMoveTable(table.id)} type="button">
                              <ArrowRightLeft size={12} />
                              Sposta
                            </button>
                            <button className={styles.dangerAction} onClick={() => handleDeleteTable(table.id)} type="button">
                              <Trash2 size={12} />
                              Elimina
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
