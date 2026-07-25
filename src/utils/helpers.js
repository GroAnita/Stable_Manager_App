import { getLanguage, t } from '../i18n/index.js'

const LOCALES = { en: 'en-GB', no: 'nb-NO' }
const currentLocale = () => LOCALES[getLanguage()] || 'en-GB'

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escapes a value for safe interpolation into HTML markup, preventing
 * stored/DOM-based XSS when rendering user-supplied text via `innerHTML`.
 *
 * @param {unknown} value - Value to escape. Non-string values are stringified.
 * @returns {string} HTML-escaped string.
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char])
}

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function formatDate(dateStr, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat(currentLocale(), options).format(date)
}

let currentCurrency = 'EUR'

export function setCurrency(code) {
  if (code) currentCurrency = code
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: currentCurrency,
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

/**
 * Stable fees run the 26th of one month through the 25th of the next, so a
 * per-day rate (e.g. included hay) needs the actual length of that cycle,
 * which varies with how long the starting month is (28-31 days).
 *
 * @param {Date|string} due - The cycle's due date (25th of some month).
 * @returns {number} Number of days in that cycle.
 */
export function daysInBillingCycle(due) {
  const dueDate = due instanceof Date ? due : new Date(due)
  const cycleStart = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, 26)
  return Math.round((dueDate - cycleStart) / 86400000) + 1
}

/**
 * Length of the billing cycle currently in progress (or about to be
 * invoiced), as of `referenceDate`. See {@link daysInBillingCycle}.
 *
 * @param {Date} [referenceDate] - Any date inside the cycle to measure. Defaults to today.
 * @returns {number} Number of days in that cycle.
 */
export function currentBillingCycleDays(referenceDate = new Date()) {
  return daysInBillingCycle(currentBillingCycleDueDate(referenceDate))
}

/**
 * The due date (25th of some month) of the billing cycle currently in
 * progress as of `referenceDate` — the same invoice a contract change made
 * today would land on.
 *
 * @param {Date} [referenceDate] - Defaults to today.
 * @returns {string} ISO date string ('YYYY-MM-DD').
 */
export function currentBillingCycleDueDate(referenceDate = new Date()) {
  const dueMonth =
    referenceDate.getDate() >= 26 ? referenceDate.getMonth() + 1 : referenceDate.getMonth()
  const due = new Date(referenceDate.getFullYear(), dueMonth, 25)
  const pad = (value) => String(value).padStart(2, '0')
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`
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
  const rtf = new Intl.RelativeTimeFormat(getLanguage(), { numeric: 'auto' })
  const ranges = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, value] of ranges) {
    if (Math.abs(seconds) >= value || unit === 'minute')
      return rtf.format(Math.round(seconds / value), unit)
  }
  return t('common.justNow')
}

/**
 * Renders a horse's profile photo if it has one (a signed Supabase Storage
 * URL), otherwise falls back to a letter avatar. `classes` should describe
 * size/shape only (e.g. 'h-14 w-14 rounded-2xl text-2xl') — this adds
 * whatever else each variant needs.
 */
export function horseAvatarHtml(horse, classes) {
  const hasPhoto = horse.photo && /^https?:\/\//.test(horse.photo)
  return hasPhoto
    ? `<div class="${classes} overflow-hidden bg-forest/10"><img src="${escapeHtml(horse.photo)}" alt="" class="h-full w-full object-cover" /></div>`
    : `<div class="${classes} flex items-center justify-center bg-forest/10 font-semibold text-forest">${escapeHtml(horse.name.charAt(0))}</div>`
}

export function getStatusColor(status = '') {
  const normalized = String(status).toLowerCase()
  if (
    ['paid', 'active', 'available', 'completed', 'healthy', 'confirmed', 'up to date'].includes(
      normalized,
    )
  )
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  if (
    ['due', 'reserved', 'medium', 'pending', 'warning', 'partially paid', 'due soon'].includes(
      normalized,
    )
  )
    return 'bg-amber-100 text-amber-800 border border-amber-200'
  if (['overdue', 'maintenance', 'expired', 'cancelled', 'high', 'unpaid'].includes(normalized))
    return 'bg-red-100 text-red-800 border border-red-200'
  if (['occupied', 'scheduled', 'info', 'low', 'farrier', 'vet', 'training'].includes(normalized))
    return 'bg-sky-100 text-sky-800 border border-sky-200'
  return 'bg-slate-100 text-slate-700 border border-slate-200'
}
