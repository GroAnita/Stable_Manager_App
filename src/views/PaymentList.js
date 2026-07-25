import { Badge } from '../components/Badge.js'
import { Card } from '../components/Card.js'
import { createTable } from '../components/Table.js'
import { openPaymentDetailModal } from '../components/PaymentDetailModal.js'
import { notify } from '../components/Notification.js'
import { getAll, getRecord, updateRecord } from '../services/dataService.js'
import { formatCurrency, formatDate } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'

export function render(container) {
  const payments = getAll('payments')
  let search = '',
    filter = 'all',
    sortBy = 'dueDate',
    sortDirection = 'desc'
  const draw = () => {
    const filtered = payments
      .filter((payment) => {
        const horse = getRecord('horses', payment.horseId)
        const owner = getRecord('owners', payment.ownerId)
        return (
          [payment.invoiceNumber, horse?.name, owner?.name].some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(search.toLowerCase()),
          ) &&
          (filter === 'all' || payment.status === filter)
        )
      })
      .sort((a, b) =>
        sortDirection === 'asc'
          ? String(a[sortBy]).localeCompare(String(b[sortBy]))
          : String(b[sortBy]).localeCompare(String(a[sortBy])),
      )
    const monthKey = new Date().toISOString().slice(0, 7)
    const summary = {
      paid: payments
        .filter((payment) => payment.status === 'paid' && payment.paidDate?.startsWith(monthKey))
        .reduce((sum, payment) => sum + payment.amount, 0),
      due: payments
        .filter((payment) => payment.status === 'due')
        .reduce((sum, payment) => sum + payment.amount, 0),
      overdue: payments
        .filter((payment) => payment.status === 'overdue')
        .reduce((sum, payment) => sum + payment.amount, 0),
    }
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${t('paymentList.title')}</h1><p class="mt-2 text-sm text-slate-500">${t('paymentList.subtitle')}</p></div></div><div class="grid gap-4 md:grid-cols-3">${Card({ label: t('paymentList.paidThisMonth'), value: formatCurrency(summary.paid), icon: icon('dollar', 'h-5 w-5') })}${Card({ label: t('paymentList.currentlyDue'), value: formatCurrency(summary.due), icon: icon('calendar', 'h-5 w-5') })}${Card({ label: t('paymentList.overdueTotal'), value: formatCurrency(summary.overdue), icon: icon('alert', 'h-5 w-5') })}</div><div class="panel p-4"><div class="grid gap-3 lg:grid-cols-[2fr,1fr]"><input class="field" type="search" placeholder="${t('paymentList.searchPlaceholder')}" value="${search}" data-payment-search /><select class="field" data-payment-filter>${['all', 'paid', 'due', 'overdue'].map((value) => `<option value="${value}" ${filter === value ? 'selected' : ''}>${value === 'all' ? t('paymentList.allStatuses') : t(`status.${value}`)}</option>`).join('')}</select></div></div>${createTable(
      {
        id: 'payments-table',
        columns: [
          {
            key: 'invoiceNumber',
            label: t('paymentList.invoice'),
            render: (payment) => payment.invoiceNumber,
          },
          {
            key: 'horse',
            label: t('paymentList.horse'),
            sortable: false,
            render: (payment) => getRecord('horses', payment.horseId)?.name || '—',
          },
          {
            key: 'owner',
            label: t('paymentList.owner'),
            sortable: false,
            render: (payment) => getRecord('owners', payment.ownerId)?.name || '—',
          },
          {
            key: 'amount',
            label: t('paymentList.amount'),
            render: (payment) => formatCurrency(payment.amount),
          },
          {
            key: 'dueDate',
            label: t('paymentList.dueDate'),
            render: (payment) => formatDate(payment.dueDate),
          },
          {
            key: 'status',
            label: t('paymentList.status'),
            render: (payment) => Badge(payment.status),
          },
          {
            key: 'action',
            label: t('paymentList.action'),
            sortable: false,
            render: (payment) =>
              payment.status === 'paid'
                ? `<span class="text-sm text-slate-400">${t('paymentList.settled')}</span>`
                : `<button class="btn-ghost px-3 py-2" data-mark-paid="${payment.id}">${t('paymentList.markPaid')}</button>`,
          },
        ],
        data: filtered,
        sortBy,
        sortDirection,
        emptyMessage: t('paymentList.noPayments'),
        clickableRows: true,
      },
    )}</div>`
    container.querySelector('[data-payment-search]').addEventListener('input', (event) => {
      search = event.target.value
      draw()
    })
    container.querySelector('[data-payment-filter]').addEventListener('change', (event) => {
      filter = event.target.value
      draw()
    })
    container.querySelectorAll('[data-sort-key]').forEach((button) =>
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-sort-key')
        sortDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc'
        sortBy = key
        draw()
      }),
    )
    container.querySelectorAll('[data-mark-paid]').forEach((button) =>
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        updateRecord('payments', button.getAttribute('data-mark-paid'), {
          status: 'paid',
          paidDate: new Date().toISOString().slice(0, 10),
        })
        notify(t('paymentList.markedPaidToast'), 'success')
        render(container)
      }),
    )
    container
      .querySelectorAll('#payments-table tbody tr[data-row-id]')
      .forEach((row) =>
        row.addEventListener('click', () =>
          openPaymentDetailModal(getRecord('payments', row.getAttribute('data-row-id'))),
        ),
      )
  }
  draw()
}
