import { useMemo } from 'react'
import { Background, Controls, MiniMap, ReactFlow, type Edge, type NodeTypes } from '@xyflow/react'

import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSchemaStore } from '@/store/schemaStore'

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

export function SchemaCanvas() {
  const tables = useSchemaStore((state) => state.tables)
  const relations = useSchemaStore((state) => state.relations)
  const selectedTableId = useSchemaStore((state) => state.selectedTableId)
  const selectTable = useSchemaStore((state) => state.selectTable)
  const setTablePosition = useSchemaStore((state) => state.setTablePosition)

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
    return relations
      .map((relation) => {
        const sourceTable = tables.find((table) => table.id === relation.sourceTableId)
        const targetTable = tables.find((table) => table.id === relation.targetTableId)

        if (!sourceTable || !targetTable) {
          return null
        }

        const sourceColumn = sourceTable.columns.find((column) => column.id === relation.sourceColumnId)
        const targetColumn = targetTable.columns.find((column) => column.id === relation.targetColumnId)

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
          },
          style: {
            strokeWidth: 1.5,
            stroke: '#0f8a8d',
          },
          labelStyle: {
            fill: '#1f2a44',
            fontSize: 11,
            fontWeight: 600,
          },
        } as Edge
      })
      .filter((edge): edge is Edge => edge !== null)
  }, [relations, tables])

  return (
    <Card className={styles.canvasCard} title="Canvas Relazionale" subtitle="Trascina le tabelle e visualizza i collegamenti foreign key.">
      {tables.length === 0 ? (
        <EmptyState
          title="Canvas vuoto"
          body="Crea almeno una tabella per iniziare a modellare lo schema PostgreSQL in vista grafica."
        />
      ) : (
        <div className={styles.canvasWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            onNodeDragStop={(_, node) => {
              setTablePosition(node.id, node.position.x, node.position.y)
            }}
            onNodeClick={(_, node) => {
              selectTable(node.id)
            }}
          >
            <Background color="#c9d5e9" gap={22} />
            <MiniMap pannable zoomable className={styles.minimap} />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </Card>
  )
}
