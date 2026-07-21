import { Badge } from '../components/Badge.js'
import { confirmDialog } from '../components/ConfirmDialog.js'
import { openModal } from '../components/Modal.js'
import { notify } from '../components/Notification.js'
import {
  createRecord,
  deleteRecord,
  getAll,
  getRecord,
  updateRecord,
} from '../services/dataService.js'
import { icon } from '../utils/icons.js'

/**
 * A stall's operational status.
 *
 * @typedef {'available' | 'occupied' | 'reserved' | 'maintenance'} StallStatus
 */

/**
 * Represents a stall in the stable.
 *
 * @typedef {Object} Stall
 * @property {string} id - Unique stall identifier.
 * @property {string} number - Human-readable stall number.
 * @property {string} size - Stall dimensions or size description.
 * @property {StallStatus} status - Current operational status.
 * @property {string} notes - Additional information about the stall.
 * @property {string} horseId - Identifier of the assigned horse, or an empty string.
 */

/**
 * Represents the subset of horse data used by this view.
 *
 * @typedef {Object} StallHorse
 * @property {string} id - Unique horse identifier.
 * @property {string} name - Horse's display name.
 * @property {string} ownerId - Identifier of the horse's owner.
 */

/**
 * Represents the subset of owner data used by this view.
 *
 * @typedef {Object} StallOwner
 * @property {string} id - Unique owner identifier.
 * @property {string} name - Owner's display name.
 */

/**
 * Renders the stall-management view inside a container.
 *
 * The view supports:
 * - Filtering stalls by status.
 * - Adding new stalls.
 * - Viewing occupancy information.
 * - Editing existing stall details.
 * - Deleting unoccupied stalls after confirmation.
 *
 * Calling this function replaces the container's current contents.
 *
 * @param {HTMLElement} container - Element in which the stall view is rendered.
 * @returns {void}
 */
export function render(container) {
  let filter = 'all'

  /**
   * Creates the HTML form used to add or edit a stall.
   *
   * @param {Partial<Stall>} [stall={}] - Existing stall values when editing.
   * @returns {string} HTML markup for the stall form.
   */
  const stallForm = (stall = {}) => `
    <form id="stall-form" class="grid gap-4">
      <label><span class="field-label">Stall number</span><input class="field" name="number" type="text" required value="${stall.number || ''}" /></label>
      <label><span class="field-label">Size</span><input class="field" name="size" type="text" placeholder="e.g. 3.5 x 3.5m" value="${stall.size || ''}" /></label>
      <label><span class="field-label">Status</span><select class="field" name="status">${['available', 'occupied', 'reserved', 'maintenance'].map((value) => `<option value="${value}" ${stall.status === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <label><span class="field-label">Notes</span><textarea class="field min-h-24" name="notes">${stall.notes || ''}</textarea></label>
      <button class="btn-primary" type="submit">${stall.id ? 'Save changes' : 'Add stall'}</button>
    </form>`

  /**
   * Opens the add-stall modal and registers its submission handler.
   *
   * On successful submission, the modal closes and the stall view is redrawn.
   *
   * @returns {void}
   */
  const openAddStallModal = () => {
    const modal = openModal({ title: 'Add stall', body: stallForm() })
    modal.element.querySelector('#stall-form').addEventListener('submit', (event) => {
      event.preventDefault()
      const payload = Object.fromEntries(new FormData(event.target).entries())
      createRecord('stalls', { ...payload, horseId: '' })
      modal.close()
      notify('Stall added.', 'success')
      draw()
    })
  }

  /**
   * Retrieves, filters, and renders the current collection of stalls.
   *
   * This function replaces the view markup and then registers new event
   * listeners for filtering, adding, editing, and deleting stalls.
   *
   * @returns {void}
   */
  const draw = () => {
    /** @type {Stall[]} */
    const stalls = getAll('stalls')
    /** @type {Stall[]} */
    const filtered = stalls.filter((stall) => filter === 'all' || stall.status === filter)
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">Stall layout</h1><p class="mt-2 text-sm text-slate-500">Add stalls, edit their details and see occupancy, reservations and maintenance at a glance.</p></div><button class="btn-primary" data-add-stall>${icon('plus', 'h-4 w-4')}Add stall</button></div><div class="panel p-4"><select class="field max-w-xs" data-stall-filter>${['all', 'available', 'occupied', 'reserved', 'maintenance'].map((value) => `<option value="${value}" ${filter === value ? 'selected' : ''}>${value === 'all' ? 'All stalls' : value}</option>`).join('')}</select></div>${
      filtered.length
        ? `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">${filtered
            .map((stall) => {
              const palette = {
                available: 'bg-emerald-50 border-emerald-200 text-emerald-900',
                occupied: 'bg-amber-50 border-amber-200 text-amber-900',
                reserved: 'bg-sky-50 border-sky-200 text-sky-900',
                maintenance: 'bg-red-50 border-red-200 text-red-900',
              }
              const horse = getRecord('horses', stall.horseId)
              return `<button class="rounded-[1.25rem] border p-4 text-left shadow-card ${palette[stall.status]}" data-stall-open="${stall.id}"><div class="flex items-center justify-between"><p class="text-sm uppercase tracking-[0.25em]">Stall</p>${Badge(stall.status)}</div><h3 class="mt-3 text-2xl font-semibold">${stall.number}</h3><p class="mt-2 text-sm opacity-80">${stall.size || 'No size set'}</p><p class="mt-4 text-sm opacity-80">${horse ? horse.name : stall.status === 'reserved' ? 'Reserved' : stall.status === 'maintenance' ? 'Maintenance' : 'Ready'}</p></button>`
            })
            .join('')}</div>`
        : '<div class="panel p-10 text-center text-sm text-slate-500">No stalls yet. Click "Add stall" to create your first one.</div>'
    }</div>`

    container.querySelector('[data-stall-filter]').addEventListener('change', (event) => {
      filter = event.target.value
      draw()
    })
    container.querySelector('[data-add-stall]').addEventListener('click', openAddStallModal)
    container.querySelectorAll('[data-stall-open]').forEach((button) =>
      button.addEventListener('click', () => {
        const stall = getRecord('stalls', button.getAttribute('data-stall-open'))
        const horse = getRecord('horses', stall.horseId)
        const owner = horse ? getRecord('owners', horse.ownerId) : null
        const modal = openModal({
          title: `Stall ${stall.number}`,
          body: `<div class="space-y-4 text-sm text-slate-600"><div><span class="font-medium text-slate-800">Current horse:</span> ${horse?.name || 'None assigned'}</div><div><span class="font-medium text-slate-800">Owner:</span> ${owner?.name || '—'}</div><hr class="border-slate-200" />${stallForm(stall)}</div>`,
          footer: `<button type="button" class="btn-ghost" data-delete-stall>Delete stall</button>`,
        })
        modal.element.querySelector('#stall-form').addEventListener('submit', (event) => {
          event.preventDefault()
          const payload = Object.fromEntries(new FormData(event.target).entries())
          updateRecord('stalls', stall.id, payload)
          modal.close()
          notify('Stall updated.', 'success')
          draw()
        })
        modal.element.querySelector('[data-delete-stall]').addEventListener('click', async () => {
          if (horse) {
            notify('Unassign the horse from this stall before deleting it.', 'error')
            return
          }
          if (
            !(await confirmDialog({
              title: 'Delete stall',
              message: `This will permanently delete Stall ${stall.number}.`,
              confirmText: 'Delete stall',
            }))
          )
            return
          deleteRecord('stalls', stall.id)
          modal.close()
          notify('Stall deleted.', 'success')
          draw()
        })
      }),
    )
  }
  draw()
}
