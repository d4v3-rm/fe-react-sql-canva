import clsx from 'clsx'
import { Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

import { SchemaCanvas } from '@/features/canvas/SchemaCanvas'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { DatabaseExplorer } from '@/features/explorer/DatabaseExplorer'
import { InspectorPanel } from '@/features/inspector/InspectorPanel'
import { Toolbar } from '@/features/toolbar/Toolbar'
import { generateProjectSql } from '@/lib/sql/generateSql'
import { useLayoutStore, type PaneId } from '@/store/layoutStore'
import { useSchemaStore } from '@/store/schemaStore'
import { useThemeStore } from '@/store/themeStore'

import styles from './App.module.scss'

const MIN_LEFT_PANE_WIDTH = 160
const MIN_RIGHT_PANE_WIDTH = 140
const MIN_CENTER_PANE_WIDTH = 240
const TOTAL_SPLITTER_WIDTH = 14

type ResizeTarget = 'left' | 'right'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function paneTitle(pane: PaneId): string {
  if (pane === 'left') {
    return 'Explorer'
  }

  if (pane === 'center') {
    return 'Canvas'
  }

  return 'Inspector'
}

export default function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const database = useSchemaStore((state) => state.database)
  const tables = useSchemaStore((state) => state.tables)
  const relations = useSchemaStore((state) => state.relations)
  const theme = useThemeStore((state) => state.theme)

  const leftPaneWidth = useLayoutStore((state) => state.leftPaneWidth)
  const rightPaneWidth = useLayoutStore((state) => state.rightPaneWidth)
  const leftCollapsed = useLayoutStore((state) => state.leftCollapsed)
  const centerCollapsed = useLayoutStore((state) => state.centerCollapsed)
  const rightCollapsed = useLayoutStore((state) => state.rightCollapsed)
  const maximizedPane = useLayoutStore((state) => state.maximizedPane)

  const setLeftPaneWidth = useLayoutStore((state) => state.setLeftPaneWidth)
  const setRightPaneWidth = useLayoutStore((state) => state.setRightPaneWidth)
  const setPaneCollapsed = useLayoutStore((state) => state.setPaneCollapsed)
  const togglePaneCollapsed = useLayoutStore((state) => state.togglePaneCollapsed)
  const togglePaneMaximized = useLayoutStore((state) => state.togglePaneMaximized)
  const resetPaneWidths = useLayoutStore((state) => state.resetPaneWidths)

  const layoutRef = useRef<HTMLElement | null>(null)
  const dragStateRef = useRef<{
    target: ResizeTarget
    startX: number
    startLeft: number
    startRight: number
  } | null>(null)

  const sqlScript = useMemo(
    () =>
      generateProjectSql({
        database,
        tables,
        relations,
      }),
    [database, tables, relations],
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
      if (!isCommandShortcut) {
        return
      }

      event.preventDefault()
      setIsCommandPaletteOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const layoutStyle: CSSProperties = {
    '--left-pane-width': `${leftPaneWidth}px`,
    '--right-pane-width': `${rightPaneWidth}px`,
  } as CSSProperties

  function handleToggleMaximize(pane: PaneId) {
    setPaneCollapsed(pane, false)
    togglePaneMaximized(pane)
  }

  function startResize(target: ResizeTarget, event: ReactPointerEvent<HTMLDivElement>) {
    if (maximizedPane !== null) {
      return
    }

    if ((target === 'left' && leftCollapsed) || (target === 'right' && rightCollapsed)) {
      return
    }

    const layoutElement = layoutRef.current
    if (!layoutElement) {
      return
    }

    event.preventDefault()

    dragStateRef.current = {
      target,
      startX: event.clientX,
      startLeft: leftPaneWidth,
      startRight: rightPaneWidth,
    }

    const moveHandler = (moveEvent: PointerEvent) => {
      const state = dragStateRef.current
      const currentLayout = layoutRef.current
      if (!state || !currentLayout) {
        return
      }

      const totalWidth = currentLayout.clientWidth
      const deltaX = moveEvent.clientX - state.startX

      if (state.target === 'left') {
        const maxLeft = Math.max(
          MIN_LEFT_PANE_WIDTH,
          totalWidth - state.startRight - MIN_CENTER_PANE_WIDTH - TOTAL_SPLITTER_WIDTH,
        )
        setLeftPaneWidth(clamp(state.startLeft + deltaX, MIN_LEFT_PANE_WIDTH, maxLeft))
        return
      }

      const maxRight = Math.max(
        MIN_RIGHT_PANE_WIDTH,
        totalWidth - state.startLeft - MIN_CENTER_PANE_WIDTH - TOTAL_SPLITTER_WIDTH,
      )
      setRightPaneWidth(clamp(state.startRight - deltaX, MIN_RIGHT_PANE_WIDTH, maxRight))
    }

    const upHandler = () => {
      dragStateRef.current = null
      document.body.style.removeProperty('user-select')
      window.removeEventListener('pointermove', moveHandler)
      window.removeEventListener('pointerup', upHandler)
    }

    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', moveHandler)
    window.addEventListener('pointerup', upHandler)
  }

  function renderPaneButtons(pane: PaneId, collapsed: boolean) {
    return (
      <div className={styles.windowButtons}>
        <button
          className={clsx(styles.windowButton, styles.minimizeButton)}
          onClick={() => togglePaneCollapsed(pane)}
          title={collapsed ? 'Espandi pannello' : 'Collassa pannello'}
          type="button"
        >
          {collapsed ? <Plus size={12} /> : <Minus size={12} />}
        </button>

        {!collapsed ? (
          <button
            className={clsx(styles.windowButton, styles.maximizeButton)}
            onClick={() => handleToggleMaximize(pane)}
            title={maximizedPane === pane ? 'Ripristina layout' : 'Massimizza pannello'}
            type="button"
          >
            {maximizedPane === pane ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        ) : null}
      </div>
    )
  }

  const showLeftPane = maximizedPane === null || maximizedPane === 'left'
  const showCenterPane = maximizedPane === null || maximizedPane === 'center'
  const showRightPane = maximizedPane === null || maximizedPane === 'right'
  const showLeftSplitter = maximizedPane === null && showLeftPane && showCenterPane && !leftCollapsed
  const showRightSplitter = maximizedPane === null && showRightPane && showCenterPane && !rightCollapsed

  return (
    <div className={styles.page}>
      <Toolbar sqlScript={sqlScript} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

      <main ref={layoutRef} className={styles.layout} style={layoutStyle}>
        {showLeftPane ? (
          <aside className={clsx(styles.leftPane, leftCollapsed && styles.collapsedPane, maximizedPane === 'left' && styles.maximizedPane)}>
            <div className={styles.paneWindow}>
              <div className={clsx(styles.paneHeader, leftCollapsed && styles.collapsedHeader)}>
                {!leftCollapsed ? <span className={styles.paneTitle}>{paneTitle('left')}</span> : null}
                {renderPaneButtons('left', leftCollapsed)}
              </div>

              {leftCollapsed ? (
                <div className={styles.collapsedLabel} title={paneTitle('left')}>
                  <span className={styles.collapsedLabelText}>{paneTitle('left')}</span>
                </div>
              ) : (
                <div className={clsx(styles.paneContent, styles.scrollPaneContent)}>
                  <DatabaseExplorer />
                </div>
              )}
            </div>
          </aside>
        ) : null}

        {showLeftSplitter ? (
          <div
            className={styles.splitter}
            role="separator"
            aria-label="Ridimensiona pannello sinistro"
            aria-orientation="vertical"
            onDoubleClick={resetPaneWidths}
            onPointerDown={(event) => startResize('left', event)}
          />
        ) : null}

        {showCenterPane ? (
          <section
            className={clsx(styles.centerPane, centerCollapsed && styles.collapsedPane, maximizedPane === 'center' && styles.maximizedPane)}
          >
            <div className={styles.paneWindow}>
              <div className={clsx(styles.paneHeader, centerCollapsed && styles.collapsedHeader)}>
                {!centerCollapsed ? <span className={styles.paneTitle}>{paneTitle('center')}</span> : null}
                {renderPaneButtons('center', centerCollapsed)}
              </div>

              {centerCollapsed ? (
                <div className={styles.collapsedLabel} title={paneTitle('center')}>
                  <span className={styles.collapsedLabelText}>{paneTitle('center')}</span>
                </div>
              ) : (
                <div className={styles.paneContent}>
                  <SchemaCanvas />
                </div>
              )}
            </div>
          </section>
        ) : null}

        {showRightSplitter ? (
          <div
            className={styles.splitter}
            role="separator"
            aria-label="Ridimensiona pannello destro"
            aria-orientation="vertical"
            onDoubleClick={resetPaneWidths}
            onPointerDown={(event) => startResize('right', event)}
          />
        ) : null}

        {showRightPane ? (
          <aside className={clsx(styles.rightPane, rightCollapsed && styles.collapsedPane, maximizedPane === 'right' && styles.maximizedPane)}>
            <div className={styles.paneWindow}>
              <div className={clsx(styles.paneHeader, rightCollapsed && styles.collapsedHeader)}>
                {!rightCollapsed ? <span className={styles.paneTitle}>{paneTitle('right')}</span> : null}
                {renderPaneButtons('right', rightCollapsed)}
              </div>

              {rightCollapsed ? (
                <div className={styles.collapsedLabel} title={paneTitle('right')}>
                  <span className={styles.collapsedLabelText}>{paneTitle('right')}</span>
                </div>
              ) : (
                <div className={clsx(styles.paneContent, styles.scrollPaneContent)}>
                  <InspectorPanel sqlScript={sqlScript} />
                </div>
              )}
            </div>
          </aside>
        ) : null}
      </main>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  )
}
