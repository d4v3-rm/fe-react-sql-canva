import type { PropsWithChildren } from 'react'

import styles from './EmptyState.module.scss'

interface EmptyStateProps {
  title: string
  body: string
}

export function EmptyState({ title, body, children }: PropsWithChildren<EmptyStateProps>) {
  return (
    <div className={styles.emptyState}>
      <h4>{title}</h4>
      <p>{body}</p>
      {children}
    </div>
  )
}
