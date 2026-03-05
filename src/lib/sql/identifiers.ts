const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/i

export function quoteIdentifier(identifier: string): string {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    return `"${identifier.replaceAll('"', '""')}"`
  }

  return `"${identifier}"`
}

export function qualifiedTableName(schema: string, name: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`
}

export function normalizeIdentifier(raw: string): string {
  return raw.replace(/^"|"$/g, '').trim()
}
