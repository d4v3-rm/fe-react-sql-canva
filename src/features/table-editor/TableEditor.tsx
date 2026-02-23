import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { DATA_TYPES, type ColumnModel, type DataType } from '@/domain/schema'
import { useSchemaStore, useSelectedTable } from '@/store/schemaStore'

import { RelationManager } from './RelationManager'
import styles from './TableEditor.module.scss'

function parseNumeric(value: string): number | undefined {
  if (!value.trim()) {
    return undefined
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }

  return Math.floor(parsed)
}

function typePatch(column: ColumnModel, nextType: DataType): Partial<ColumnModel> {
  const patch: Partial<ColumnModel> = {
    type: nextType,
  }

  if (nextType !== 'varchar' && nextType !== 'numeric') {
    patch.length = undefined
  }

  if (nextType !== 'numeric') {
    patch.scale = undefined
  }

  if (nextType === 'varchar' && !column.length) {
    patch.length = 255
  }

  if (nextType === 'serial' || nextType === 'bigserial') {
    patch.autoIncrement = true
    patch.nullable = false
  }

  if (column.type === 'serial' || column.type === 'bigserial') {
    if (nextType !== 'serial' && nextType !== 'bigserial') {
      patch.autoIncrement = false
    }
  }

  return patch
}

interface TableEditorProps {
  showRelations?: boolean
}

export function TableEditor({ showRelations = true }: TableEditorProps) {
  const selectedTable = useSelectedTable()
  const databaseSchemas = useSchemaStore((state) => state.database.schemas)
  const updateTable = useSchemaStore((state) => state.updateTable)
  const addColumn = useSchemaStore((state) => state.addColumn)
  const updateColumn = useSchemaStore((state) => state.updateColumn)
  const deleteColumn = useSchemaStore((state) => state.deleteColumn)

  if (!selectedTable) {
    return (
      <Card title="Table editor" subtitle="Select a table from the canvas or list.">
        <EmptyState
          title="No table selected"
          body="When you select a table you can edit columns, types, and relations in detail."
        />
      </Card>
    )
  }

  return (
    <div className={styles.editorStack}>
      <Card title="Table editor" subtitle="Complete metadata and column definition.">
        <div className={styles.metaGrid}>
          <Field label="Schema">
            <input
              list="database-schema-options"
              value={selectedTable.schema}
              onChange={(event) => updateTable(selectedTable.id, { schema: event.target.value })}
              placeholder="public"
            />
            <datalist id="database-schema-options">
              {databaseSchemas.map((schemaName) => (
                <option key={schemaName} value={schemaName} />
              ))}
            </datalist>
          </Field>

          <Field label="Table name">
            <input
              value={selectedTable.name}
              onChange={(event) => updateTable(selectedTable.id, { name: event.target.value })}
              placeholder="users"
            />
          </Field>
        </div>

        <div className={styles.columnsHeader}>
          <h4>Columns</h4>
          <Button compact onClick={() => addColumn(selectedTable.id)}>
            <Plus size={13} />
            Add column
          </Button>
        </div>

        <div className={styles.columnsList}>
          {selectedTable.columns.map((column, index) => {
            const isLengthEnabled = column.type === 'varchar' || column.type === 'numeric'
            const isScaleEnabled = column.type === 'numeric'

            return (
              <article key={column.id} className={styles.columnCard}>
                <div className={styles.columnCardHeader}>
                  <strong>Column {index + 1}</strong>
                  <Button variant="danger" compact onClick={() => deleteColumn(selectedTable.id, column.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>

                <div className={styles.columnGrid}>
                  <Field label="Nome">
                    <input
                      value={column.name}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, { name: event.target.value })}
                    />
                  </Field>

                  <Field label="Tipo">
                    <select
                      value={column.type}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, typePatch(column, event.target.value as DataType))}
                    >
                      {DATA_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Length">
                    <input
                      disabled={!isLengthEnabled}
                      value={column.length ?? ''}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, { length: parseNumeric(event.target.value) })}
                    />
                  </Field>

                  <Field label="Scale">
                    <input
                      disabled={!isScaleEnabled}
                      value={column.scale ?? ''}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, { scale: parseNumeric(event.target.value) })}
                    />
                  </Field>

                  <Field label="Default">
                    <input
                      value={column.defaultValue}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, { defaultValue: event.target.value })}
                      placeholder="NOW()"
                    />
                  </Field>
                </div>

                <div className={styles.flags}>
                  <label>
                    <input
                      checked={column.nullable}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, { nullable: event.target.checked })}
                      type="checkbox"
                    />
                    Nullable
                  </label>

                  <label>
                    <input
                      checked={column.isPrimary}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, { isPrimary: event.target.checked })}
                      type="checkbox"
                    />
                    Primary Key
                  </label>

                  <label>
                    <input
                      checked={column.isUnique}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, { isUnique: event.target.checked })}
                      type="checkbox"
                    />
                    Unique
                  </label>

                  <label>
                    <input
                      checked={column.autoIncrement}
                      onChange={(event) => updateColumn(selectedTable.id, column.id, { autoIncrement: event.target.checked })}
                      type="checkbox"
                      disabled={column.type !== 'serial' && column.type !== 'bigserial'}
                    />
                    Auto Increment
                  </label>
                </div>
              </article>
            )
          })}
        </div>
      </Card>

      {showRelations ? <RelationManager tableId={selectedTable.id} /> : null}
    </div>
  )
}
