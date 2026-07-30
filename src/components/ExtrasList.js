import { escapeHtml, formatCurrency, formatDate } from '../utils/helpers.js'
import { t } from '../i18n/index.js'

export const FEED_CATEGORIES = ['Hay', 'Grain', 'Supplements']
export const GENERAL_EXTRA_CATEGORIES = ['Veterinary', 'Farrier', 'Bedding', 'Mucking']

const extraRowTemplate = (entry, { removable }) => `
  <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3" data-extra-id="${entry.id}">
    <div>
      <p class="font-medium text-slate-900">${escapeHtml(entry.item)}${entry.category ? ` <span class="text-xs font-normal text-slate-400">(${escapeHtml(entry.category)})</span>` : ''}</p>
      <p class="mt-1 text-xs text-slate-500">${entry.quantity}${entry.unit ? ` ${escapeHtml(entry.unit)}` : ''} · ${formatCurrency(entry.amount)} · ${formatDate(entry.date)}</p>
    </div>
    ${removable ? `<button type="button" class="btn-ghost px-3 py-2" data-remove-extra="${entry.id}">${t('common.remove')}</button>` : ''}
  </div>`

export const extrasListHtml = (extras, { removable = true } = {}) =>
  extras.length
    ? extras.map((entry) => extraRowTemplate(entry, { removable })).join('')
    : `<p class="text-sm text-slate-500">${t('horseForm.noExtrasLogged')}</p>`
