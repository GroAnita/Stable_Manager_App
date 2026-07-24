import { createTable } from '../components/Table.js'
import { openModal } from '../components/Modal.js'
import { confirmDialog } from '../components/ConfirmDialog.js'
import { notify } from '../components/Notification.js'
import {
  createRecord,
  deleteRecord,
  getAll,
  getRecord,
  updateRecord,
} from '../services/dataService.js'
import { escapeHtml, formatCurrency } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'

const UNIT_OPTIONS = [
  'per month',
  'per week',
  'per day',
  'per visit',
  'one-time',
  'Kg',
  'Litre',
  'Bag',
  'Box',
  'Other',
]

// These let the horse profile's Feeding and Extra tabs pull filtered, live
// lists of items to log as charges beyond a contract: Hay/Grain/Supplements
// on the Feeding tab, the rest on the Extra tab.
const CATEGORY_OPTIONS = [
  'Hay',
  'Grain',
  'Supplements',
  'Veterinary',
  'Farrier',
  'Bedding',
  'Mucking',
  'Other',
]

const categoryLabel = (value) => t(`category.${value.toLowerCase()}`)

export function render(container) {
  let sortBy = 'item',
    sortDirection = 'asc',
    categoryFilter = 'all'

  const itemForm = (item = {}) => `
    <form id="price-item-form" class="grid gap-4">
      <label><span class="field-label">${t('priceList.itemName')}</span><input class="field" name="item" type="text" required value="${escapeHtml(item.item || '')}" /></label>
      <label><span class="field-label">${t('priceList.category')}</span><select class="field" name="category"><option value="">${t('priceList.uncategorized')}</option>${CATEGORY_OPTIONS.map((value) => `<option value="${value}" ${item.category === value ? 'selected' : ''}>${categoryLabel(value)}</option>`).join('')}</select></label>
      <label><span class="field-label">${t('priceList.unit')}</span><select class="field" name="unit"><option value="">${t('priceList.noUnit')}</option>${UNIT_OPTIONS.map((value) => `<option value="${value}" ${item.unit === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <label><span class="field-label">${t('priceList.price')}</span><input class="field" name="price" type="number" step="0.01" min="0" required value="${item.price ?? ''}" /></label>
      <label><span class="field-label">${t('priceList.notes')}</span><textarea class="field min-h-24" name="notes">${escapeHtml(item.notes || '')}</textarea></label>
      <button class="btn-primary" type="submit">${item.id ? t('priceList.saveSubmit') : t('priceList.addSubmit')}</button>
    </form>`

  const openAddModal = () => {
    const modal = openModal({ title: t('priceList.addModalTitle'), body: itemForm() })
    modal.element.querySelector('#price-item-form').addEventListener('submit', (event) => {
      event.preventDefault()
      const payload = Object.fromEntries(new FormData(event.target).entries())
      payload.price = Number(payload.price) || 0
      createRecord('priceListItems', payload)
      modal.close()
      notify(t('priceList.addedToast'), 'success')
      draw()
    })
  }

  const openEditModal = (item) => {
    const modal = openModal({
      title: t('priceList.editModalTitle'),
      body: itemForm(item),
      footer: `<button type="button" class="btn-ghost" data-delete-item>${t('common.delete')}</button>`,
    })
    modal.element.querySelector('#price-item-form').addEventListener('submit', (event) => {
      event.preventDefault()
      const payload = Object.fromEntries(new FormData(event.target).entries())
      payload.price = Number(payload.price) || 0
      updateRecord('priceListItems', item.id, payload)
      modal.close()
      notify(t('priceList.updatedToast'), 'success')
      draw()
    })
    modal.element.querySelector('[data-delete-item]').addEventListener('click', async () => {
      if (
        !(await confirmDialog({
          title: t('priceList.deleteConfirmTitle'),
          message: t('priceList.deleteConfirmMessage', { name: item.item }),
          confirmText: t('priceList.deleteConfirmButton'),
        }))
      )
        return
      deleteRecord('priceListItems', item.id)
      modal.close()
      notify(t('priceList.removedToast'), 'success')
      draw()
    })
  }

  const draw = () => {
    const items = getAll('priceListItems')
      .filter((item) => categoryFilter === 'all' || item.category === categoryFilter)
      .sort((a, b) =>
        sortDirection === 'asc'
          ? String(a[sortBy]).localeCompare(String(b[sortBy]))
          : String(b[sortBy]).localeCompare(String(a[sortBy])),
      )
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${t('priceList.title')}</h1><p class="mt-2 text-sm text-slate-500">${t('priceList.subtitle')}</p></div><button class="btn-primary" data-add-item>${icon('plus', 'h-4 w-4')}${t('priceList.addItem')}</button></div><div class="panel p-4"><select class="field max-w-xs" data-category-filter><option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>${t('priceList.allCategories')}</option>${CATEGORY_OPTIONS.map((value) => `<option value="${value}" ${categoryFilter === value ? 'selected' : ''}>${categoryLabel(value)}</option>`).join('')}</select></div>${createTable(
      {
        id: 'price-list-table',
        columns: [
          { key: 'item', label: t('priceList.item'), render: (item) => escapeHtml(item.item) },
          {
            key: 'category',
            label: t('priceList.category'),
            render: (item) => (item.category ? categoryLabel(item.category) : '—'),
          },
          { key: 'unit', label: t('priceList.unit'), render: (item) => item.unit || '—' },
          {
            key: 'price',
            label: t('priceList.price'),
            render: (item) => formatCurrency(item.price),
          },
          {
            key: 'notes',
            label: t('priceList.notes'),
            sortable: false,
            render: (item) => (item.notes ? escapeHtml(item.notes) : '—'),
          },
          {
            key: 'actions',
            label: t('priceList.actions'),
            sortable: false,
            render: (item) =>
              `<button class="btn-ghost px-3 py-2" data-edit-item="${item.id}">${t('priceList.edit')}</button>`,
          },
        ],
        data: items,
        sortBy,
        sortDirection,
        emptyMessage: t('priceList.noItems'),
      },
    )}</div>`
    container.querySelector('[data-add-item]').addEventListener('click', openAddModal)
    container.querySelector('[data-category-filter]').addEventListener('change', (event) => {
      categoryFilter = event.target.value
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
    container.querySelectorAll('[data-edit-item]').forEach((button) =>
      button.addEventListener('click', () => {
        const item = getRecord('priceListItems', button.getAttribute('data-edit-item'))
        openEditModal(item)
      }),
    )
  }
  draw()
}
