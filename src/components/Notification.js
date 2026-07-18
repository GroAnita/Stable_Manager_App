let container

export function initNotifications() {
  if (document.getElementById('toast-root')) {
    container = document.getElementById('toast-root')
    return
  }
  container = document.createElement('div')
  container.id = 'toast-root'
  container.className = 'fixed right-4 top-4 z-[100] flex w-[min(92vw,24rem)] flex-col gap-3'
  document.body.appendChild(container)
}

export function notify(message, type = 'info') {
  if (!container) initNotifications()
  const palette = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-white border-slate-200 text-slate-900',
  }
  const toast = document.createElement('div')
  toast.className = `rounded-2xl border px-4 py-3 shadow-card ${palette[type] || palette.info}`
  toast.innerHTML = `<div class="flex items-start justify-between gap-3"><p class="text-sm font-medium">${message}</p><button class="text-slate-400 hover:text-slate-700">✕</button></div>`
  container.appendChild(toast)
  const remove = () => toast.remove()
  toast.querySelector('button').addEventListener('click', remove)
  window.setTimeout(remove, 3200)
}
