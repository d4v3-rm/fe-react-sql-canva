import clsx from 'clsx'
import { Binary, Database, FolderPlus, LayoutTemplate, PanelsTopLeft, Search, SunMoon, Telescope } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useDialog } from '@/components/ui/dialog/useDialog'
import { t } from '@/i18n'
import { PROJECT_TEMPLATES } from '@/lib/templates/databaseTemplates'
import { useCanvasViewStore } from '@/store/canvasViewStore'
import { useInspectorStore } from '@/store/inspectorStore'
import { useLayoutStore } from '@/store/layoutStore'
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
  run: () => void | Promise<void>
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
  const applyLayoutPreset = useLayoutStore((state) => state.applyPreset)
  const setInspectorTab = useInspectorStore((state) => state.setActiveTab)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const { alert, confirm, prompt } = useDialog()

  const actions = useMemo<CommandAction[]>(
    () => [
      {
        id: 'new-table',
        label: t('commandPalette.commands.newTable.label'),
        description: t('commandPalette.commands.newTable.description'),
        keywords: ['new', 'table', 'create', 'schema'],
        icon: <Database size={14} />,
        run: addTable,
      },
      {
        id: 'new-schema',
        label: t('commandPalette.commands.newSchema.label'),
        description: t('commandPalette.commands.newSchema.description'),
        keywords: ['schema', 'create', 'db'],
        icon: <FolderPlus size={14} />,
        run: () =>
          (async () => {
            const nextSchema = await prompt({
              title: t('commandPalette.commands.newSchema.title'),
              placeholder: t('databaseExplorer.schema.placeholder'),
              confirmLabel: t('commandPalette.shared.schemaConfirm'),
            })

            if (!nextSchema || nextSchema.trim() === '') {
              return
            }

            const success = addSchema(nextSchema)
            if (success) {
              return
            }

            await alert({
              title: t('databaseExplorer.schema.invalidTitle'),
              message: t('commandPalette.shared.invalidSchemaMessage'),
            })
          })(),
      },
      {
        id: 'layout-balanced',
        label: t('commandPalette.commands.layoutBalanced.label'),
        description: t('commandPalette.commands.layoutBalanced.description'),
        keywords: ['layout', 'balanced', 'default', 'reset'],
        icon: <PanelsTopLeft size={14} />,
        run: () => applyLayoutPreset('balanced'),
      },
      {
        id: 'layout-canvas',
        label: t('commandPalette.commands.layoutCanvas.label'),
        description: t('commandPalette.commands.layoutCanvas.description'),
        keywords: ['layout', 'canvas', 'focus'],
        icon: <PanelsTopLeft size={14} />,
        run: () => applyLayoutPreset('focus_canvas'),
      },
      {
        id: 'layout-inspector',
        label: t('commandPalette.commands.layoutInspector.label'),
        description: t('commandPalette.commands.layoutInspector.description'),
        keywords: ['layout', 'inspector', 'focus'],
        icon: <PanelsTopLeft size={14} />,
        run: () => {
          setInspectorTab('structure')
          applyLayoutPreset('focus_inspector')
        },
      },
      {
        id: 'layout-sql',
        label: t('commandPalette.commands.layoutSql.label'),
        description: t('commandPalette.commands.layoutSql.description'),
        keywords: ['layout', 'sql', 'focus', 'editor'],
        icon: <PanelsTopLeft size={14} />,
        run: () => {
          setInspectorTab('sql')
          applyLayoutPreset('focus_sql')
        },
      },
      {
        id: 'fit-canvas',
        label: t('commandPalette.commands.fitCanvas.label'),
        description: t('commandPalette.commands.fitCanvas.description'),
        keywords: ['canvas', 'fit', 'zoom', 'all'],
        icon: <Telescope size={14} />,
        run: requestFitView,
      },
      {
        id: 'center-selected',
        label: t('commandPalette.commands.centerCanvas.label'),
        description: t('commandPalette.commands.centerCanvas.description'),
        keywords: ['canvas', 'center', 'selected', 'focus'],
        icon: <Telescope size={14} />,
        run: requestCenterSelected,
      },
      {
        id: 'toggle-theme',
        label: t('commandPalette.commands.toggleTheme.label'),
        description: t('commandPalette.commands.toggleTheme.description'),
        keywords: ['theme', 'dark', 'light', 'ui'],
        icon: <SunMoon size={14} />,
        run: toggleTheme,
      },
      {
        id: 'clear-project',
        label: t('commandPalette.commands.newProject.label'),
        description: t('commandPalette.commands.newProject.description'),
        keywords: ['reset', 'clear', 'project'],
        icon: <Binary size={14} />,
        run: () =>
          (async () => {
            const approved = await confirm({
              title: t('commandPalette.shared.newProjectTitle'),
              message: t('commandPalette.shared.newProjectMessage'),
              confirmLabel: t('commandPalette.shared.newProjectConfirm'),
              tone: 'danger',
            })

            if (approved) {
              clearProject()
            }
          })(),
      },
      ...PROJECT_TEMPLATES.map<CommandAction>((template) => ({
        id: `template-${template.id}`,
        label: t('commandPalette.commands.template.label', { name: template.name }),
        description: template.description,
        keywords: ['template', template.id, template.name.toLowerCase()],
        icon: <LayoutTemplate size={14} />,
        run: () =>
          (async () => {
            const approved = await confirm({
              title: t('canvas.templateApplyTitle', { name: template.name }),
              message: t('canvas.templateApplyMessage'),
              confirmLabel: t('canvas.templateApplyConfirm'),
              tone: 'danger',
            })

            if (!approved) {
              return
            }

            applyTemplate(template.id)
          })(),
      })),
    ],
    [
      addSchema,
      addTable,
      alert,
      applyLayoutPreset,
      applyTemplate,
      clearProject,
      confirm,
      prompt,
      requestCenterSelected,
      requestFitView,
      setInspectorTab,
      toggleTheme,
    ],
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

  const executeAction = useCallback(
    (action: CommandAction) => {
      handleClose()
      window.setTimeout(() => {
        void action.run()
      }, 0)
    },
    [handleClose],
  )

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
        executeAction(action)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [executeAction, filteredActions, handleClose, isOpen, safeActiveIndex])

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
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
          />
          <kbd>{t('app.hotkey')}</kbd>
        </label>

        <div className={styles.list}>
          {filteredActions.length === 0 ? (
            <p className={styles.empty}>{t('commandPalette.noResults')}</p>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                className={clsx(styles.item, index === safeActiveIndex && styles.active)}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => executeAction(action)}
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
