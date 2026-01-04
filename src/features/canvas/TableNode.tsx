import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import clsx from 'clsx'

import type { TableModel } from '@/domain/schema'

import styles from './TableNode.module.scss'

export interface TableNodeData extends Record<string, unknown> {
  table: TableModel
  isSelected: boolean
  onSelect: (tableId: string) => void
}

export type TableFlowNode = Node<TableNodeData, 'tableNode'>

export function TableNode({ data }: NodeProps<TableFlowNode>) {
  return (
    <article className={clsx(styles.node, data.isSelected && styles.selected)} onClick={() => data.onSelect(data.table.id)}>
      <Handle id={`target-${data.table.id}`} type="target" position={Position.Left} className={styles.handle} />
      <Handle id={`source-${data.table.id}`} type="source" position={Position.Right} className={styles.handle} />
      <header>
        <strong>{data.table.name}</strong>
        <span>{data.table.schema}</span>
      </header>

      <ul>
        {data.table.columns.map((column) => (
          <li key={column.id}>
            <span className={styles.columnName}>{column.name}</span>
            <span className={styles.columnType}>{column.type}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
