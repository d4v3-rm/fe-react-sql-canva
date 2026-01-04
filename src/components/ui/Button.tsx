import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import clsx from 'clsx'

import styles from './Button.module.scss'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  compact?: boolean
}

export function Button({ children, variant = 'secondary', compact = false, className, ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={clsx(styles.button, styles[variant], compact && styles.compact, className)}
      type={props.type ?? 'button'}
      {...props}
    >
      {children}
    </button>
  )
}
