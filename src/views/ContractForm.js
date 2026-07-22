import { notify } from '../components/Notification.js'
import { createRecord, getAll, getRecord, updateRecord } from '../services/dataService.js'
import { navigate } from '../router/index.js'

const INCLUDED_SERVICE_OPTIONS = [
  { value: 'full', label: 'Full service' },
  { value: 'weekFull', label: 'Week full service (not weekends)' },
  { value: 'normal', label: 'Normal service' },
]

export function render(container, params = {}) {
  const editing = Boolean(params.id)
  const contract = editing ? getRecord('contracts', params.id) : null
  const horses = getAll('horses'),
    owners = getAll('owners'),
    stalls = getAll('stalls')
  container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${editing ? 'Edit contract' : 'Add contract'}</h1><p class="mt-2 text-sm text-slate-500">Create detailed boarding agreements with pricing and service information.</p></div></div><form id="contract-form" class="panel p-6"><div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"><label><span class="field-label">Horse</span><select class="field" name="horseId" required><option value="">Select horse</option>${horses.map((horse) => `<option value="${horse.id}" ${contract?.horseId === horse.id ? 'selected' : ''}>${horse.name}</option>`).join('')}</select></label><label><span class="field-label">Owner</span><select class="field" name="ownerId" required><option value="">Select owner</option>${owners.map((owner) => `<option value="${owner.id}" ${contract?.ownerId === owner.id ? 'selected' : ''}>${owner.name}</option>`).join('')}</select></label><label><span class="field-label">Stall</span><select class="field" name="stallId" required><option value="">Select stall</option>${stalls.map((stall) => `<option value="${stall.id}" ${contract?.stallId === stall.id ? 'selected' : ''}>Stall ${stall.number}</option>`).join('')}</select></label>${[
    ['monthlyRent', 'Monthly rent (€)', 'number', true],
    ['deposit', 'Deposit (€)', 'number', true],
    ['startDate', 'Start date', 'date', true],
    ['endDate', 'End date', 'date', true],
  ]
    .map(
      ([name, label, type, required]) =>
        `<label><span class="field-label">${label}</span><input class="field" name="${name}" type="${type}" value="${contract?.[name] || ''}" ${required ? 'required' : ''} /></label>`,
    )
    .join(
      '',
    )}<label><span class="field-label">Status</span><select class="field" name="status" required>${['active', 'expired', 'cancelled'].map((value) => `<option value="${value}" ${contract?.status === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><div class="md:col-span-2 xl:col-span-3"><span class="field-label">Included services</span><div class="mt-2 flex flex-col gap-2" data-included-services>${INCLUDED_SERVICE_OPTIONS.map(
    (option) =>
      `<label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" class="h-4 w-4 rounded border-slate-300" data-included-service value="${option.value}" ${contract?.includedServices === option.value ? 'checked' : ''} />${option.label}</label>`,
  ).join(
    '',
  )}</div><p class="mt-1 text-xs text-rose-500 hidden" data-included-services-error>Please select one included service.</p></div><label class="md:col-span-2 xl:col-span-3"><span class="field-label">Additional services</span><textarea class="field min-h-24" name="additionalServices">${contract?.additionalServices || ''}</textarea></label></div><div class="mt-6 flex justify-end gap-3"><button type="button" class="btn-ghost" data-cancel>Cancel</button><button type="submit" class="btn-primary">${editing ? 'Save changes' : 'Create contract'}</button></div></form></div>`
  container.querySelector('[data-cancel]').addEventListener('click', () => navigate('/contracts'))

  const serviceCheckboxes = Array.from(container.querySelectorAll('[data-included-service]'))
  serviceCheckboxes.forEach((checkbox) =>
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        serviceCheckboxes.forEach((other) => {
          if (other !== checkbox) other.checked = false
        })
      }
      container.querySelector('[data-included-services-error]').classList.add('hidden')
    }),
  )

  container.querySelector('#contract-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const selectedService = serviceCheckboxes.find((checkbox) => checkbox.checked)?.value
    if (!selectedService) {
      container.querySelector('[data-included-services-error]').classList.remove('hidden')
      return
    }
    const payload = Object.fromEntries(new FormData(event.target).entries())
    payload.includedServices = selectedService
    payload.monthlyRent = Number(payload.monthlyRent)
    payload.deposit = Number(payload.deposit)
    if (editing) {
      updateRecord('contracts', contract.id, payload)
      notify('Contract updated successfully.', 'success')
    } else {
      createRecord('contracts', payload)
      notify('Contract created successfully.', 'success')
    }
    navigate('/contracts')
  })
}
