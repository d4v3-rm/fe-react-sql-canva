export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`
}
