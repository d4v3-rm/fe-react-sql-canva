import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Copy, DatabaseZap, Download, FileUp, MoonStar, MoreHorizontal, Plus, RotateCcw, Search, SunMedium } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
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
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null)

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

  function closeMoreMenu() {
    moreMenuRef.current?.removeAttribute('open')
  }

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
          <DatabaseZap size={14} strokeWidth={2.2} />
        </div>
        <div className={styles.identityText}>
          <h1>SQL Canvas</h1>
          <span>{database.name}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={clsx(styles.iconButton, styles.addButton)} onClick={addTable} title="Nuova tabella" type="button">
          <Plus size={12} />
        </button>

        <button className={styles.iconButton} onClick={handleOpenImportDialog} disabled={importing} title="Importa SQL" type="button">
          <FileUp size={12} />
        </button>

        <button className={styles.iconButton} onClick={handleExportSql} title="Esporta SQL" type="button">
          <Download size={12} />
        </button>

        <button
          className={styles.iconButton}
          onClick={onOpenCommandPalette}
          title="Apri command palette (Ctrl+K)"
          type="button"
        >
          <Search size={12} />
        </button>

        <button
          className={clsx(styles.iconButton, styles.themeButton, theme === 'dark' && styles.themeButtonDark)}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
          type="button"
        >
          {theme === 'dark' ? <MoonStar size={12} /> : <SunMedium size={12} />}
        </button>

        {warnings.length > 0 ? <Badge className={styles.warningBadge} tone="warning">Import: {warnings.length}</Badge> : null}

        <details ref={moreMenuRef} className={styles.moreMenu}>
          <summary className={styles.iconButton} title="Altre azioni">
            <MoreHorizontal size={12} />
          </summary>
          <div className={styles.morePanel}>
            <div className={styles.presetRow}>
              {LAYOUT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={clsx(styles.layoutPresetButton, activeLayoutPreset === preset.id && styles.layoutPresetButtonActive)}
                  onClick={() => {
                    onApplyLayoutPreset(preset.id)
                    closeMoreMenu()
                  }}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              className={styles.menuAction}
              onClick={() => {
                void handleCopySql()
                closeMoreMenu()
              }}
              type="button"
            >
              <Copy size={14} />
              {copyStatus === 'copied' ? 'Copiato' : copyStatus === 'error' ? 'Errore copia' : 'Copia SQL'}
            </button>

            <button
              className={styles.menuAction}
              onClick={() => {
                void handleResetProject()
                closeMoreMenu()
              }}
              type="button"
            >
              <RotateCcw size={14} />
              Nuovo progetto
            </button>

            <p className={styles.menuMeta}>Ultimo save: {new Date(lastSavedAt).toLocaleTimeString('it-IT')}</p>
          </div>
        </details>
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
