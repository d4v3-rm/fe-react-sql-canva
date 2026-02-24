import { Trash2 } from 'lucide-react'
import clsx from 'clsx'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { t } from '@/i18n'
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
      title={t('tableList.title')}
      subtitle={t('tableList.subtitle', {
        schemaCount: database.schemas.length,
        tableCount: tables.length,
        databaseName: database.name,
      })}
    >
      {tables.length === 0 ? (
        <EmptyState title={t('tableList.emptyTitle')} body={t('tableList.emptyBody')} />
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
                <Badge>{t('tableList.columns', { count: table.columns.length })}</Badge>
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

