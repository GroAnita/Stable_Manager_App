import { Badge } from './Badge.js'
import { openModal } from './Modal.js'
import { getRecord } from '../services/dataService.js'
import { escapeHtml, formatCurrency, formatDate } from '../utils/helpers.js'
import { t } from '../i18n/index.js'

export function openPaymentDetailModal(payment) {
  const horse = getRecord('horses', payment.horseId)
  const owner = getRecord('owners', payment.ownerId)
  openModal({
    title: payment.invoiceNumber || t('paymentList.detailsTitleFallback'),
    body: `<div class="space-y-3 text-sm text-slate-600">
      <div class="flex items-center justify-between"><span class="font-medium text-slate-800">${t('paymentList.status')}</span>${Badge(payment.status)}</div>
      <div><span class="font-medium text-slate-800">${t('paymentList.horse')}:</span> ${escapeHtml(horse?.name || '—')}</div>
      <div><span class="font-medium text-slate-800">${t('paymentList.owner')}:</span> ${escapeHtml(owner?.name || '—')}</div>
      <div><span class="font-medium text-slate-800">${t('paymentList.amount')}:</span> ${formatCurrency(payment.amount)}</div>
      <div><span class="font-medium text-slate-800">${t('paymentList.dueDate')}:</span> ${formatDate(payment.dueDate)}</div>
      ${payment.paidDate ? `<div><span class="font-medium text-slate-800">${t('paymentList.paidDateLabel')}:</span> ${formatDate(payment.paidDate)}</div>` : ''}
      ${
        payment.notes
          ? `<div class="border-t border-slate-100 pt-3"><p class="mb-2 font-medium text-slate-800">${t('paymentList.breakdown')}</p><ul class="space-y-1.5">${payment.notes
              .split('\n')
              .filter(Boolean)
              .map(
                (line) => `<li class="rounded-xl bg-slate-50 px-3 py-2">${escapeHtml(line)}</li>`,
              )
              .join('')}</ul></div>`
          : ''
      }
    </div>`,
  })
}
