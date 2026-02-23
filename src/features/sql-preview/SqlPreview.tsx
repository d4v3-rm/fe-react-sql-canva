import { AlertTriangle, Copy, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel'
import { downloadTextFile } from '@/lib/file/textFile'
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
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
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

  async function handleCopySql() {
    try {
      await navigator.clipboard.writeText(editableSql)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    } finally {
      window.setTimeout(() => setCopyStatus('idle'), 1800)
    }
  }

  function handleExportSql() {
    downloadTextFile('schema-export.sql', editableSql)
  }

  const hasSyncError = editableSql !== sql && syncError

  return (
    <Card title="SQL Editor" subtitle="Automatic synchronization with canvas (GUI <-> SQL).">
      <CollapsiblePanel title="SQL actions" subtitle="Script operations and clipboard." defaultOpen={false}>
        <div className={styles.sqlActions}>
          <Button compact variant="ghost" onClick={() => void handleCopySql()}>
            <Copy size={12} />
            {copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy SQL'}
          </Button>

          <Button compact variant="ghost" onClick={handleExportSql}>
            <Download size={12} />
            Export SQL
          </Button>
        </div>
      </CollapsiblePanel>

      {warnings.length > 0 ? (
        <div className={styles.warningBox}>
          <Badge tone="warning">
            <AlertTriangle size={12} />
            Import warnings
          </Badge>
          <ul>
            {warnings.map((warning, index) => (
              <li key={`${warning}_${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasSyncError ? <Badge tone="warning">Invalid SQL</Badge> : null}

      <div className={styles.editArea}>
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
