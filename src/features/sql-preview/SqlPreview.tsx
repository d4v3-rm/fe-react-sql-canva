import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw, Sparkles, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './SqlPreview.module.scss'

interface SqlPreviewProps {
  sql: string
}

type ApplyState = 'idle' | 'ok' | 'error'

export function SqlPreview({ sql }: SqlPreviewProps) {
  const warnings = useSchemaStore((state) => state.importWarnings)
  const importSql = useSchemaStore((state) => state.importSql)
  const clearWarnings = useSchemaStore((state) => state.clearWarnings)

  const [editableSql, setEditableSql] = useState(sql)
  const [isDraft, setIsDraft] = useState(false)
  const [liveSync, setLiveSync] = useState(false)
  const [applyState, setApplyState] = useState<ApplyState>('idle')
  const editorSql = isDraft ? editableSql : sql

  useEffect(() => {
    if (!liveSync || !isDraft) {
      return
    }

    const timer = window.setTimeout(() => {
      const success = importSql(editorSql)
      setApplyState(success ? 'ok' : 'error')
    }, 650)

    return () => {
      window.clearTimeout(timer)
    }
  }, [liveSync, isDraft, editorSql, importSql])

  function applyEditorToModel() {
    const success = importSql(editorSql)
    setApplyState(success ? 'ok' : 'error')

    if (success) {
      setIsDraft(false)
    }
  }

  function syncEditorFromModel() {
    setIsDraft(false)
    setApplyState('idle')
    clearWarnings()
  }

  return (
    <Card title="SQL Workspace" subtitle="Modifica SQL manualmente e sincronizza il modello visuale.">
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
        {isDraft ? <Badge tone="warning">Bozza SQL non applicata</Badge> : <Badge tone="success">SQL sincronizzato</Badge>}
        {applyState === 'ok' ? <Badge tone="success">Parsing SQL OK</Badge> : null}
        {applyState === 'error' ? <Badge tone="warning">SQL non applicabile</Badge> : null}
      </div>

      <div className={styles.controls}>
        <Button onClick={applyEditorToModel}>
          <Upload size={14} />
          Applica SQL al modello
        </Button>
        <Button variant="ghost" onClick={syncEditorFromModel}>
          <RefreshCcw size={14} />
          Sincronizza da modello
        </Button>
        <label className={styles.liveSyncToggle}>
          <input checked={liveSync} onChange={(event) => setLiveSync(event.target.checked)} type="checkbox" />
          Sync live SQL {'->'} GUI
        </label>
      </div>

      <div className={styles.editArea}>
        <h4>Editor SQL</h4>
        <textarea
          value={editorSql}
          onChange={(event) => {
            setEditableSql(event.target.value)
            setIsDraft(true)
            setApplyState('idle')
          }}
          spellCheck={false}
        />
      </div>

      <div className={styles.previewArea}>
        <h4>
          <Sparkles size={14} />
          SQL corrente dal modello
        </h4>
        <pre className={styles.sqlBlock}>{sql}</pre>
      </div>
    </Card>
  )
}
