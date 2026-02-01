import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDialog } from '@/components/ui/dialog/useDialog'
import { Field } from '@/components/ui/Field'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './DatabaseModelPanel.module.scss'

export function DatabaseModelPanel() {
  const database = useSchemaStore((state) => state.database)
  const tables = useSchemaStore((state) => state.tables)
  const updateDatabase = useSchemaStore((state) => state.updateDatabase)
  const addSchema = useSchemaStore((state) => state.addSchema)
  const renameSchema = useSchemaStore((state) => state.renameSchema)
  const deleteSchema = useSchemaStore((state) => state.deleteSchema)
  const addExtension = useSchemaStore((state) => state.addExtension)
  const removeExtension = useSchemaStore((state) => state.removeExtension)
  const { alert, confirm, prompt } = useDialog()

  function createSchema() {
    void (async () => {
      const raw = await prompt({
        title: 'Nuovo schema PostgreSQL',
        placeholder: 'public',
        confirmLabel: 'Crea schema',
      })

      if (!raw || raw.trim() === '') {
        return
      }

      const success = addSchema(raw)
      if (success) {
        return
      }

      await alert({
        title: 'Schema non valido',
        message: 'Schema gia esistente o nome non valido.',
      })
    })()
  }

  function editSchema(schemaName: string) {
    void (async () => {
      const next = await prompt({
        title: `Rinomina schema ${schemaName}`,
        defaultValue: schemaName,
        confirmLabel: 'Rinomina',
      })

      if (!next || next.trim() === '' || next === schemaName) {
        return
      }

      const success = renameSchema(schemaName, next)
      if (success) {
        return
      }

      await alert({
        title: 'Rinomina non disponibile',
        message: 'Verifica che il nuovo nome sia valido e non duplicato.',
      })
    })()
  }

  function removeSchema(schemaName: string) {
    void (async () => {
      const linkedTables = tables.filter((table) => table.schema === schemaName).length
      const confirmed = await confirm({
        title: `Eliminare schema "${schemaName}"`,
        message:
          linkedTables > 0
            ? `Le ${linkedTables} tabelle collegate verranno riallocate su uno schema di fallback.`
            : 'Lo schema verra rimosso dal database.',
        confirmLabel: 'Elimina schema',
        tone: 'danger',
      })

      if (confirmed) {
        deleteSchema(schemaName)
      }
    })()
  }

  function createExtension() {
    void (async () => {
      const raw = await prompt({
        title: 'Nuova extension PostgreSQL',
        message: 'Esempio: pgcrypto',
        placeholder: 'pgcrypto',
        confirmLabel: 'Aggiungi extension',
      })

      if (!raw || raw.trim() === '') {
        return
      }

      const success = addExtension(raw)
      if (success) {
        return
      }

      await alert({
        title: 'Extension non valida',
        message: 'Estensione gia esistente o nome non valido.',
      })
    })()
  }

  return (
    <Card className={styles.panel} title="Database" subtitle="Modella il database completo: metadati, schemi, estensioni.">
      <div className={styles.metaGrid}>
        <Field label="Database name">
          <input value={database.name} onChange={(event) => updateDatabase({ name: event.target.value })} />
        </Field>

        <Field label="Owner">
          <input value={database.owner} onChange={(event) => updateDatabase({ owner: event.target.value })} />
        </Field>

        <Field label="Encoding">
          <input value={database.encoding} onChange={(event) => updateDatabase({ encoding: event.target.value })} />
        </Field>

        <Field label="LC_COLLATE">
          <input value={database.lcCollate} onChange={(event) => updateDatabase({ lcCollate: event.target.value })} />
        </Field>

        <Field label="LC_CTYPE">
          <input value={database.lcCType} onChange={(event) => updateDatabase({ lcCType: event.target.value })} />
        </Field>

        <Field label="Template">
          <input value={database.template} onChange={(event) => updateDatabase({ template: event.target.value })} />
        </Field>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Schemas</h4>
          <Button compact onClick={createSchema}>
            <Plus size={12} />
            Aggiungi schema
          </Button>
        </div>

        <div className={styles.tagList}>
          {database.schemas.map((schemaName) => {
            const tableCount = tables.filter((table) => table.schema === schemaName).length

            return (
              <div key={schemaName} className={styles.tagRow}>
                <strong>{schemaName}</strong>
                <Badge>{tableCount} tbl</Badge>
                <Button compact onClick={() => editSchema(schemaName)}>
                  <Pencil size={12} />
                </Button>
                <Button variant="danger" compact onClick={() => removeSchema(schemaName)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Extensions</h4>
          <Button compact onClick={createExtension}>
            <Plus size={12} />
            Aggiungi extension
          </Button>
        </div>

        {database.extensions.length === 0 ? (
          <p className={styles.empty}>Nessuna extension configurata.</p>
        ) : (
          <div className={styles.tagList}>
            {database.extensions.map((extension) => (
              <div key={extension} className={styles.tagRow}>
                <strong>{extension}</strong>
                <Button variant="danger" compact onClick={() => removeExtension(extension)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </Card>
  )
}
