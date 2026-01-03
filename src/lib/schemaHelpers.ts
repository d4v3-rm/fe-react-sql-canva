import type { ColumnModel, RelationModel, TableModel } from '@/domain/schema'

export function findTableById(tables: TableModel[], tableId: string): TableModel | undefined {
  return tables.find((table) => table.id === tableId)
}

export function findColumnById(table: TableModel | undefined, columnId: string): ColumnModel | undefined {
  if (!table) {
    return undefined
  }

  return table.columns.find((column) => column.id === columnId)
}

export function buildRelationLabel(relation: RelationModel, tables: TableModel[]): string {
  const sourceTable = findTableById(tables, relation.sourceTableId)
  const targetTable = findTableById(tables, relation.targetTableId)
  const sourceColumn = findColumnById(sourceTable, relation.sourceColumnId)
  const targetColumn = findColumnById(targetTable, relation.targetColumnId)

  if (!sourceTable || !targetTable || !sourceColumn || !targetColumn) {
    return relation.constraintName
  }

  return `${sourceTable.name}.${sourceColumn.name} -> ${targetTable.name}.${targetColumn.name}`
}

export function ensureUniqueName(baseName: string, existingNames: string[]): string {
  const normalizedExisting = new Set(existingNames.map((value) => value.toLowerCase()))
  if (!normalizedExisting.has(baseName.toLowerCase())) {
    return baseName
  }

  let index = 2
  while (normalizedExisting.has(`${baseName}_${index}`.toLowerCase())) {
    index += 1
  }

  return `${baseName}_${index}`
}
