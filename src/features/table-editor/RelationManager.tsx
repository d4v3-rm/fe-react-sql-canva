import { useMemo, useState } from 'react'
import { Link2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { t } from '@/i18n'
import { FK_ACTIONS } from '@/domain/schema'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './RelationManager.module.scss'

interface RelationManagerProps {
  tableId: string
}

export function RelationManager({ tableId }: RelationManagerProps) {
  const tables = useSchemaStore((state) => state.tables)
  const relations = useSchemaStore((state) => state.relations)
  const addRelation = useSchemaStore((state) => state.addRelation)
  const deleteRelation = useSchemaStore((state) => state.deleteRelation)
  const updateRelation = useSchemaStore((state) => state.updateRelation)

  const sourceTable = useMemo(() => tables.find((table) => table.id === tableId), [tables, tableId])
  const targetTables = useMemo(() => tables.filter((table) => table.id !== tableId), [tables, tableId])

  const [sourceColumnId, setSourceColumnId] = useState('')
  const [targetTableId, setTargetTableId] = useState('')
  const [targetColumnId, setTargetColumnId] = useState('')

  if (!sourceTable) {
    return null
  }

  const safeSourceColumnId = sourceTable.columns.some((column) => column.id === sourceColumnId)
    ? sourceColumnId
    : (sourceTable.columns[0]?.id ?? '')
  const safeTargetTableId = targetTables.some((table) => table.id === targetTableId)
    ? targetTableId
    : (targetTables[0]?.id ?? '')
  const selectedTargetTable = targetTables.find((table) => table.id === safeTargetTableId)
  const safeTargetColumnId = selectedTargetTable?.columns.some((column) => column.id === targetColumnId)
    ? targetColumnId
    : (selectedTargetTable?.columns[0]?.id ?? '')

  const sourceRelations = relations.filter((relation) => relation.sourceTableId === tableId)

  const handleAddRelation = () => {
    if (!safeSourceColumnId || !safeTargetTableId || !safeTargetColumnId) {
      return
    }

    addRelation({
      sourceTableId: tableId,
      sourceColumnId: safeSourceColumnId,
      targetTableId: safeTargetTableId,
      targetColumnId: safeTargetColumnId,
    })
  }

  return (
    <Card title={t('relationManager.title')} subtitle={t('relationManager.subtitle')}>
      <div className={styles.createRelation}>
        <Field label={t('relationManager.sourceColumn')}>
          <select value={safeSourceColumnId} onChange={(event) => setSourceColumnId(event.target.value)}>
            {sourceTable.columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('relationManager.targetTable')}>
          <select
            value={safeTargetTableId}
            onChange={(event) => {
              setTargetTableId(event.target.value)
              setTargetColumnId('')
            }}
          >
            {targetTables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('relationManager.targetColumn')}>
          <select value={safeTargetColumnId} onChange={(event) => setTargetColumnId(event.target.value)}>
            {(selectedTargetTable?.columns ?? []).map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </Field>

        <Button
          onClick={handleAddRelation}
          disabled={sourceTable.columns.length === 0 || targetTables.length === 0 || !safeTargetColumnId}
        >
          <Link2 size={14} />
          {t('relationManager.createRelation')}
        </Button>
      </div>

      <div className={styles.relationList}>
        {sourceRelations.length === 0 ? (
          <p className={styles.empty}>{t('relationManager.emptyRelations')}</p>
        ) : (
          sourceRelations.map((relation) => {
            const targetTable = tables.find((table) => table.id === relation.targetTableId)
            const sourceColumn = sourceTable.columns.find((column) => column.id === relation.sourceColumnId)
            const targetColumn = targetTable?.columns.find((column) => column.id === relation.targetColumnId)

            return (
              <div key={relation.id} className={styles.relationRow}>
                <div className={styles.relationHeader}>
                  <strong>{relation.constraintName}</strong>
                  <Button variant="danger" compact onClick={() => deleteRelation(relation.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>

                <p>
                  {sourceColumn?.name ?? '?'}
                  {' -> '}
                  {targetTable?.name ?? '?'}.
                  {targetColumn?.name ?? '?'}
                </p>

                <Field label={t('relationManager.fieldConstraint')}>
                  <input
                    value={relation.constraintName}
                    onChange={(event) => updateRelation(relation.id, { constraintName: event.target.value })}
                  />
                </Field>

                <div className={styles.actionsGrid}>
                  <Field label={t('relationManager.fieldOnUpdate')}>
                    <select
                      value={relation.onUpdate}
                      onChange={(event) => updateRelation(relation.id, { onUpdate: event.target.value as (typeof FK_ACTIONS)[number] })}
                    >
                      {FK_ACTIONS.map((action) => (
                        <option key={action} value={action}>
                          {action}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t('relationManager.fieldOnDelete')}>
                    <select
                      value={relation.onDelete}
                      onChange={(event) => updateRelation(relation.id, { onDelete: event.target.value as (typeof FK_ACTIONS)[number] })}
                    >
                      {FK_ACTIONS.map((action) => (
                        <option key={action} value={action}>
                          {action}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
