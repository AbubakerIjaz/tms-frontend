import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { Button } from '../components/ui/Button'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
    warning: (message: string) => void
  }
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4500

const toastStyles: Record<ToastType, { icon: typeof CheckCircle2; className: string }> = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  info: {
    icon: Info,
    className: 'border-brand-200 bg-brand-50 text-brand-800',
  },
  warning: {
    icon: AlertCircle,
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const confirmResolve = useRef<((value: boolean) => void) | null>(null)
  const idRef = useRef(0)

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, type, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (message: string) => pushToast('success', message),
    error: (message: string) => pushToast('error', message),
    info: (message: string) => pushToast('info', message),
    warning: (message: string) => pushToast('warning', message),
  }

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolve.current = resolve
      setConfirmState({ ...options, open: true })
    })
  }, [])

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState(null)
    confirmResolve.current?.(result)
    confirmResolve.current = null
  }, [])

  useEffect(() => {
    if (!confirmState?.open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [confirmState?.open])

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}
      {createPortal(
        <>
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-5"
            aria-live="polite"
          >
            {toasts.map((item) => {
              const style = toastStyles[item.type]
              const Icon = style.icon
              return (
                <div
                  key={item.id}
                  className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-slate-900/10 ${style.className}`}
                  role="status"
                >
                  <Icon size={18} className="mt-0.5 shrink-0" />
                  <p className="min-w-0 flex-1 text-sm font-medium">{item.message}</p>
                  <button
                    type="button"
                    onClick={() => dismissToast(item.id)}
                    className="shrink-0 rounded-lg p-1 opacity-70 transition hover:opacity-100"
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>

          {confirmState?.open && (
            <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <div
                className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm"
                onClick={() => closeConfirm(false)}
              />
              <div
                className="relative w-full max-w-md rounded-t-2xl border border-slate-200/80 bg-white p-5 shadow-2xl sm:rounded-2xl"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
              >
                <h3 id="confirm-title" className="text-lg font-semibold text-slate-900">
                  {confirmState.title}
                </h3>
                {confirmState.message && (
                  <p className="mt-2 text-sm text-slate-600">{confirmState.message}</p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => closeConfirm(false)}>
                    {confirmState.cancelLabel ?? 'Cancel'}
                  </Button>
                  <Button
                    type="button"
                    variant={confirmState.variant === 'danger' ? 'danger' : 'primary'}
                    onClick={() => closeConfirm(true)}
                  >
                    {confirmState.confirmLabel ?? 'Confirm'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
