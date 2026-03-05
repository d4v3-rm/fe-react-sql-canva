import { forwardRef, type ButtonHTMLAttributes, type PropsWithChildren } from 'react'
import clsx from 'clsx'

import styles from './Button.module.scss'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  compact?: boolean
}

export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(function Button(
  { children, variant = 'secondary', compact = false, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(styles.button, styles[variant], compact && styles.compact, className)}
      type={props.type ?? 'button'}
      {...props}
    >
      {children}
    </button>
  )
})
