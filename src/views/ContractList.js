import { Badge } from '../components/Badge.js'
import { createTable } from '../components/Table.js'
import { confirmDialog } from '../components/ConfirmDialog.js'
import { notify } from '../components/Notification.js'
import { deleteContractCascade, getAll, getRecord } from '../services/dataService.js'
import { formatCurrency, formatDate, daysUntil } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { navigate } from '../router/index.js'

export function render(container) {
  const contracts = getAll('contracts')
  let filter = 'all', sortBy = 'endDate', sortDirection = 'asc'
  const draw = () => {
    const filtered = contracts.filter((contract) => filter === 'active' ? contract.status === 'active' : filter === 'ending soon' ? contract.status === 'active' && daysUntil(contract.endDate) <= 45 : filter === 'expired' ? contract.status === 'expired' || daysUntil(contract.endDate) < 0 : true).sort((a, b) => sortDirection === 'asc' ? String(a[sortBy]).localeCompare(String(b[sortBy])) : String(b[sortBy]).localeCompare(String(a[sortBy])))
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">Contracts</h1><p class="mt-2 text-sm text-slate-500">Track boarding agreements, deposits and renewals with confidence.</p></div><button class="btn-primary" data-add-contract>${icon('plus', 'h-4 w-4')}Add contract</button></div><div class="panel p-4"><div class="flex flex-wrap gap-2">${['all','active','ending soon','expired'].map((item) => `<button class="${filter === item ? 'bg-forest text-white' : 'bg-white text-slate-600'} rounded-xl px-4 py-2 text-sm font-medium" data-filter="${item}">${item}</button>`).join('')}</div></div>${createTable({ id: 'contracts-table', columns: [{ key: 'horseId', label: 'Horse', render: (contract) => getRecord('horses', contract.horseId)?.name || '—' }, { key: 'ownerId', label: 'Owner', render: (contract) => getRecord('owners', contract.ownerId)?.name || '—' }, { key: 'monthlyRent', label: 'Rent', render: (contract) => formatCurrency(contract.monthlyRent) }, { key: 'endDate', label: 'End date', render: (contract) => formatDate(contract.endDate) }, { key: 'status', label: 'Status', render: (contract) => Badge(contract.status) }, { key: 'actions', label: 'Actions', sortable: false, render: (contract) => `<div class="flex gap-2"><button class="btn-ghost px-3 py-2" data-edit-contract="${contract.id}">Edit</button><button class="btn-ghost px-3 py-2" data-delete-contract="${contract.id}">Delete</button></div>` }], data: filtered, sortBy, sortDirection, emptyMessage: 'No contracts available for this filter.' })}</div>`
    container.querySelector('[data-add-contract]').addEventListener('click', () => navigate('/contracts/new'))
    container.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { filter = button.getAttribute('data-filter'); draw() }))
    container.querySelectorAll('[data-sort-key]').forEach((button) => button.addEventListener('click', () => { const key = button.getAttribute('data-sort-key'); sortDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc'; sortBy = key; draw() }))
    container.querySelectorAll('[data-edit-contract]').forEach((button) => button.addEventListener('click', () => navigate(`/contracts/${button.getAttribute('data-edit-contract')}/edit`)))
    container.querySelectorAll('[data-delete-contract]').forEach((button) => button.addEventListener('click', async () => { const id = button.getAttribute('data-delete-contract'); const contract = getRecord('contracts', id); if (!(await confirmDialog({ title: 'Delete contract', message: 'Remove this contract and all linked payment records?', confirmText: 'Delete' }))) return; deleteContractCascade(id); notify(`${getRecord('horses', contract.horseId)?.name || 'Contract'} removed.`, 'success'); render(container) }))
  }
  draw()
}
