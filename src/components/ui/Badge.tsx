import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import styles from './Badge.module.scss'

type BadgeTone = 'neutral' | 'warning' | 'success'

interface BadgeProps {
  tone?: BadgeTone
  className?: string
}

export function Badge({ tone = 'neutral', className, children }: PropsWithChildren<BadgeProps>) {
  return <span className={clsx(styles.badge, styles[tone], className)}>{children}</span>
}
