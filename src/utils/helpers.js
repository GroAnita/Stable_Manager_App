export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function formatDate(dateStr, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('en-GB', options).format(date)
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export function capitalize(str = '') {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}

export function daysUntil(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.ceil((date - today) / 86400000)
}

export function isOverdue(dateStr) {
  return daysUntil(dateStr) < 0
}

export function debounce(fn, delay = 250) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = window.setTimeout(() => fn(...args), delay)
  }
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '—'
  const seconds = Math.round((new Date(dateStr) - new Date()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const ranges = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, value] of ranges) {
    if (Math.abs(seconds) >= value || unit === 'minute') return rtf.format(Math.round(seconds / value), unit)
  }
  return 'just now'
}

export function getStatusColor(status = '') {
  const normalized = String(status).toLowerCase()
  if (['paid', 'active', 'available', 'completed', 'healthy', 'confirmed', 'up to date'].includes(normalized)) return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  if (['due', 'reserved', 'medium', 'pending', 'warning', 'partially paid', 'due soon'].includes(normalized)) return 'bg-amber-100 text-amber-800 border border-amber-200'
  if (['overdue', 'maintenance', 'expired', 'cancelled', 'high', 'unpaid'].includes(normalized)) return 'bg-red-100 text-red-800 border border-red-200'
  if (['occupied', 'scheduled', 'info', 'low', 'farrier', 'vet', 'training'].includes(normalized)) return 'bg-sky-100 text-sky-800 border border-sky-200'
  return 'bg-slate-100 text-slate-700 border border-slate-200'
}
