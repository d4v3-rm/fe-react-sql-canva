import type { PropsWithChildren } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

import styles from './CollapsiblePanel.module.scss'

interface CollapsiblePanelProps {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  className?: string
  contentClassName?: string
}

export function CollapsiblePanel({
  title,
  subtitle,
  defaultOpen = true,
  className,
  contentClassName,
  children,
}: PropsWithChildren<CollapsiblePanelProps>) {
  return (
    <details className={clsx(styles.panel, className)} open={defaultOpen}>
      <summary className={styles.summary}>
        <div className={styles.meta}>
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <ChevronDown size={14} />
      </summary>

      <div className={clsx(styles.content, contentClassName)}>{children}</div>
    </details>
  )
}
