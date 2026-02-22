# 08 - Feature Playbook

Questa guida mostra come implementare feature nuove senza rompere convenzioni.

## Caso A - Aggiungere un nuovo campo a `ColumnModel`

Esempio: `comment?: string`.

Passi:

1. aggiornare `src/domain/schema.ts`
2. aggiornare default in `src/domain/defaults.ts`
3. aggiornare store (`updateColumn`, import/export se necessario)
4. aggiornare SQL generator/parser se il campo ha impatto SQL
5. aggiornare UI `TableEditor`
6. verificare persistenza localStorage

Checklist rapida:

- field serializzato correttamente
- round-trip SQL coerente
- nessun warning lint/build

## Caso B - Nuova azione in Command Palette

Passi:

1. aprire `features/command-palette/CommandPalette.tsx`
2. aggiungere nuovo oggetto `CommandAction` in `actions`
3. usare store esistenti o dialog API
4. assegnare keywords utili per ricerca

Esempio:

```tsx
{
  id: 'layout-balanced',
  label: 'Layout: bilanciato',
  description: 'Ripristina il layout standard.',
  keywords: ['layout', 'reset'],
  icon: <PanelsTopLeft size={14} />,
  run: () => applyLayoutPreset('balanced'),
}
```

## Caso C - Nuovo pannello/section in Inspector

Passi:

1. aggiungere tab type in `inspectorStore` (se necessario)
2. aggiungere bottone tab in `InspectorPanel`
3. aggiungere rendering condizionale contenuto
4. aggiornare eventuale migrazione `sanitizeInspectorTab`

## Caso D - Estendere parser SQL

Passi:

1. aggiornare regex/tokenizer in `parseSql.ts`
2. mantenere compatibilita con script gia supportati
3. aggiungere warning, non crash
4. validare parser con script reali e edge-case

## Caso E - Nuovo template progetto

Passi:

1. aggiornare `src/lib/templates/databaseTemplates.ts`
2. verificare rendering automatico in command palette e canvas
3. verificare import template -> UI -> SQL

## Regola generale

Se una feature tocca piu livelli, l'ordine corretto e:

1. dominio
2. store
3. lib (parser/generator/helper)
4. UI
5. docs
