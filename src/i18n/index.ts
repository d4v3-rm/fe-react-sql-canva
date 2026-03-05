import en from '@/i18n/locales/en.json'

interface TranslationBundle {
  [key: string]: string | TranslationBundle
}

type Value = string | TranslationBundle

type Locale = 'en'

const dictionaries: Record<Locale, TranslationBundle> = {
  en,
}

const activeLocale: Locale = 'en'

function isTranslationBundle(value: Value | undefined): value is TranslationBundle {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function resolveValue(bundle: TranslationBundle, rawKey: string): string | undefined {
  const segments = rawKey.split('.')
  let current: Value = bundle

  for (const segment of segments) {
    if (!isTranslationBundle(current)) {
      return undefined
    }

    current = current[segment]
  }

  return typeof current === 'string' ? current : undefined
}

export function t(key: string, variables?: Record<string, string | number>): string {
  const localeBundle = dictionaries[activeLocale] ?? dictionaries.en
  const raw = resolveValue(localeBundle, key)

  if (!raw) {
    return key
  }

  if (!variables || Object.keys(variables).length === 0) {
    return raw
  }

  return Object.entries(variables).reduce((acc, [name, value]) => acc.replace(`{${name}}`, String(value)), raw)
}
