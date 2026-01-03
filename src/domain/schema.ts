export const DATA_TYPES = [
  'smallint',
  'integer',
  'bigint',
  'serial',
  'bigserial',
  'varchar',
  'text',
  'boolean',
  'date',
  'timestamp',
  'timestamptz',
  'numeric',
  'uuid',
  'jsonb',
] as const

export type DataType = (typeof DATA_TYPES)[number]

export const FK_ACTIONS = ['NO ACTION', 'CASCADE', 'SET NULL', 'RESTRICT', 'SET DEFAULT'] as const

export type ForeignKeyAction = (typeof FK_ACTIONS)[number]

export interface ColumnModel {
  id: string
  name: string
  type: DataType
  length?: number
  scale?: number
  nullable: boolean
  defaultValue: string
  isPrimary: boolean
  isUnique: boolean
  autoIncrement: boolean
}

export interface TablePosition {
  x: number
  y: number
}

export interface TableModel {
  id: string
  schema: string
  name: string
  columns: ColumnModel[]
  position: TablePosition
}

export interface RelationModel {
  id: string
  constraintName: string
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
  onDelete: ForeignKeyAction
  onUpdate: ForeignKeyAction
}

export interface SqlCanvasProject {
  version: number
  tables: TableModel[]
  relations: RelationModel[]
  updatedAt: string
}

export interface SqlImportResult {
  tables: TableModel[]
  relations: RelationModel[]
  warnings: string[]
}
