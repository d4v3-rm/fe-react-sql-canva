import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'

import { Button } from '@/components/ui/Button'
import { t } from '@/i18n'

import {
  DialogContext,
  type AlertDialogOptions,
  type ConfirmDialogOptions,
  type DialogContextValue,
  type PromptDialogOptions,
} from './dialogContext'
import styles from './DialogProvider.module.scss'

interface ConfirmDialogRequest {
  id: number
  kind: 'confirm'
  options: ConfirmDialogOptions
  resolve: (value: boolean) => void
}

interface PromptDialogRequest {
  id: number
  kind: 'prompt'
  options: PromptDialogOptions
  resolve: (value: string | null) => void
}

interface AlertDialogRequest {
  id: number
  kind: 'alert'
  options: AlertDialogOptions
  resolve: () => void
}

type DialogRequest = ConfirmDialogRequest | PromptDialogRequest | AlertDialogRequest

function nextDialogId(current: number): number {
  return current + 1
}

export function DialogProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<DialogRequest[]>([])

  const idRef = useRef(0)
  const promptInputRef = useRef<HTMLInputElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  const activeDialog = queue[0] ?? null

  const shiftQueue = useCallback((resolver: (request: DialogRequest) => void) => {
    setQueue((current) => {
      const [request, ...rest] = current
      if (!request) {
        return current
      }

      resolver(request)
      return rest
    })
  }, [])

  const closeWithCancel = useCallback(() => {
    shiftQueue((request) => {
      if (request.kind === 'alert') {
        request.resolve()
        return
      }

      if (request.kind === 'confirm') {
        request.resolve(false)
        return
      }

      request.resolve(null)
    })
  }, [shiftQueue])

  const closeWithConfirm = useCallback(() => {
    shiftQueue((request) => {
      if (request.kind === 'alert') {
        request.resolve()
        return
      }

      if (request.kind === 'confirm') {
        request.resolve(true)
        return
      }

      const typedValue = promptInputRef.current?.value ?? request.options.defaultValue ?? ''
      request.resolve(typedValue)
    })
  }, [shiftQueue])

  useEffect(() => {
    if (!activeDialog) {
      return
    }

    const focusTimer = window.setTimeout(() => {
      if (activeDialog.kind === 'prompt') {
        promptInputRef.current?.focus()
        promptInputRef.current?.select()
        return
      }

      confirmButtonRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
    }
  }, [activeDialog])

  useEffect(() => {
    if (!activeDialog) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      closeWithCancel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeDialog, closeWithCancel])

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      idRef.current = nextDialogId(idRef.current)
      const request: ConfirmDialogRequest = {
        id: idRef.current,
        kind: 'confirm',
        options,
        resolve,
      }

      setQueue((current) => [...current, request])
    })
  }, [])

  const prompt = useCallback((options: PromptDialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      idRef.current = nextDialogId(idRef.current)
      const request: PromptDialogRequest = {
        id: idRef.current,
        kind: 'prompt',
        options,
        resolve,
      }

      setQueue((current) => [...current, request])
    })
  }, [])

  const alert = useCallback((options: AlertDialogOptions): Promise<void> => {
    return new Promise((resolve) => {
      idRef.current = nextDialogId(idRef.current)
      const request: AlertDialogRequest = {
        id: idRef.current,
        kind: 'alert',
        options,
        resolve,
      }

      setQueue((current) => [...current, request])
    })
  }, [])

  const contextValue = useMemo<DialogContextValue>(
    () => ({
      confirm,
      prompt,
      alert,
    }),
    [alert, confirm, prompt],
  )

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {activeDialog ? (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) {
              return
            }

            closeWithCancel()
          }}
          role="presentation"
        >
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={`dialog-title-${activeDialog.id}`}>
            <header className={styles.dialogHeader}>
              <h2 id={`dialog-title-${activeDialog.id}`}>{activeDialog.options.title}</h2>
            </header>

            {activeDialog.options.message ? <p className={styles.dialogMessage}>{activeDialog.options.message}</p> : null}

            {activeDialog.kind === 'prompt' ? (
              <input
                key={activeDialog.id}
                ref={promptInputRef}
                className={styles.promptInput}
                defaultValue={activeDialog.options.defaultValue ?? ''}
                placeholder={activeDialog.options.placeholder}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return
                  }

                  event.preventDefault()
                  closeWithConfirm()
                }}
              />
            ) : null}

            <footer className={styles.actions}>
              {activeDialog.kind !== 'alert' ? (
                <Button variant="ghost" compact onClick={closeWithCancel}>
                  {activeDialog.options.cancelLabel ?? t('dialog.cancel')}
                </Button>
              ) : null}

              <Button
                ref={confirmButtonRef}
                variant={activeDialog.options.tone === 'danger' ? 'danger' : 'primary'}
                compact
                onClick={closeWithConfirm}
              >
                {activeDialog.options.confirmLabel ?? (activeDialog.kind === 'alert' ? t('dialog.close') : t('dialog.confirm'))}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </DialogContext.Provider>
  )
}
