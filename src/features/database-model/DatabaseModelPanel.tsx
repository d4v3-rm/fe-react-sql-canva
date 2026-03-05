import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { t } from '@/i18n'
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
        title: t('databaseModel.schema.title'),
        placeholder: t('databaseModel.schema.placeholder'),
        confirmLabel: t('databaseModel.schema.confirm'),
      })

      if (!raw || raw.trim() === '') {
        return
      }

      const success = addSchema(raw)
      if (success) {
        return
      }

      await alert({
        title: t('databaseModel.schema.invalidTitle'),
        message: t('databaseModel.schema.invalidMessage'),
      })
    })()
  }

  function editSchema(schemaName: string) {
    void (async () => {
      const next = await prompt({
        title: t('databaseModel.schema.renameTitle', { name: schemaName }),
        defaultValue: schemaName,
        confirmLabel: t('databaseModel.schema.renameConfirm'),
      })

      if (!next || next.trim() === '' || next === schemaName) {
        return
      }

      const success = renameSchema(schemaName, next)
      if (success) {
        return
      }

      await alert({
        title: t('databaseModel.schema.renameUnavailableTitle'),
        message: t('databaseModel.schema.renameUnavailableMessage'),
      })
    })()
  }

  function removeSchema(schemaName: string) {
    void (async () => {
      const linkedTables = tables.filter((table) => table.schema === schemaName).length
      const confirmed = await confirm({
        title: t('databaseModel.schema.deleteTitle', { name: schemaName }),
        message:
          linkedTables > 0
            ? t('databaseModel.schema.deleteMessageWithTables', { count: linkedTables })
            : t('databaseModel.schema.deleteMessageWithoutTables'),
        confirmLabel: t('databaseModel.schema.deleteConfirm'),
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
        title: t('databaseModel.extension.title'),
        message: t('databaseModel.extension.message'),
        placeholder: t('databaseModel.extension.placeholder'),
        confirmLabel: t('databaseModel.extension.confirm'),
      })

      if (!raw || raw.trim() === '') {
        return
      }

      const success = addExtension(raw)
      if (success) {
        return
      }

      await alert({
        title: t('databaseModel.extension.invalidTitle'),
        message: t('databaseModel.extension.invalidMessage'),
      })
    })()
  }

  return (
    <Card className={styles.panel} title={t('databaseModel.title')} subtitle={t('databaseModel.subtitle')}>
      <div className={styles.metaGrid}>
        <Field label={t('databaseModel.fieldDatabaseName')}>
          <input value={database.name} onChange={(event) => updateDatabase({ name: event.target.value })} />
        </Field>

        <Field label={t('databaseModel.fieldOwner')}>
          <input value={database.owner} onChange={(event) => updateDatabase({ owner: event.target.value })} />
        </Field>

        <Field label={t('databaseModel.fieldEncoding')}>
          <input value={database.encoding} onChange={(event) => updateDatabase({ encoding: event.target.value })} />
        </Field>

        <Field label={t('databaseModel.fieldLcCollate')}>
          <input value={database.lcCollate} onChange={(event) => updateDatabase({ lcCollate: event.target.value })} />
        </Field>

        <Field label={t('databaseModel.fieldLcCType')}>
          <input value={database.lcCType} onChange={(event) => updateDatabase({ lcCType: event.target.value })} />
        </Field>

        <Field label={t('databaseModel.fieldTemplate')}>
          <input value={database.template} onChange={(event) => updateDatabase({ template: event.target.value })} />
        </Field>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>{t('databaseModel.schemasTitle')}</h4>
          <Button compact onClick={createSchema}>
            <Plus size={12} />
            {t('databaseModel.addSchema')}
          </Button>
        </div>

        <div className={styles.tagList}>
          {database.schemas.map((schemaName) => {
            const tableCount = tables.filter((table) => table.schema === schemaName).length

            return (
              <div key={schemaName} className={styles.tagRow}>
                <strong>{schemaName}</strong>
                <Badge>{t('databaseModel.tableCount', { count: tableCount })}</Badge>
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
          <h4>{t('databaseModel.extensionsTitle')}</h4>
          <Button compact onClick={createExtension}>
            <Plus size={12} />
            {t('databaseModel.addExtension')}
          </Button>
        </div>

        {database.extensions.length === 0 ? <p className={styles.empty}>{t('databaseModel.noExtensions')}</p> : (
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

