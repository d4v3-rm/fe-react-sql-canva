import { useRef, useState } from 'react'
import { Copy, DatabaseZap, Download, FileUp, Plus, RotateCcw, Save } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { readTextFile, downloadTextFile } from '@/lib/file/textFile'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './Toolbar.module.scss'

interface ToolbarProps {
  sqlScript: string
}

export function Toolbar({ sqlScript }: ToolbarProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [importing, setImporting] = useState(false)

  const hiddenInputRef = useRef<HTMLInputElement>(null)

  const addTable = useSchemaStore((state) => state.addTable)
  const clearProject = useSchemaStore((state) => state.clearProject)
  const importSql = useSchemaStore((state) => state.importSql)
  const clearWarnings = useSchemaStore((state) => state.clearWarnings)
  const warnings = useSchemaStore((state) => state.importWarnings)
  const lastSavedAt = useSchemaStore((state) => state.lastSavedAt)

  async function handleCopySql() {
    try {
      await navigator.clipboard.writeText(sqlScript)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    } finally {
      setTimeout(() => setCopyStatus('idle'), 1800)
    }
  }

  function handleExportSql() {
    downloadTextFile('schema-export.sql', sqlScript)
  }

  function handleOpenImportDialog() {
    hiddenInputRef.current?.click()
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
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

  function handleResetProject() {
    const confirmed = window.confirm('Vuoi davvero creare un progetto vuoto? I dati correnti saranno rimossi.')
    if (confirmed) {
      clearProject()
    }
  }

  return (
    <header className={styles.toolbar}>
      <div className={styles.identity}>
        <div className={styles.logoTile}>
          <DatabaseZap size={18} strokeWidth={2.1} />
        </div>
        <div>
          <h1>SQL Canvas Modeler</h1>
          <p>Progettazione visuale PostgreSQL, export e import SQL, persistenza locale automatica.</p>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" onClick={addTable}>
          <Plus size={15} />
          Nuova tabella
        </Button>
        <Button onClick={handleOpenImportDialog} disabled={importing}>
          <FileUp size={15} />
          Importa SQL
        </Button>
        <Button onClick={handleExportSql}>
          <Download size={15} />
          Esporta SQL
        </Button>
        <Button onClick={handleCopySql}>
          <Copy size={15} />
          {copyStatus === 'copied' ? 'Copiato' : copyStatus === 'error' ? 'Errore copia' : 'Copia SQL'}
        </Button>
        <Button variant="ghost" onClick={handleResetProject}>
          <RotateCcw size={15} />
          Nuovo progetto
        </Button>
      </div>

      <div className={styles.meta}>
        <Badge tone="success">
          <Save size={12} />
          Auto-save locale
        </Badge>
        {warnings.length > 0 ? <Badge tone="warning">Warning import: {warnings.length}</Badge> : null}
        <span>Ultimo salvataggio: {new Date(lastSavedAt).toLocaleString('it-IT')}</span>
      </div>

      <input
        ref={hiddenInputRef}
        className={styles.hiddenInput}
        type="file"
        accept=".sql,.txt"
        onChange={handleImportFile}
      />
    </header>
  )
}
