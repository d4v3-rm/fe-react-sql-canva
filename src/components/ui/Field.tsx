import type { PropsWithChildren } from 'react'

import styles from './Field.module.scss'

interface FieldProps {
  label: string
  hint?: string
  htmlFor?: string
}

export function Field({ label, hint, htmlFor, children }: PropsWithChildren<FieldProps>) {
  return (
    <label className={styles.field} htmlFor={htmlFor}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint ? <small className={styles.hint}>{hint}</small> : null}
    </label>
  )
}
