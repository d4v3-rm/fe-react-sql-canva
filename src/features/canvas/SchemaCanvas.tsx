import { useEffect, useMemo, useRef } from 'react'
import { Focus, LayoutTemplate, Plus, ScanSearch } from 'lucide-react'
import { Background, Controls, MiniMap, ReactFlow, type Edge, type NodeTypes, type ReactFlowInstance } from '@xyflow/react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PROJECT_TEMPLATES } from '@/lib/templates/databaseTemplates'
import { useCanvasViewStore } from '@/store/canvasViewStore'
import { useSchemaStore } from '@/store/schemaStore'
import { useThemeStore } from '@/store/themeStore'

import { TableNode, type TableFlowNode } from './TableNode'
import styles from './SchemaCanvas.module.scss'

const nodeTypes = {
  tableNode: TableNode,
} satisfies NodeTypes

function relationLabel(sourceName?: string, targetName?: string): string {
  if (!sourceName || !targetName) {
    return ''
  }

  return `${sourceName} -> ${targetName}`
}

function relationPalette(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    return {
      stroke: '#8d9eb8',
      strokeActive: '#35c2ca',
      label: '#ecf2ff',
      labelBg: '#121a28',
      labelBorder: '#41516c',
    }
  }

  return {
    stroke: '#5f6f85',
    strokeActive: '#0a7f86',
    label: '#1f2938',
    labelBg: '#ffffff',
    labelBorder: '#b8c4d8',
  }
}

export function SchemaCanvas() {
  const tables = useSchemaStore((state) => state.tables)
  const relations = useSchemaStore((state) => state.relations)
  const selectedTableId = useSchemaStore((state) => state.selectedTableId)
  const selectTable = useSchemaStore((state) => state.selectTable)
  const setTablePosition = useSchemaStore((state) => state.setTablePosition)
  const addTableInSchema = useSchemaStore((state) => state.addTableInSchema)
  const applyTemplate = useSchemaStore((state) => state.applyTemplate)
  const theme = useThemeStore((state) => state.theme)
  const fitRequestToken = useCanvasViewStore((state) => state.fitRequestToken)
  const centerRequestToken = useCanvasViewStore((state) => state.centerRequestToken)
  const requestFitView = useCanvasViewStore((state) => state.requestFitView)
  const requestCenterSelected = useCanvasViewStore((state) => state.requestCenterSelected)

  const flowRef = useRef<ReactFlowInstance<TableFlowNode, Edge> | null>(null)

  const nodes: TableFlowNode[] = useMemo(
    () =>
      tables.map((table) => ({
        id: table.id,
        type: 'tableNode',
        position: table.position,
        data: {
          table,
          isSelected: table.id === selectedTableId,
          onSelect: selectTable,
        },
      })),
    [tables, selectedTableId, selectTable],
  )

  const edges: Edge[] = useMemo(() => {
    const palette = relationPalette(theme)

    return relations
      .map((relation) => {
        const sourceTable = tables.find((table) => table.id === relation.sourceTableId)
        const targetTable = tables.find((table) => table.id === relation.targetTableId)

        if (!sourceTable || !targetTable) {
          return null
        }

        const sourceColumn = sourceTable.columns.find((column) => column.id === relation.sourceColumnId)
        const targetColumn = targetTable.columns.find((column) => column.id === relation.targetColumnId)
        const isActive = Boolean(
          selectedTableId && (sourceTable.id === selectedTableId || targetTable.id === selectedTableId),
        )
        const edgeStroke = isActive ? palette.strokeActive : palette.stroke

        return {
          id: relation.id,
          source: sourceTable.id,
          target: targetTable.id,
          sourceHandle: `source-${sourceTable.id}`,
          targetHandle: `target-${targetTable.id}`,
          label: relationLabel(sourceColumn?.name, targetColumn?.name),
          animated: false,
          markerEnd: {
            type: 'arrowclosed',
            color: edgeStroke,
          },
          style: {
            strokeWidth: isActive ? 2 : 1.4,
            stroke: edgeStroke,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          labelStyle: {
            fill: palette.label,
            fontSize: 11,
            fontWeight: 600,
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 6,
          labelBgStyle: {
            fill: palette.labelBg,
            stroke: palette.labelBorder,
            strokeWidth: 1,
          },
        } as Edge
      })
      .filter((edge): edge is Edge => edge !== null)
  }, [relations, selectedTableId, tables, theme])

  useEffect(() => {
    if (!flowRef.current) {
      return
    }

    flowRef.current.fitView({
      duration: 220,
      padding: 0.16,
    })
  }, [fitRequestToken])

  useEffect(() => {
    if (!flowRef.current) {
      return
    }

    if (!selectedTableId) {
      flowRef.current.fitView({ duration: 220, padding: 0.16 })
      return
    }

    const node = flowRef.current.getNode(selectedTableId)
    if (!node) {
      flowRef.current.fitView({ duration: 220, padding: 0.16 })
      return
    }

    const width = node.measured?.width ?? node.width ?? 260
    const height = node.measured?.height ?? node.height ?? 140
    const centerX = node.position.x + width / 2
    const centerY = node.position.y + height / 2

    flowRef.current.setCenter(centerX, centerY, {
      zoom: 1.08,
      duration: 260,
    })
  }, [centerRequestToken, selectedTableId])

  function handleQuickAdd() {
    const selectedTable = tables.find((table) => table.id === selectedTableId)
    const targetSchema = selectedTable?.schema ?? (tables[0]?.schema ?? 'public')

    addTableInSchema(targetSchema)
    window.setTimeout(() => {
      requestCenterSelected()
    }, 60)
  }

  return (
    <section className={styles.canvasRoot}>
      <p className={styles.canvasIntro}>Trascina le tabelle e visualizza i collegamenti foreign key.</p>
      {tables.length === 0 ? (
        <EmptyState
          title="Canvas vuoto"
          body="Crea almeno una tabella per iniziare a modellare lo schema PostgreSQL in vista grafica."
        >
          <div className={styles.quickStart}>
            <Button onClick={() => addTableInSchema('public')}>
              <Plus size={12} />
              Nuova tabella
            </Button>

            <div className={styles.quickTemplates}>
              {PROJECT_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant="ghost"
                  compact
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Applicare il template "${template.name}"? Sovrascrivera il progetto corrente.`,
                    )

                    if (!confirmed) {
                      return
                    }

                    applyTemplate(template.id)
                  }}
                >
                  <LayoutTemplate size={12} />
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        </EmptyState>
      ) : (
        <div className={styles.canvasWrapper}>
          <div className={styles.canvasActions}>
            <Button compact onClick={handleQuickAdd}>
              <Plus size={12} />
              Nuova tabella
            </Button>
            <Button compact onClick={requestFitView}>
              <ScanSearch size={12} />
              Fit all
            </Button>
            <Button compact onClick={requestCenterSelected} disabled={!selectedTableId}>
              <Focus size={12} />
              Center selected
            </Button>
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            onInit={(instance) => {
              flowRef.current = instance
            }}
            onNodeDragStop={(_, node) => {
              setTablePosition(node.id, node.position.x, node.position.y)
            }}
            onNodeClick={(_, node) => {
              selectTable(node.id)
            }}
          >
            <Background color={theme === 'dark' ? '#2f4569' : '#c9d5e9'} gap={22} />
            <MiniMap pannable zoomable className={styles.minimap} />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </section>
  )
}
