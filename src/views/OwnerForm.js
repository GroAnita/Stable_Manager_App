import { notify } from '../components/Notification.js'
import {
  createRecord,
  deleteRecord,
  getAll,
  getRecord,
  updateRecord,
} from '../services/dataService.js'
import { navigate } from '../router/index.js'

const TABS = [
  ['contact', 'Contact info'],
  ['horses', 'Horses'],
  ['contracts', 'Contracts'],
  ['payments', 'Payments'],
]

export function render(container, params = {}) {
  const editing = Boolean(params.id)
  const owner = editing ? getRecord('owners', params.id) : null
  const allHorses = getAll('horses')
  const allStalls = getAll('stalls')
  const contracts = editing
    ? getAll('contracts').filter((contract) => contract.ownerId === owner.id)
    : []
  const payments = editing
    ? getAll('payments').filter((payment) => payment.ownerId === owner.id)
    : []
  let activeTab = 'contact'

  const contractRowTemplate = (row = {}) => `
    <div class="record-row grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-3" data-row-id="${row.id || ''}">
      <label><span class="field-label">Horse</span><select class="field" data-field="horseId"><option value="">Select horse</option>${allHorses.map((horse) => `<option value="${horse.id}" ${row.horseId === horse.id ? 'selected' : ''}>${horse.name}</option>`).join('')}</select></label>
      <label><span class="field-label">Stall</span><select class="field" data-field="stallId"><option value="">Select stall</option>${allStalls.map((stall) => `<option value="${stall.id}" ${row.stallId === stall.id ? 'selected' : ''}>Stall ${stall.number}</option>`).join('')}</select></label>
      <label><span class="field-label">Status</span><select class="field" data-field="status">${['active', 'expired', 'cancelled'].map((value) => `<option value="${value}" ${row.status === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <label><span class="field-label">Monthly rent (€)</span><input class="field" type="number" data-field="monthlyRent" value="${row.monthlyRent ?? ''}" /></label>
      <label><span class="field-label">Deposit (€)</span><input class="field" type="number" data-field="deposit" value="${row.deposit ?? ''}" /></label>
      <label><span class="field-label">Start date</span><input class="field" type="date" data-field="startDate" value="${row.startDate || ''}" /></label>
      <label><span class="field-label">End date</span><input class="field" type="date" data-field="endDate" value="${row.endDate || ''}" /></label>
      <label class="md:col-span-2 xl:col-span-3"><span class="field-label">Included services</span><textarea class="field min-h-16" data-field="includedServices">${row.includedServices || ''}</textarea></label>
      <label class="md:col-span-2 xl:col-span-3"><span class="field-label">Additional services</span><textarea class="field min-h-16" data-field="additionalServices">${row.additionalServices || ''}</textarea></label>
      <div class="flex items-end"><button type="button" class="btn-ghost w-full" data-remove-row>Remove</button></div>
    </div>`

  const paymentRowTemplate = (row = {}) => `
    <div class="record-row grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-3" data-row-id="${row.id || ''}">
      <label class="md:col-span-2 xl:col-span-3"><span class="field-label">Contract</span><select class="field" data-field="contractId"><option value="">Select contract</option>${contracts.map((contract) => `<option value="${contract.id}" ${row.contractId === contract.id ? 'selected' : ''}>${getRecord('horses', contract.horseId)?.name || 'Horse'} · €${contract.monthlyRent}/mo</option>`).join('')}</select></label>
      <label><span class="field-label">Amount (€)</span><input class="field" type="number" data-field="amount" value="${row.amount ?? ''}" /></label>
      <label><span class="field-label">Due date</span><input class="field" type="date" data-field="dueDate" value="${row.dueDate || ''}" /></label>
      <label><span class="field-label">Paid date</span><input class="field" type="date" data-field="paidDate" value="${row.paidDate || ''}" /></label>
      <label><span class="field-label">Invoice number</span><input class="field" type="text" data-field="invoiceNumber" value="${row.invoiceNumber || ''}" /></label>
      <label><span class="field-label">Status</span><select class="field" data-field="status">${['due', 'paid', 'overdue'].map((value) => `<option value="${value}" ${row.status === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <div class="flex items-end"><button type="button" class="btn-ghost w-full" data-remove-row>Remove</button></div>
    </div>`

  container.innerHTML = `
    <div class="page-shell">
      <div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${editing ? 'Edit owner' : 'Add owner'}</h1><p class="mt-2 text-sm text-slate-500">Store reliable contact, boarding and billing details for each boarder.</p></div></div>
      <div class="flex flex-wrap gap-2">${TABS.map(([key, label]) => `<button type="button" class="${key === activeTab ? 'bg-forest text-white' : 'bg-white text-slate-600'} rounded-xl px-4 py-2 text-sm font-medium" data-tab="${key}">${label}</button>`).join('')}</div>
      <form id="owner-form" class="panel p-6">

        <div class="tab-panel" data-panel="contact">
          <div class="grid gap-5 md:grid-cols-2">
            ${[
              ['name', 'Name', 'text', true],
              ['phone', 'Phone', 'tel', true],
              ['email', 'Email', 'email', true],
              ['address', 'Address', 'text', true],
              ['emergencyContact', 'Emergency contact', 'text', true],
              ['paymentMethod', 'Billing info', 'text', true],
            ]
              .map(
                ([name, label, type, required]) =>
                  `<label class="${name === 'address' ? 'md:col-span-2' : ''}"><span class="field-label">${label}</span><input class="field" name="${name}" type="${type}" value="${owner?.[name] || ''}" ${required ? 'required' : ''} /></label>`,
              )
              .join('')}
          </div>
        </div>

        <div class="tab-panel hidden" data-panel="horses">
          ${
            !editing
              ? '<p class="text-sm text-slate-500">Save the owner first, then assign horses.</p>'
              : `
          <p class="text-sm text-slate-500">Select the horses that belong to this owner.</p>
          <div class="mt-3 grid gap-3 md:grid-cols-2" data-horse-list>${allHorses.map((horse) => `<label class="flex items-center gap-3 rounded-2xl border border-slate-100 p-4"><input type="checkbox" data-horse-id="${horse.id}" ${horse.ownerId === owner.id ? 'checked' : ''} /><span><span class="block font-medium text-slate-900">${horse.name}</span><span class="block text-sm text-slate-500">${horse.breed} · Stall ${getRecord('stalls', horse.stallId)?.number || '—'}</span></span></label>`).join('')}</div>`
          }
        </div>

        <div class="tab-panel hidden" data-panel="contracts">
          ${
            !editing
              ? '<p class="text-sm text-slate-500">Save the owner first, then add contracts.</p>'
              : `
          <div class="flex items-center justify-between"><h3 class="font-semibold text-slate-900">Contracts</h3><button type="button" class="btn-ghost" data-add-contract>Add contract</button></div>
          <div class="mt-3 space-y-3" data-contract-list>${contracts.map(contractRowTemplate).join('')}</div>`
          }
        </div>

        <div class="tab-panel hidden" data-panel="payments">
          ${
            !editing
              ? '<p class="text-sm text-slate-500">Save the owner first, then add payments.</p>'
              : `
          <div class="flex items-center justify-between"><h3 class="font-semibold text-slate-900">Payments</h3><button type="button" class="btn-ghost" data-add-payment>Add payment</button></div>
          <p class="mt-2 text-sm text-slate-500">Only saved contracts appear in the dropdown. Save a new contract, then reopen this owner to add its payments.</p>
          <div class="mt-3 space-y-3" data-payment-list>${payments.map(paymentRowTemplate).join('')}</div>`
          }
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-3"><button type="button" class="btn-ghost" data-cancel>Cancel</button><button type="submit" class="btn-primary">${editing ? 'Save changes' : 'Create owner'}</button></div>
      </form>
    </div>`

  const switchTab = (key) => {
    activeTab = key
    container
      .querySelectorAll('[data-tab]')
      .forEach((tabButton) =>
        tabButton.classList.toggle('bg-forest', tabButton.getAttribute('data-tab') === key),
      )
    container
      .querySelectorAll('[data-tab]')
      .forEach((tabButton) =>
        tabButton.classList.toggle('text-white', tabButton.getAttribute('data-tab') === key),
      )
    container
      .querySelectorAll('[data-tab]')
      .forEach((tabButton) =>
        tabButton.classList.toggle('bg-white', tabButton.getAttribute('data-tab') !== key),
      )
    container
      .querySelectorAll('[data-tab]')
      .forEach((tabButton) =>
        tabButton.classList.toggle('text-slate-600', tabButton.getAttribute('data-tab') !== key),
      )
    container
      .querySelectorAll('[data-panel]')
      .forEach((panel) =>
        panel.classList.toggle('hidden', panel.getAttribute('data-panel') !== key),
      )
  }

  container
    .querySelectorAll('[data-tab]')
    .forEach((button) =>
      button.addEventListener('click', () => switchTab(button.getAttribute('data-tab'))),
    )

  // Required fields can live on tabs that are hidden (display:none). The
  // browser can't focus a hidden invalid control, so it silently blocks
  // submission with just a console warning. Switch to the offending field's
  // tab as soon as it's reported invalid so the browser can focus it.
  container.querySelectorAll('#owner-form [required]').forEach((field) => {
    field.addEventListener('invalid', () => {
      const panel = field.closest('[data-panel]')
      if (panel) switchTab(panel.getAttribute('data-panel'))
    })
  })

  const contractList = container.querySelector('[data-contract-list]')
  const paymentList = container.querySelector('[data-payment-list]')

  if (contractList)
    container
      .querySelector('[data-add-contract]')
      .addEventListener('click', () =>
        contractList.insertAdjacentHTML('beforeend', contractRowTemplate()),
      )
  if (paymentList)
    container
      .querySelector('[data-add-payment]')
      .addEventListener('click', () =>
        paymentList.insertAdjacentHTML('beforeend', paymentRowTemplate()),
      )
  if (contractList)
    contractList.addEventListener('click', (event) => {
      if (event.target.closest('[data-remove-row]')) event.target.closest('.record-row').remove()
    })
  if (paymentList)
    paymentList.addEventListener('click', (event) => {
      if (event.target.closest('[data-remove-row]')) event.target.closest('.record-row').remove()
    })

  container
    .querySelector('[data-cancel]')
    .addEventListener('click', () => navigate(editing ? `/owners/${owner.id}` : '/owners'))

  container.querySelector('#owner-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.target).entries())
    const ownerId = editing ? owner.id : createRecord('owners', payload).id
    if (editing) updateRecord('owners', ownerId, payload)

    const horseList = container.querySelector('[data-horse-list]')
    if (horseList) {
      allHorses.forEach((horse) => {
        const checked = horseList.querySelector(`[data-horse-id="${horse.id}"]`).checked
        if (checked && horse.ownerId !== ownerId) updateRecord('horses', horse.id, { ownerId })
        if (!checked && horse.ownerId === ownerId) updateRecord('horses', horse.id, { ownerId: '' })
      })
    }

    if (contractList) {
      const submittedIds = new Set()
      Array.from(contractList.querySelectorAll('.record-row')).forEach((row) => {
        const id = row.getAttribute('data-row-id') || undefined
        const rowPayload = {
          horseId: row.querySelector('[data-field="horseId"]').value,
          stallId: row.querySelector('[data-field="stallId"]').value,
          status: row.querySelector('[data-field="status"]').value,
          monthlyRent: Number(row.querySelector('[data-field="monthlyRent"]').value) || 0,
          deposit: Number(row.querySelector('[data-field="deposit"]').value) || 0,
          startDate: row.querySelector('[data-field="startDate"]').value,
          endDate: row.querySelector('[data-field="endDate"]').value,
          includedServices: row.querySelector('[data-field="includedServices"]').value,
          additionalServices: row.querySelector('[data-field="additionalServices"]').value,
          ownerId,
        }
        if (id) {
          updateRecord('contracts', id, rowPayload)
          submittedIds.add(id)
        } else {
          const created = createRecord('contracts', rowPayload)
          submittedIds.add(created.id)
        }
      })
      contracts
        .filter((contract) => !submittedIds.has(contract.id))
        .forEach((contract) => deleteRecord('contracts', contract.id))
    }

    if (paymentList) {
      const submittedIds = new Set()
      Array.from(paymentList.querySelectorAll('.record-row')).forEach((row) => {
        const id = row.getAttribute('data-row-id') || undefined
        const contractId = row.querySelector('[data-field="contractId"]').value
        const contract = getRecord('contracts', contractId)
        const rowPayload = {
          contractId,
          horseId: contract?.horseId || '',
          amount: Number(row.querySelector('[data-field="amount"]').value) || 0,
          dueDate: row.querySelector('[data-field="dueDate"]').value,
          paidDate: row.querySelector('[data-field="paidDate"]').value,
          invoiceNumber: row.querySelector('[data-field="invoiceNumber"]').value,
          status: row.querySelector('[data-field="status"]').value,
          ownerId,
        }
        if (id) {
          updateRecord('payments', id, rowPayload)
          submittedIds.add(id)
        } else {
          const created = createRecord('payments', rowPayload)
          submittedIds.add(created.id)
        }
      })
      payments
        .filter((payment) => !submittedIds.has(payment.id))
        .forEach((payment) => deleteRecord('payments', payment.id))
    }

    notify(`${payload.name} ${editing ? 'updated' : 'added'} successfully.`, 'success')
    navigate(`/owners/${ownerId}`)
  })
}
