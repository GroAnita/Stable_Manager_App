import { Badge } from '../components/Badge.js'
import { EmptyState } from '../components/EmptyState.js'
import { confirmDialog } from '../components/ConfirmDialog.js'
import { notify } from '../components/Notification.js'
import { deleteOwnerCascade, getOwnerBundle, getRecord } from '../services/dataService.js'
import { escapeHtml, formatCurrency, formatDate } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'
import { navigate } from '../router/index.js'

export function render(container, params) {
  const bundle = getOwnerBundle(params.id)
  if (!bundle.owner)
    return void (container.innerHTML = `<div class="panel p-8 text-center text-slate-500">${t('ownerDetail.notFound')}</div>`)
  const outstanding = bundle.payments.filter((payment) => payment.status !== 'paid')
  container.innerHTML = `<div class="page-shell"><div class="page-header"><div><p class="text-sm uppercase tracking-[0.25em] text-slate-400">${t('ownerDetail.profile')}</p><h1 class="mt-2 text-3xl font-semibold text-slate-900">${escapeHtml(bundle.owner.name)}</h1><p class="mt-2 text-sm text-slate-500">${escapeHtml(bundle.owner.address)}</p></div><div class="flex gap-3"><button class="btn-ghost" data-edit>${icon('edit', 'h-4 w-4')}${t('ownerDetail.edit')}</button><button class="btn-secondary" data-delete>${icon('trash', 'h-4 w-4')}${t('ownerDetail.delete')}</button></div></div><div class="grid gap-6 xl:grid-cols-[1.1fr,1.4fr]"><div class="space-y-6"><div class="panel p-5"><h2 class="section-title">${t('ownerDetail.contactInfo')}</h2><div class="mt-4 space-y-3 text-sm text-slate-600"><p><span class="font-medium text-slate-800">${t('ownerDetail.phone')}</span> ${escapeHtml(bundle.owner.phone)}</p><p><span class="font-medium text-slate-800">${t('ownerDetail.email')}</span> ${escapeHtml(bundle.owner.email)}</p><p><span class="font-medium text-slate-800">${t('ownerDetail.emergency')}</span> ${escapeHtml(bundle.owner.emergencyContact)}</p><p><span class="font-medium text-slate-800">${t('ownerDetail.billing')}</span> ${escapeHtml(bundle.owner.paymentMethod)}</p></div></div><div class="panel p-5"><div class="mb-4 flex items-center justify-between"><h2 class="section-title">${t('ownerDetail.outstandingInvoices')}</h2><span class="text-sm text-slate-400">${t('ownerDetail.openCount', { count: outstanding.length })}</span></div>${
    outstanding.length
      ? `<div class="space-y-3">${outstanding
          .slice(0, 5)
          .map(
            (payment) =>
              `<div class="rounded-2xl bg-slate-50 px-4 py-3"><div class="flex flex-wrap items-center justify-between gap-3"><p class="min-w-0 break-words font-medium text-slate-900">${getRecord('horses', payment.horseId)?.name || t('ownerDetail.horseFallback')}</p>${Badge(payment.status)}</div><p class="mt-2 text-sm text-slate-500">${payment.invoiceNumber} · ${formatCurrency(payment.amount)} · ${t('ownerDetail.due', { date: formatDate(payment.dueDate) })}</p></div>`,
          )
          .join('')}</div>`
      : `<p class="text-sm text-slate-500">${t('ownerDetail.noOutstandingInvoices')}</p>`
  }</div></div><div class="space-y-6"><div class="panel p-5"><div class="mb-4 flex items-center justify-between"><h2 class="section-title">${t('ownerDetail.horsesOwned')}</h2><span class="text-sm text-slate-400">${t('ownerDetail.horsesCount', { count: bundle.horses.length })}</span></div>${bundle.horses.length ? `<div class="grid gap-3 md:grid-cols-2">${bundle.horses.map((horse) => `<button class="rounded-2xl border border-slate-100 p-4 text-left hover:bg-slate-50" data-horse-open="${horse.id}"><p class="font-medium text-slate-900">${escapeHtml(horse.name)}</p><p class="mt-1 text-sm text-slate-500">${escapeHtml(horse.breed)} · ${t('horseList.stall')} ${getRecord('stalls', horse.stallId)?.number || '—'}</p></button>`).join('')}</div>` : EmptyState({ icon: '🐴', title: t('ownerDetail.noHorsesTitle'), message: t('ownerDetail.noHorsesMessage') })}</div><div class="panel p-5"><h2 class="section-title">${t('ownerDetail.currentContracts')}</h2><div class="mt-4 space-y-3">${bundle.contracts.length ? bundle.contracts.map((contract) => `<div class="rounded-2xl bg-slate-50 px-4 py-3"><div class="flex items-center justify-between gap-3"><p class="font-medium text-slate-900">${getRecord('horses', contract.horseId)?.name || t('ownerDetail.horseFallback')} · ${t('horseList.stall')} ${getRecord('stalls', contract.stallId)?.number || '—'}</p>${Badge(contract.status)}</div><p class="mt-2 text-sm text-slate-500">${t('ownerDetail.perMonth', { amount: formatCurrency(contract.monthlyRent), start: formatDate(contract.startDate), end: formatDate(contract.endDate) })}</p></div>`).join('') : `<p class="text-sm text-slate-500">${t('ownerDetail.noContracts')}</p>`}</div></div><div class="panel p-5"><h2 class="section-title">${t('ownerDetail.paymentHistory')}</h2><div class="mt-4 space-y-3">${bundle.payments
    .slice(0, 8)
    .map(
      (payment) =>
        `<div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3"><div class="min-w-0"><p class="break-words font-medium text-slate-900">${payment.invoiceNumber}</p><p class="text-sm text-slate-500">${getRecord('horses', payment.horseId)?.name || t('ownerDetail.horseFallback')} · ${t('ownerDetail.due', { date: formatDate(payment.dueDate) })}</p></div><div class="shrink-0 text-right"><p class="font-medium text-slate-900">${formatCurrency(payment.amount)}</p><div class="mt-1">${Badge(payment.status)}</div></div></div>`,
    )
    .join('')}</div></div></div></div></div>`
  container
    .querySelector('[data-edit]')
    .addEventListener('click', () => navigate(`/owners/${bundle.owner.id}/edit`))
  container.querySelector('[data-delete]').addEventListener('click', async () => {
    if (
      !(await confirmDialog({
        title: t('ownerDetail.deleteConfirmTitle'),
        message: t('ownerDetail.deleteConfirmMessage', { name: bundle.owner.name }),
        confirmText: t('ownerDetail.deleteConfirmButton'),
      }))
    )
      return
    deleteOwnerCascade(bundle.owner.id)
    notify(t('ownerDetail.deletedToast', { name: bundle.owner.name }), 'success')
    navigate('/owners')
  })
  container
    .querySelectorAll('[data-horse-open]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        navigate(`/horses/${button.getAttribute('data-horse-open')}`),
      ),
    )
}
