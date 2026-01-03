import type { ColumnModel } from '@/domain/schema'

const TYPE_ALIASES: Record<string, string> = {
  int: 'integer',
  integer: 'integer',
  bigint: 'bigint',
  smallint: 'smallint',
  serial: 'serial',
  bigserial: 'bigserial',
  bool: 'boolean',
  boolean: 'boolean',
  varchar: 'varchar',
  'character varying': 'varchar',
  text: 'text',
  date: 'date',
  timestamp: 'timestamp',
  'timestamp without time zone': 'timestamp',
  timestamptz: 'timestamptz',
  'timestamp with time zone': 'timestamptz',
  numeric: 'numeric',
  decimal: 'numeric',
  uuid: 'uuid',
  jsonb: 'jsonb',
  json: 'jsonb',
}

export function normalizeDataType(rawType: string): { type: ColumnModel['type']; length?: number; scale?: number } {
  const cleaned = rawType.trim().toLowerCase().replace(/\s+/g, ' ')
  const match = cleaned.match(/^([a-z ]+)(?:\(([^)]+)\))?$/i)
  const baseName = match?.[1]?.trim() ?? cleaned
  const normalized = (TYPE_ALIASES[baseName] ?? 'varchar') as ColumnModel['type']

  let length: number | undefined
  let scale: number | undefined

  if (match?.[2]) {
    const [first, second] = match[2].split(',').map((part) => Number(part.trim()))
    if (Number.isFinite(first)) {
      length = first
    }

    if (Number.isFinite(second)) {
      scale = second
    }
  }

  return {
    type: normalized,
    length,
    scale,
  }
}

export function getColumnSqlType(column: ColumnModel): string {
  if (column.autoIncrement && (column.type === 'serial' || column.type === 'bigserial')) {
    return column.type
  }

  if (column.type === 'varchar') {
    return column.length ? `varchar(${column.length})` : 'varchar(255)'
  }

  if (column.type === 'numeric') {
    if (column.length && column.scale !== undefined) {
      return `numeric(${column.length},${column.scale})`
    }

    if (column.length) {
      return `numeric(${column.length})`
    }
  }

  return column.type
}
