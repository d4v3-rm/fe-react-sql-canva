import { useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

import { SchemaCanvas } from '@/features/canvas/SchemaCanvas'
import { SqlPreview } from '@/features/sql-preview/SqlPreview'
import { TableEditor } from '@/features/table-editor/TableEditor'
import { TableList } from '@/features/table-list/TableList'
import { Toolbar } from '@/features/toolbar/Toolbar'
import { generateProjectSql } from '@/lib/sql/generateSql'
import { useLayoutStore } from '@/store/layoutStore'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './App.module.scss'

const MIN_LEFT_PANE_WIDTH = 220
const MIN_RIGHT_PANE_WIDTH = 320
const MIN_CENTER_PANE_WIDTH = 420
const TOTAL_SPLITTER_WIDTH = 20

type ResizeTarget = 'left' | 'right'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export default function App() {
  const tables = useSchemaStore((state) => state.tables)
  const relations = useSchemaStore((state) => state.relations)
  const leftPaneWidth = useLayoutStore((state) => state.leftPaneWidth)
  const rightPaneWidth = useLayoutStore((state) => state.rightPaneWidth)
  const setLeftPaneWidth = useLayoutStore((state) => state.setLeftPaneWidth)
  const setRightPaneWidth = useLayoutStore((state) => state.setRightPaneWidth)
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
        tables,
        relations,
      }),
    [tables, relations],
  )

  const layoutStyle: CSSProperties = {
    '--left-pane-width': `${leftPaneWidth}px`,
    '--right-pane-width': `${rightPaneWidth}px`,
  } as CSSProperties

  function startResize(target: ResizeTarget, event: ReactPointerEvent<HTMLDivElement>) {
    if (window.innerWidth <= 1100) {
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

  return (
    <div className={styles.page}>
      <Toolbar sqlScript={sqlScript} />

      <main ref={layoutRef} className={styles.layout} style={layoutStyle}>
        <aside className={styles.leftPane}>
          <TableList />
        </aside>

        <div
          className={styles.splitter}
          role="separator"
          aria-label="Ridimensiona pannello sinistro"
          aria-orientation="vertical"
          onDoubleClick={resetPaneWidths}
          onPointerDown={(event) => startResize('left', event)}
        />

        <section className={styles.centerPane}>
          <SchemaCanvas />
        </section>

        <div
          className={styles.splitter}
          role="separator"
          aria-label="Ridimensiona pannello destro"
          aria-orientation="vertical"
          onDoubleClick={resetPaneWidths}
          onPointerDown={(event) => startResize('right', event)}
        />

        <aside className={styles.rightPane}>
          <TableEditor />
          <SqlPreview sql={sqlScript} />
        </aside>
      </main>
    </div>
  )
}
