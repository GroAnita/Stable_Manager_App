import { Badge } from '../components/Badge.js'
import { createTable } from '../components/Table.js'
import { confirmDialog } from '../components/ConfirmDialog.jsx'
import { notify } from '../components/Notification.jsx'
import { deleteContractCascade, getAll, getRecord } from '../services/dataService.js'
import { currentBillingCycleDays, formatCurrency, formatDate, daysUntil } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'
import { navigate } from '../router/index.js'

const totalMonthlyPrice = (contract) => {
  const cycleDays = currentBillingCycleDays()
  const hayItem =
    contract.hayPriceListItemId && getRecord('priceListItems', contract.hayPriceListItemId)
  const beddingItem =
    contract.beddingPriceListItemId && getRecord('priceListItems', contract.beddingPriceListItemId)
  const hayValue =
    contract.includedHayKg && hayItem
      ? contract.includedHayKg * cycleDays * hayItem.price * 1.25
      : 0
  const beddingAmount =
    contract.beddingQuantity && beddingItem
      ? contract.beddingQuantity * beddingItem.price * 1.25
      : 0
  return Math.round(((Number(contract.monthlyRent) || 0) + hayValue + beddingAmount) * 100) / 100
}

export function render(container) {
  const contracts = getAll('contracts')
  let filter = 'all',
    sortBy = 'endDate',
    sortDirection = 'asc'
  const filters = ['all', 'active', 'ending soon', 'expired']
  const filterLabels = {
    all: t('contractList.filterAll'),
    active: t('contractList.filterActive'),
    'ending soon': t('contractList.filterEndingSoon'),
    expired: t('contractList.filterExpired'),
  }
  const draw = () => {
    const filtered = contracts
      .filter((contract) =>
        filter === 'active'
          ? contract.status === 'active'
          : filter === 'ending soon'
            ? contract.status === 'active' && daysUntil(contract.endDate) <= 45
            : filter === 'expired'
              ? contract.status === 'expired' || daysUntil(contract.endDate) < 0
              : true,
      )
      .sort((a, b) =>
        sortDirection === 'asc'
          ? String(a[sortBy]).localeCompare(String(b[sortBy]))
          : String(b[sortBy]).localeCompare(String(a[sortBy])),
      )
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${t('contractList.title')}</h1><p class="mt-2 text-sm text-slate-500">${t('contractList.subtitle')}</p></div><button class="btn-primary" data-add-contract>${icon('plus', 'h-4 w-4')}${t('contractList.addContract')}</button></div><div class="panel p-4"><div class="flex flex-wrap gap-2">${filters.map((item) => `<button class="${filter === item ? 'bg-forest text-white' : 'bg-white text-slate-600'} rounded-xl px-4 py-2 text-sm font-medium" data-filter="${item}">${filterLabels[item]}</button>`).join('')}</div></div>${createTable(
      {
        id: 'contracts-table',
        columns: [
          {
            key: 'horseId',
            label: t('contractList.horse'),
            render: (contract) => getRecord('horses', contract.horseId)?.name || '—',
          },
          {
            key: 'ownerId',
            label: t('contractList.owner'),
            render: (contract) => getRecord('owners', contract.ownerId)?.name || '—',
          },
          {
            key: 'monthlyRent',
            label: t('contractList.rent'),
            sortable: false,
            render: (contract) => formatCurrency(totalMonthlyPrice(contract)),
          },
          {
            key: 'endDate',
            label: t('contractList.endDate'),
            render: (contract) => formatDate(contract.endDate),
          },
          {
            key: 'status',
            label: t('contractList.status'),
            render: (contract) => Badge(contract.status),
          },
          {
            key: 'actions',
            label: t('contractList.actions'),
            sortable: false,
            render: (contract) =>
              `<div class="flex gap-2"><button class="btn-ghost px-3 py-2" data-edit-contract="${contract.id}">${t('contractList.edit')}</button><button class="btn-ghost px-3 py-2" data-delete-contract="${contract.id}">${t('contractList.delete')}</button></div>`,
          },
        ],
        data: filtered,
        sortBy,
        sortDirection,
        emptyMessage: t('contractList.noContracts'),
      },
    )}</div>`
    container
      .querySelector('[data-add-contract]')
      .addEventListener('click', () => navigate('/contracts/new'))
    container.querySelectorAll('[data-filter]').forEach((button) =>
      button.addEventListener('click', () => {
        filter = button.getAttribute('data-filter')
        draw()
      }),
    )
    container.querySelectorAll('[data-sort-key]').forEach((button) =>
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-sort-key')
        sortDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc'
        sortBy = key
        draw()
      }),
    )
    container
      .querySelectorAll('[data-edit-contract]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          navigate(`/contracts/${button.getAttribute('data-edit-contract')}/edit`),
        ),
      )
    container.querySelectorAll('[data-delete-contract]').forEach((button) =>
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-delete-contract')
        const contract = getRecord('contracts', id)
        if (
          !(await confirmDialog({
            title: t('contractList.deleteConfirmTitle'),
            message: t('contractList.deleteConfirmMessage'),
            confirmText: t('contractList.deleteConfirmButton'),
          }))
        )
          return
        deleteContractCascade(id)
        notify(
          t('contractList.deletedToast', {
            name: getRecord('horses', contract.horseId)?.name || t('contractList.contractFallback'),
          }),
          'success',
        )
        render(container)
      }),
    )
  }
  draw()
}
