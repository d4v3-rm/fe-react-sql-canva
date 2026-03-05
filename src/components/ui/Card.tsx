import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import styles from './Card.module.scss'

interface CardProps {
  className?: string
  title?: string
  subtitle?: string
}

export function Card({ className, title, subtitle, children }: PropsWithChildren<CardProps>) {
  return (
    <section className={clsx(styles.card, className)}>
      {(title || subtitle) && (
        <header className={styles.header}>
          {title ? <h3>{title}</h3> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  )
}
