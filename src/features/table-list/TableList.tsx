import { Trash2 } from 'lucide-react'
import clsx from 'clsx'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './TableList.module.scss'

export function TableList() {
  const tables = useSchemaStore((state) => state.tables)
  const selectedTableId = useSchemaStore((state) => state.selectedTableId)
  const selectTable = useSchemaStore((state) => state.selectTable)
  const deleteTable = useSchemaStore((state) => state.deleteTable)

  return (
    <Card className={styles.tableList} title="Tabelle" subtitle="Gestisci schema e nomi tabella.">
      {tables.length === 0 ? (
        <EmptyState title="Nessuna tabella" body="Aggiungi una nuova tabella dalla toolbar per iniziare." />
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
                <Badge>{table.columns.length} colonne</Badge>
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
