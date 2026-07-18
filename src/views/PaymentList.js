import { Badge } from '../components/Badge.js'
import { Card } from '../components/Card.js'
import { createTable } from '../components/Table.js'
import { notify } from '../components/Notification.js'
import { getAll, getRecord, updateRecord } from '../services/dataService.js'
import { formatCurrency, formatDate } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'

export function render(container) {
  const payments = getAll('payments')
  let search = '', filter = 'all', sortBy = 'dueDate', sortDirection = 'desc'
  const draw = () => {
    const filtered = payments.filter((payment) => { const horse = getRecord('horses', payment.horseId); const owner = getRecord('owners', payment.ownerId); return [payment.invoiceNumber, horse?.name, owner?.name].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())) && (filter === 'all' || payment.status === filter) }).sort((a, b) => sortDirection === 'asc' ? String(a[sortBy]).localeCompare(String(b[sortBy])) : String(b[sortBy]).localeCompare(String(a[sortBy])))
    const monthKey = new Date().toISOString().slice(0, 7)
    const summary = { paid: payments.filter((payment) => payment.status === 'paid' && payment.paidDate?.startsWith(monthKey)).reduce((sum, payment) => sum + payment.amount, 0), due: payments.filter((payment) => payment.status === 'due').reduce((sum, payment) => sum + payment.amount, 0), overdue: payments.filter((payment) => payment.status === 'overdue').reduce((sum, payment) => sum + payment.amount, 0) }
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">Payments</h1><p class="mt-2 text-sm text-slate-500">Monitor invoices, due dates and payment status across every boarding contract.</p></div></div><div class="grid gap-4 md:grid-cols-3">${Card({ label: 'Paid this month', value: formatCurrency(summary.paid), icon: icon('dollar', 'h-5 w-5') })}${Card({ label: 'Currently due', value: formatCurrency(summary.due), icon: icon('calendar', 'h-5 w-5') })}${Card({ label: 'Overdue total', value: formatCurrency(summary.overdue), icon: icon('alert', 'h-5 w-5') })}</div><div class="panel p-4"><div class="grid gap-3 lg:grid-cols-[2fr,1fr]"><input class="field" type="search" placeholder="Search by invoice, horse or owner..." value="${search}" data-payment-search /><select class="field" data-payment-filter>${['all','paid','due','overdue'].map((value) => `<option value="${value}" ${filter === value ? 'selected' : ''}>${value === 'all' ? 'All statuses' : value}</option>`).join('')}</select></div></div>${createTable({ id: 'payments-table', columns: [{ key: 'invoiceNumber', label: 'Invoice', render: (payment) => payment.invoiceNumber }, { key: 'horse', label: 'Horse', sortable: false, render: (payment) => getRecord('horses', payment.horseId)?.name || '—' }, { key: 'owner', label: 'Owner', sortable: false, render: (payment) => getRecord('owners', payment.ownerId)?.name || '—' }, { key: 'amount', label: 'Amount', render: (payment) => formatCurrency(payment.amount) }, { key: 'dueDate', label: 'Due date', render: (payment) => formatDate(payment.dueDate) }, { key: 'status', label: 'Status', render: (payment) => Badge(payment.status) }, { key: 'action', label: 'Action', sortable: false, render: (payment) => payment.status === 'paid' ? '<span class="text-sm text-slate-400">Settled</span>' : `<button class="btn-ghost px-3 py-2" data-mark-paid="${payment.id}">Mark paid</button>` }], data: filtered, sortBy, sortDirection, emptyMessage: 'No payments match your filters.' })}</div>`
    container.querySelector('[data-payment-search]').addEventListener('input', (event) => { search = event.target.value; draw() })
    container.querySelector('[data-payment-filter]').addEventListener('change', (event) => { filter = event.target.value; draw() })
    container.querySelectorAll('[data-sort-key]').forEach((button) => button.addEventListener('click', () => { const key = button.getAttribute('data-sort-key'); sortDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc'; sortBy = key; draw() }))
    container.querySelectorAll('[data-mark-paid]').forEach((button) => button.addEventListener('click', () => { updateRecord('payments', button.getAttribute('data-mark-paid'), { status: 'paid', paidDate: new Date().toISOString().slice(0, 10) }); notify('Payment marked as paid.', 'success'); render(container) }))
  }
  draw()
}
