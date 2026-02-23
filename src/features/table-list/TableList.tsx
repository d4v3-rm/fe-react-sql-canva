import { Trash2 } from 'lucide-react'
import clsx from 'clsx'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './TableList.module.scss'

export function TableList() {
  const database = useSchemaStore((state) => state.database)
  const tables = useSchemaStore((state) => state.tables)
  const selectedTableId = useSchemaStore((state) => state.selectedTableId)
  const selectTable = useSchemaStore((state) => state.selectTable)
  const deleteTable = useSchemaStore((state) => state.deleteTable)

  return (
    <Card
      className={styles.tableList}
      title="Tables"
      subtitle={`${database.schemas.length} schemas | ${tables.length} tables in ${database.name}`}
    >
      {tables.length === 0 ? (
        <EmptyState title="No tables" body="Add a new table from the toolbar to get started." />
      ) : (
        <div className={styles.items}>
          {tables.map((table) => (
            <button
              key={table.id}
              className={clsx(styles.item, selectedTableId === table.id && styles.selected)}
              onClick={() => selectTable(table.id)}
              type="button"
            >
              <div className={styles.itemInfo}>
                <strong>{table.name}</strong>
                <span>{table.schema}</span>
              </div>
              <div className={styles.itemActions}>
                <Badge>{table.columns.length} columns</Badge>
                <Button
                  variant="danger"
                  compact
                  onClick={(event) => {
                    event.stopPropagation()
                    deleteTable(table.id)
                  }}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
