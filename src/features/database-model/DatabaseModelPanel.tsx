import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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

  function createSchema() {
    const raw = window.prompt('Nome nuovo schema PostgreSQL')
    if (!raw) {
      return
    }

    addSchema(raw)
  }

  function editSchema(schemaName: string) {
    const next = window.prompt('Rinomina schema', schemaName)
    if (!next || next === schemaName) {
      return
    }

    renameSchema(schemaName, next)
  }

  function removeSchema(schemaName: string) {
    const linkedTables = tables.filter((table) => table.schema === schemaName).length
    const confirmed = window.confirm(
      `Eliminare schema "${schemaName}"? ${linkedTables > 0 ? `Le ${linkedTables} tabelle collegate verranno riallocate su uno schema di fallback.` : ''}`,
    )

    if (confirmed) {
      deleteSchema(schemaName)
    }
  }

  function createExtension() {
    const raw = window.prompt('Nome extension PostgreSQL (es. pgcrypto)')
    if (!raw) {
      return
    }

    addExtension(raw)
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
