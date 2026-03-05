import clsx from 'clsx'
import { Binary, MoonStar, Network, PanelsTopLeft, SunMedium } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui/Button'
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { t } from '@/i18n'
import { DatabaseModelPanel } from '@/features/database-model/DatabaseModelPanel'
import { SqlPreview } from '@/features/sql-preview/SqlPreview'
import { RelationManager } from '@/features/table-editor/RelationManager'
import { TableEditor } from '@/features/table-editor/TableEditor'
import { useInspectorStore } from '@/store/inspectorStore'
import type { LayoutPreset, QuickLayoutPreset } from '@/store/layoutStore'
import { useSelectedTable, useSchemaStore } from '@/store/schemaStore'
import { useThemeStore } from '@/store/themeStore'

import styles from './InspectorPanel.module.scss'

interface InspectorPanelProps {
  sqlScript: string
  activeLayoutPreset: LayoutPreset
  onApplyLayoutPreset: (preset: QuickLayoutPreset) => void
}

const LAYOUT_PRESETS: { id: QuickLayoutPreset; label: string }[] = [
  { id: 'balanced', label: t('inspector.presets.balanced') },
  { id: 'focus_canvas', label: t('inspector.presets.canvas') },
  { id: 'focus_inspector', label: t('inspector.presets.inspector') },
  { id: 'focus_sql', label: t('inspector.presets.sql') },
]

const LAYOUT_PRESET_LABELS: Record<LayoutPreset, string> = {
  balanced: t('inspector.presets.balanced'),
  focus_canvas: t('inspector.presets.canvas'),
  focus_inspector: t('inspector.presets.inspector'),
  focus_sql: t('inspector.presets.sql'),
  custom: t('inspector.presets.custom'),
}

export function InspectorPanel({ sqlScript, activeLayoutPreset, onApplyLayoutPreset }: InspectorPanelProps) {
  const activeTab = useInspectorStore((state) => state.activeTab)
  const setActiveTab = useInspectorStore((state) => state.setActiveTab)

  const selectedTable = useSelectedTable()
  const database = useSchemaStore((state) => state.database)
  const relationCount = useSchemaStore((state) => state.relations.length)
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  const subtitle = useMemo(() => {
    if (!selectedTable) {
      return t('inspector.subtitleDatabase', {
        database: database.name,
        schemaCount: database.schemas.length,
        relationCount,
      })
    }

    return t('inspector.subtitleTable', {
      qualifiedName: `${selectedTable.schema}.${selectedTable.name}`,
      columnCount: selectedTable.columns.length,
    })
  }, [database.name, database.schemas.length, relationCount, selectedTable])

  return (
    <div className={styles.inspector}>
      <section className={styles.tabsCard}>
        <div className={styles.tabsMeta}>
          <h3>{t('inspector.title')}</h3>
          <p>{subtitle}</p>
        </div>

        <CollapsiblePanel title={t('inspector.view.title')} subtitle={t('inspector.view.subtitle')} defaultOpen={false}>
          <div className={styles.viewHeader}>
            <Button compact variant="ghost" onClick={toggleTheme}>
              {theme === 'dark' ? <MoonStar size={12} /> : <SunMedium size={12} />}
              {theme === 'dark' ? t('inspector.view.theme.dark') : t('inspector.view.theme.light')}
            </Button>

            <span className={styles.presetMeta}>
              {t('inspector.view.presetLabel', { preset: LAYOUT_PRESET_LABELS[activeLayoutPreset] })}
            </span>
          </div>

          <div className={styles.presetButtons}>
            {LAYOUT_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                compact
                variant="ghost"
                className={clsx(activeLayoutPreset === preset.id && styles.presetButtonActive)}
                onClick={() => onApplyLayoutPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CollapsiblePanel>

        <div className={styles.tabButtons}>
          <button
            className={clsx(styles.tabButton, activeTab === 'structure' && styles.activeTab)}
            onClick={() => setActiveTab('structure')}
            type="button"
          >
            <PanelsTopLeft size={13} />
            {t('inspector.tabs.structure')}
          </button>

          <button
            className={clsx(styles.tabButton, activeTab === 'relations' && styles.activeTab)}
            onClick={() => setActiveTab('relations')}
            type="button"
          >
            <Network size={13} />
            {t('inspector.tabs.relations')}
          </button>

          <button
            className={clsx(styles.tabButton, activeTab === 'sql' && styles.activeTab)}
            onClick={() => setActiveTab('sql')}
            type="button"
          >
            <Binary size={13} />
            {t('inspector.tabs.sql')}
          </button>
        </div>
      </section>

      <section className={styles.tabContent}>
        {activeTab === 'structure' ? (
          selectedTable ? <TableEditor showRelations={false} /> : <DatabaseModelPanel />
        ) : null}

        {activeTab === 'relations' ? (
          selectedTable ? (
            <RelationManager tableId={selectedTable.id} />
          ) : (
            <section className={styles.emptyPanel}>
              <EmptyState
                title={t('inspector.relationsEmptyTitle')}
                body={t('inspector.relationsEmptyBody')}
              />
            </section>
          )
        ) : null}

        {activeTab === 'sql' ? <SqlPreview sql={sqlScript} /> : null}
      </section>
    </div>
  )
}
