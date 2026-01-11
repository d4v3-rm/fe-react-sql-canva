import type { ColumnModel, DatabaseModel, RelationModel, TableModel } from '@/domain/schema'
import { createId } from '@/lib/id'

export function createDefaultColumn(name = 'id'): ColumnModel {
  return {
    id: createId('col'),
    name,
    type: name === 'id' ? 'serial' : 'varchar',
    length: name === 'id' ? undefined : 255,
    scale: undefined,
    nullable: name !== 'id',
    defaultValue: '',
    isPrimary: name === 'id',
    isUnique: false,
    autoIncrement: name === 'id',
  }
}

export function createDefaultDatabase(): DatabaseModel {
  return {
    id: createId('db'),
    name: 'app_database',
    owner: 'postgres',
    encoding: 'UTF8',
    lcCollate: 'en_US.UTF-8',
    lcCType: 'en_US.UTF-8',
    template: 'template0',
    schemas: ['public'],
    extensions: ['uuid-ossp'],
  }
}

export function createDefaultTable(index: number, schema = 'public'): TableModel {
  return {
    id: createId('tbl'),
    schema,
    name: `table_${index}`,
    columns: [createDefaultColumn('id')],
    position: {
      x: 80 + (index % 3) * 320,
      y: 80 + Math.floor(index / 3) * 220,
    },
  }
}

export function createDefaultRelationName(sourceTable: string, sourceColumn: string): string {
  return `fk_${sourceTable}_${sourceColumn}`.toLowerCase()
}

export function createDefaultRelation(
  sourceTableId: string,
  sourceColumnId: string,
  targetTableId: string,
  targetColumnId: string,
  constraintName: string,
): RelationModel {
  return {
    id: createId('rel'),
    constraintName,
    sourceTableId,
    sourceColumnId,
    targetTableId,
    targetColumnId,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  }
}
