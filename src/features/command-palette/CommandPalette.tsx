import clsx from 'clsx'
import { Binary, Database, FolderPlus, LayoutTemplate, Search, SunMoon, Telescope } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { PROJECT_TEMPLATES } from '@/lib/templates/databaseTemplates'
import { useCanvasViewStore } from '@/store/canvasViewStore'
import { useSchemaStore } from '@/store/schemaStore'
import { useThemeStore } from '@/store/themeStore'

import styles from './CommandPalette.module.scss'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandAction {
  id: string
  label: string
  description: string
  keywords: string[]
  icon: React.ReactNode
  run: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const addTable = useSchemaStore((state) => state.addTable)
  const addSchema = useSchemaStore((state) => state.addSchema)
  const applyTemplate = useSchemaStore((state) => state.applyTemplate)
  const clearProject = useSchemaStore((state) => state.clearProject)
  const requestFitView = useCanvasViewStore((state) => state.requestFitView)
  const requestCenterSelected = useCanvasViewStore((state) => state.requestCenterSelected)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  const actions = useMemo<CommandAction[]>(
    () => [
      {
        id: 'new-table',
        label: 'Nuova tabella',
        description: 'Crea una nuova tabella nello schema principale.',
        keywords: ['new', 'table', 'tabella', 'create'],
        icon: <Database size={14} />,
        run: addTable,
      },
      {
        id: 'new-schema',
        label: 'Nuovo schema',
        description: 'Aggiunge uno schema PostgreSQL al database.',
        keywords: ['schema', 'create', 'db'],
        icon: <FolderPlus size={14} />,
        run: () => {
          const nextSchema = window.prompt('Nome nuovo schema')
          if (!nextSchema) {
            return
          }

          addSchema(nextSchema)
        },
      },
      {
        id: 'fit-canvas',
        label: 'Canvas: fit all',
        description: 'Adatta il canvas per visualizzare tutte le tabelle.',
        keywords: ['canvas', 'fit', 'zoom', 'all'],
        icon: <Telescope size={14} />,
        run: requestFitView,
      },
      {
        id: 'center-selected',
        label: 'Canvas: center selected',
        description: 'Centra il canvas sulla tabella selezionata.',
        keywords: ['canvas', 'center', 'selected', 'focus'],
        icon: <Telescope size={14} />,
        run: requestCenterSelected,
      },
      {
        id: 'toggle-theme',
        label: 'Cambia tema',
        description: 'Alterna tra tema light e dark.',
        keywords: ['theme', 'dark', 'light', 'ui'],
        icon: <SunMoon size={14} />,
        run: toggleTheme,
      },
      {
        id: 'clear-project',
        label: 'Nuovo progetto vuoto',
        description: 'Resetta interamente il progetto corrente.',
        keywords: ['reset', 'clear', 'project'],
        icon: <Binary size={14} />,
        run: () => {
          const confirmed = window.confirm('Creare un nuovo progetto vuoto?')
          if (confirmed) {
            clearProject()
          }
        },
      },
      ...PROJECT_TEMPLATES.map<CommandAction>((template) => ({
        id: `template-${template.id}`,
        label: `Template: ${template.name}`,
        description: template.description,
        keywords: ['template', template.id, template.name.toLowerCase()],
        icon: <LayoutTemplate size={14} />,
        run: () => {
          const confirmed = window.confirm(`Applicare il template "${template.name}"? Sovrascrivera il progetto corrente.`)
          if (!confirmed) {
            return
          }

          applyTemplate(template.id)
        },
      })),
    ],
    [addSchema, addTable, applyTemplate, clearProject, requestCenterSelected, requestFitView, toggleTheme],
  )

  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return actions
    }

    return actions.filter((action) => {
      if (action.label.toLowerCase().includes(normalized)) {
        return true
      }

      if (action.description.toLowerCase().includes(normalized)) {
        return true
      }

      return action.keywords.some((keyword) => keyword.includes(normalized))
    })
  }, [actions, query])

  const safeActiveIndex = filteredActions.length === 0 ? -1 : Math.min(activeIndex, filteredActions.length - 1)

  const handleClose = useCallback(() => {
    setQuery('')
    setActiveIndex(0)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => (filteredActions.length === 0 ? 0 : (current + 1) % filteredActions.length))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) =>
          filteredActions.length === 0 ? 0 : (current - 1 + filteredActions.length) % filteredActions.length,
        )
        return
      }

      if (event.key === 'Enter') {
        const action = safeActiveIndex >= 0 ? filteredActions[safeActiveIndex] : undefined
        if (!action) {
          return
        }

        event.preventDefault()
        action.run()
        handleClose()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filteredActions, handleClose, isOpen, safeActiveIndex])

  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay} onClick={handleClose} role="presentation">
      <section className={styles.palette} onClick={(event) => event.stopPropagation()}>
        <label className={styles.searchInput}>
          <Search size={15} />
          <input
            autoFocus
            placeholder="Cerca comando (es: template, tabella, schema...)"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
          />
          <kbd>Ctrl+K</kbd>
        </label>

        <div className={styles.list}>
          {filteredActions.length === 0 ? (
            <p className={styles.empty}>Nessun comando trovato.</p>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                className={clsx(styles.item, index === safeActiveIndex && styles.active)}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  action.run()
                  handleClose()
                }}
                type="button"
              >
                <span className={styles.icon}>{action.icon}</span>
                <span className={styles.meta}>
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}



