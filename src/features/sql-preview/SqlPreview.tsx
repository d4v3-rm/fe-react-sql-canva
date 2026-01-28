import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './SqlPreview.module.scss'

interface SqlPreviewProps {
  sql: string
}

export function SqlPreview({ sql }: SqlPreviewProps) {
  const warnings = useSchemaStore((state) => state.importWarnings)
  const importSql = useSchemaStore((state) => state.importSql)

  const [editableSql, setEditableSql] = useState(sql)
  const [syncError, setSyncError] = useState(false)
  const lastModelSqlRef = useRef(sql)

  useEffect(() => {
    if (sql === lastModelSqlRef.current) {
      return
    }

    lastModelSqlRef.current = sql

    const timer = window.setTimeout(() => {
      setEditableSql(sql)
      setSyncError(false)
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [sql])

  useEffect(() => {
    if (editableSql === sql) {
      return
    }

    const timer = window.setTimeout(() => {
      const success = importSql(editableSql)
      setSyncError(!success)
    }, 420)

    return () => {
      window.clearTimeout(timer)
    }
  }, [editableSql, importSql, sql])

  const isSyncing = editableSql !== sql && !syncError
  const hasSyncError = editableSql !== sql && syncError

  return (
    <Card title="SQL Editor" subtitle="Sincronizzazione automatica con il canvas (GUI <-> SQL).">
      {warnings.length > 0 ? (
        <div className={styles.warningBox}>
          <Badge tone="warning">
            <AlertTriangle size={12} />
            Warning import
          </Badge>
          <ul>
            {warnings.map((warning, index) => (
              <li key={`${warning}_${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.statusRow}>
        {isSyncing ? <Badge tone="neutral">Sincronizzazione in corso...</Badge> : null}
        {hasSyncError ? <Badge tone="warning">SQL non valido</Badge> : null}
      </div>

      <div className={styles.editArea}>
        <h4>Editor SQL</h4>
        <textarea
          value={editableSql}
          onChange={(event) => {
            setEditableSql(event.target.value)
            setSyncError(false)
          }}
          spellCheck={false}
        />
      </div>
    </Card>
  )
}
