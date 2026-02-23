import clsx from 'clsx'
import {
  ArrowRightLeft,
  Command,
  Copy,
  Database,
  FileUp,
  FolderPlus,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Table2,
  Trash2,
} from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel'
import { useDialog } from '@/components/ui/dialog/useDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { readTextFile } from '@/lib/file/textFile'
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

interface DatabaseExplorerProps {
  onOpenCommandPalette: () => void
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

function sortBySchema(items: SchemaGroup[]): SchemaGroup[] {
  return [...items].sort((a, b) => a.schema.localeCompare(b.schema))
}

export function DatabaseExplorer({ onOpenCommandPalette }: DatabaseExplorerProps) {
  const [query, setQuery] = useState('')
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null)
  const [dropSchema, setDropSchema] = useState<string | null>(null)
  const [openMenuTableId, setOpenMenuTableId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const hiddenInputRef = useRef<HTMLInputElement>(null)

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
  const importSql = useSchemaStore((state) => state.importSql)
  const clearProject = useSchemaStore((state) => state.clearProject)
  const clearWarnings = useSchemaStore((state) => state.clearWarnings)
  const warnings = useSchemaStore((state) => state.importWarnings)
  const lastSavedAt = useSchemaStore((state) => state.lastSavedAt)
  const { alert, confirm, prompt } = useDialog()

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

    void (async () => {
      const table = tableMap.get(tableId)
      if (!table) {
        return
      }

      const nextName = await prompt({
        title: `Rename ${table.schema}.${table.name}`,
        message: 'Enter the new table name.',
        defaultValue: table.name,
        placeholder: 'users',
        confirmLabel: 'Rename',
      })

      if (!nextName || nextName.trim() === '' || nextName === table.name) {
        return
      }

      const success = renameTable(tableId, nextName)
      if (success) {
        return
      }

      await alert({
        title: 'Rename unavailable',
        message: 'A table with this name already exists in the same schema.',
        confirmLabel: 'Close',
      })
    })()
  }

  function handleDuplicateTable(tableId: string) {
    closeContextMenu()
    duplicateTable(tableId)
  }

  function handleMoveTable(tableId: string) {
    closeContextMenu()

    void (async () => {
      const table = tableMap.get(tableId)
      if (!table) {
        return
      }

      const nextSchema = await prompt({
        title: `Move ${table.name} to another schema`,
        message: `Available schemas: ${database.schemas.join(', ')}`,
        defaultValue: table.schema,
        placeholder: 'public',
        confirmLabel: 'Move',
      })

      if (!nextSchema || nextSchema.trim() === '' || nextSchema.trim() === table.schema) {
        return
      }

      moveTableToSchema(tableId, nextSchema)
    })()
  }

  function handleDeleteTable(tableId: string) {
    closeContextMenu()

    void (async () => {
      const table = tableMap.get(tableId)
      const confirmed = await confirm({
        title: 'Delete table',
        message: `Delete table ${table?.schema}.${table?.name}?`,
        confirmLabel: 'Delete',
        tone: 'danger',
      })

      if (confirmed) {
        deleteTable(tableId)
      }
    })()
  }

  function handleAddSchema() {
    void (async () => {
      const suggestedSchema = `schema_${database.schemas.length + 1}`
      const nextSchema = await prompt({
        title: 'New PostgreSQL schema',
        defaultValue: suggestedSchema,
        placeholder: 'public',
        confirmLabel: 'Create schema',
      })

      if (!nextSchema || nextSchema.trim() === '') {
        return
      }

      const success = addSchema(nextSchema)
      if (success) {
        return
      }

      await alert({
        title: 'Invalid schema',
        message: 'Schema already exists or the name is invalid.',
        confirmLabel: 'Close',
      })
    })()
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

  function handleOpenImportDialog() {
    hiddenInputRef.current?.click()
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setImporting(true)
    clearWarnings()

    try {
      const sql = await readTextFile(file)
      importSql(sql)
    } finally {
      setImporting(false)
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = ''
      }
    }
  }

  async function handleResetProject() {
    const confirmed = await confirm({
      title: 'New empty project',
      message: 'Create a new empty project? Current data will be removed.',
      confirmLabel: 'Create project',
      tone: 'danger',
    })

    if (confirmed) {
      clearProject()
    }
  }

  return (
    <section className={styles.explorer}>
      <CollapsiblePanel title="Workspace" subtitle="Project actions and SQL import." defaultOpen={false}>
        <div className={styles.workspaceButtons}>
          <Button compact onClick={addTable}>
            <Plus size={12} />
            New table
          </Button>

          <Button compact variant="ghost" onClick={handleAddSchema}>
            <FolderPlus size={12} />
            New schema
          </Button>

          <Button compact variant="ghost" onClick={handleOpenImportDialog} disabled={importing}>
            <FileUp size={12} />
            {importing ? 'Importing...' : 'Import SQL'}
          </Button>

          <Button compact variant="ghost" onClick={onOpenCommandPalette}>
            <Command size={12} />
            Commands
          </Button>

          <Button compact variant="danger" onClick={() => void handleResetProject()}>
            <RotateCcw size={12} />
            New project
          </Button>
        </div>

        <div className={styles.workspaceMeta}>
          <p>Last saved: {new Date(lastSavedAt).toLocaleTimeString('en-US')}</p>
          {warnings.length > 0 ? <Badge tone="warning">Import warnings: {warnings.length}</Badge> : null}
        </div>
      </CollapsiblePanel>

      <p className={styles.explorerIntro}>Browse databases, schemas, and tables in a hierarchical view.</p>
      <div className={styles.topRow}>
        <label className={styles.searchField}>
          <Search size={14} />
          <input
            placeholder="Search schema or table"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
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
        <Badge>{tables.length} tables</Badge>
      </button>

      {filteredGroups.length === 0 ? (
        <EmptyState title="No results" body="No schema or table matches the current filter." />
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
                <p className={styles.emptySchema}>Drag a table here or create a new one.</p>
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
                              Rename
                            </button>
                            <button onClick={() => handleDuplicateTable(table.id)} type="button">
                              <Copy size={12} />
                              Duplicate
                            </button>
                            <button onClick={() => handleMoveTable(table.id)} type="button">
                              <ArrowRightLeft size={12} />
                              Move
                            </button>
                            <button className={styles.dangerAction} onClick={() => handleDeleteTable(table.id)} type="button">
                              <Trash2 size={12} />
                              Delete
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

      <input
        ref={hiddenInputRef}
        className={styles.hiddenInput}
        type="file"
        accept=".sql,.txt"
        onChange={handleImportFile}
      />
    </section>
  )
}
