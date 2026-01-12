import clsx from 'clsx'
import { Binary, Network, PanelsTopLeft } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { DatabaseModelPanel } from '@/features/database-model/DatabaseModelPanel'
import { SqlPreview } from '@/features/sql-preview/SqlPreview'
import { RelationManager } from '@/features/table-editor/RelationManager'
import { TableEditor } from '@/features/table-editor/TableEditor'
import { useSelectedTable, useSchemaStore } from '@/store/schemaStore'

import styles from './InspectorPanel.module.scss'

interface InspectorPanelProps {
  sqlScript: string
}

type InspectorTab = 'structure' | 'relations' | 'sql'

export function InspectorPanel({ sqlScript }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('structure')

  const selectedTable = useSelectedTable()
  const database = useSchemaStore((state) => state.database)
  const relationCount = useSchemaStore((state) => state.relations.length)

  const subtitle = useMemo(() => {
    if (!selectedTable) {
      return `Database ${database.name} | ${database.schemas.length} schemi | ${relationCount} relazioni`
    }

    return `Tabella ${selectedTable.schema}.${selectedTable.name} | ${selectedTable.columns.length} colonne`
  }, [database.name, database.schemas.length, relationCount, selectedTable])

  return (
    <div className={styles.inspector}>
      <Card className={styles.tabsCard} title="Inspector" subtitle={subtitle}>
        <div className={styles.tabButtons}>
          <button
            className={clsx(styles.tabButton, activeTab === 'structure' && styles.activeTab)}
            onClick={() => setActiveTab('structure')}
            type="button"
          >
            <PanelsTopLeft size={13} />
            Struttura
          </button>

          <button
            className={clsx(styles.tabButton, activeTab === 'relations' && styles.activeTab)}
            onClick={() => setActiveTab('relations')}
            type="button"
          >
            <Network size={13} />
            Relazioni
          </button>

          <button
            className={clsx(styles.tabButton, activeTab === 'sql' && styles.activeTab)}
            onClick={() => setActiveTab('sql')}
            type="button"
          >
            <Binary size={13} />
            SQL
          </button>
        </div>
      </Card>

      <section className={styles.tabContent}>
        {activeTab === 'structure' ? (
          selectedTable ? (
            <TableEditor showRelations={false} />
          ) : (
            <DatabaseModelPanel />
          )
        ) : null}

        {activeTab === 'relations' ? (
          selectedTable ? (
            <RelationManager tableId={selectedTable.id} />
          ) : (
            <Card title="Relazioni" subtitle="Seleziona una tabella per gestire FK e constraint.">
              <EmptyState
                title="Nessuna tabella selezionata"
                body="Apri una tabella dall'explorer o dal canvas per creare e modificare relazioni."
              />
            </Card>
          )
        ) : null}

        {activeTab === 'sql' ? <SqlPreview sql={sqlScript} /> : null}
      </section>
    </div>
  )
}
