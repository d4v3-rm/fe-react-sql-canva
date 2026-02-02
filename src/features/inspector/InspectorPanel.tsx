import clsx from 'clsx'
import { Binary, Network, PanelsTopLeft } from 'lucide-react'
import { useMemo } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { DatabaseModelPanel } from '@/features/database-model/DatabaseModelPanel'
import { SqlPreview } from '@/features/sql-preview/SqlPreview'
import { RelationManager } from '@/features/table-editor/RelationManager'
import { TableEditor } from '@/features/table-editor/TableEditor'
import { useInspectorStore } from '@/store/inspectorStore'
import { useSelectedTable, useSchemaStore } from '@/store/schemaStore'

import styles from './InspectorPanel.module.scss'

interface InspectorPanelProps {
  sqlScript: string
}

export function InspectorPanel({ sqlScript }: InspectorPanelProps) {
  const activeTab = useInspectorStore((state) => state.activeTab)
  const setActiveTab = useInspectorStore((state) => state.setActiveTab)

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
      <section className={styles.tabsCard}>
        <div className={styles.tabsMeta}>
          <h3>Inspector</h3>
          <p>{subtitle}</p>
        </div>

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
      </section>

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
            <section className={styles.emptyPanel}>
              <EmptyState
                title="Nessuna tabella selezionata"
                body="Apri una tabella dall'explorer o dal canvas per creare e modificare relazioni."
              />
            </section>
          )
        ) : null}

        {activeTab === 'sql' ? <SqlPreview sql={sqlScript} /> : null}
      </section>
    </div>
  )
}
