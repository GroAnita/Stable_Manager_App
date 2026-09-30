import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

const PALETTE = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-white border-slate-200 text-slate-900',
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 3200)
    return () => window.clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-card ${PALETTE[type] || PALETTE.info}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{message}</p>
        <button className="text-slate-400 hover:text-slate-700" onClick={onDismiss}>
          ✕
        </button>
      </div>
    </div>
  )
}

let pushToast

function ToastRoot() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    pushToast = (message, type) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((current) => [...current, { id, message, type }])
    }
    return () => {
      pushToast = undefined
    }
  }, [])

  const dismiss = (id) => setToasts((current) => current.filter((toast) => toast.id !== id))

  return toasts.map((toast) => (
    <Toast
      key={toast.id}
      message={toast.message}
      type={toast.type}
      onDismiss={() => dismiss(toast.id)}
    />
  ))
}

let mounted = false

export function initNotifications() {
  if (mounted) return
  let container = document.getElementById('toast-root')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-root'
    container.className =
      'fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[100] flex w-[min(92vw,24rem)] flex-col gap-3'
    document.body.appendChild(container)
  }
  createRoot(container).render(<ToastRoot />)
  mounted = true
}

export function notify(message, type = 'info') {
  if (!mounted) initNotifications()
  pushToast?.(message, type)
}
