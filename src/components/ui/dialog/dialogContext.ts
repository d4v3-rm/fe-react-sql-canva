import { createContext } from 'react'

export type DialogTone = 'default' | 'danger'

export interface DialogBaseOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: DialogTone
}

export type ConfirmDialogOptions = DialogBaseOptions

export type PromptDialogOptions = DialogBaseOptions & {
  defaultValue?: string
  placeholder?: string
}

export type AlertDialogOptions = Omit<DialogBaseOptions, 'cancelLabel'>

export interface DialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
  prompt: (options: PromptDialogOptions) => Promise<string | null>
  alert: (options: AlertDialogOptions) => Promise<void>
}

export const DialogContext = createContext<DialogContextValue | null>(null)
