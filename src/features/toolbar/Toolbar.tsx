import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Copy, DatabaseZap, Download, FileUp, MoonStar, Plus, RotateCcw, Search, SunMedium } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useDialog } from '@/components/ui/dialog/useDialog'
import { readTextFile, downloadTextFile } from '@/lib/file/textFile'
import type { LayoutPreset, QuickLayoutPreset } from '@/store/layoutStore'
import { useSchemaStore } from '@/store/schemaStore'
import { useThemeStore } from '@/store/themeStore'

import styles from './Toolbar.module.scss'

interface ToolbarProps {
  sqlScript: string
  onOpenCommandPalette: () => void
  activeLayoutPreset: LayoutPreset
  onApplyLayoutPreset: (preset: QuickLayoutPreset) => void
}

const LAYOUT_PRESETS: { id: QuickLayoutPreset; label: string }[] = [
  { id: 'balanced', label: 'Bilanciato' },
  { id: 'focus_canvas', label: 'Canvas' },
  { id: 'focus_inspector', label: 'Inspector' },
  { id: 'focus_sql', label: 'SQL' },
]

export function Toolbar({ sqlScript, onOpenCommandPalette, activeLayoutPreset, onApplyLayoutPreset }: ToolbarProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [importing, setImporting] = useState(false)

  const hiddenInputRef = useRef<HTMLInputElement>(null)

  const addTable = useSchemaStore((state) => state.addTable)
  const clearProject = useSchemaStore((state) => state.clearProject)
  const importSql = useSchemaStore((state) => state.importSql)
  const clearWarnings = useSchemaStore((state) => state.clearWarnings)
  const warnings = useSchemaStore((state) => state.importWarnings)
  const lastSavedAt = useSchemaStore((state) => state.lastSavedAt)
  const database = useSchemaStore((state) => state.database)
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const { confirm } = useDialog()

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

  async function handleResetProject() {
    const confirmed = await confirm({
      title: 'Nuovo progetto vuoto',
      message: 'Vuoi davvero creare un progetto vuoto? I dati correnti saranno rimossi.',
      confirmLabel: 'Crea progetto',
      tone: 'danger',
    })

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
        <div className={styles.identityText}>
          <h1>SQL Canvas Modeler</h1>
          <span>{database.name} | {database.schemas.length} schemi</span>
        </div>
      </div>

      <div className={styles.actions}>
        <div className={styles.actionGroup}>
          <span className={styles.groupLabel}>Struttura</span>
          <div className={styles.groupButtons}>
            <Button variant="primary" onClick={addTable}>
              <Plus size={15} />
              Nuova tabella
            </Button>
          </div>
        </div>

        <div className={styles.actionGroup}>
          <span className={styles.groupLabel}>SQL</span>
          <div className={styles.groupButtons}>
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
          </div>
        </div>

        <div className={styles.actionGroup}>
          <span className={styles.groupLabel}>Layout</span>
          <div className={styles.groupButtons}>
            {LAYOUT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={clsx(styles.layoutPresetButton, activeLayoutPreset === preset.id && styles.layoutPresetButtonActive)}
                onClick={() => onApplyLayoutPreset(preset.id)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actionGroup}>
          <span className={styles.groupLabel}>Workspace</span>
          <div className={styles.groupButtons}>
            <Button variant="ghost" onClick={onOpenCommandPalette} title="Apri command palette (Ctrl+K)">
              <Search size={15} />
              Comandi
            </Button>
            <Button variant="ghost" onClick={() => void handleResetProject()}>
              <RotateCcw size={15} />
              Nuovo progetto
            </Button>
            <button
              className={clsx(styles.themeSwitch, theme === 'dark' && styles.themeSwitchDark)}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
              type="button"
            >
              <span className={styles.switchTrack}>
                <span className={clsx(styles.switchThumb, theme === 'dark' && styles.switchThumbDark)}>
                  {theme === 'dark' ? <MoonStar size={11} /> : <SunMedium size={11} />}
                </span>
              </span>
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>

        <div className={styles.meta}>
          {warnings.length > 0 ? <Badge tone="warning">Warning import: {warnings.length}</Badge> : null}
          <span>Auto-save locale | {new Date(lastSavedAt).toLocaleString('it-IT')}</span>
        </div>
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
