import { AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useSchemaStore } from '@/store/schemaStore'

import styles from './SqlPreview.module.scss'

interface SqlPreviewProps {
  sql: string
}

export function SqlPreview({ sql }: SqlPreviewProps) {
  const warnings = useSchemaStore((state) => state.importWarnings)

  return (
    <Card title="SQL Generato" subtitle="Script PostgreSQL creato in tempo reale dal modello.">
      {warnings.length > 0 ? (
        <div className={styles.warningBox}>
          <Badge tone="warning">
            <AlertTriangle size={12} />
            Warning import
          </Badge>
          <ul>
            {warnings.map((warning, index) => (
              <li key={`${warning}_${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <pre className={styles.sqlBlock}>{sql}</pre>
    </Card>
  )
}
