import { useMemo } from 'react'

import { SchemaCanvas } from '@/features/canvas/SchemaCanvas'
import { SqlPreview } from '@/features/sql-preview/SqlPreview'
import { TableEditor } from '@/features/table-editor/TableEditor'
import { TableList } from '@/features/table-list/TableList'
import { Toolbar } from '@/features/toolbar/Toolbar'
import { generateProjectSql } from '@/lib/sql/generateSql'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './App.module.scss'

export default function App() {
  const tables = useSchemaStore((state) => state.tables)
  const relations = useSchemaStore((state) => state.relations)

  const sqlScript = useMemo(
    () =>
      generateProjectSql({
        tables,
        relations,
      }),
    [tables, relations],
  )

  return (
    <div className={styles.page}>
      <Toolbar sqlScript={sqlScript} />

      <main className={styles.layout}>
        <aside className={styles.leftPane}>
          <TableList />
        </aside>

        <section className={styles.centerPane}>
          <SchemaCanvas />
        </section>

        <aside className={styles.rightPane}>
          <TableEditor />
          <SqlPreview sql={sqlScript} />
        </aside>
      </main>
    </div>
  )
}
