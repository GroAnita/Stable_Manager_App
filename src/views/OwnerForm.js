import { notify } from '../components/Notification.js'
import { createRecord, getRecord, updateRecord } from '../services/dataService.js'
import { navigate } from '../router/index.js'

export function render(container, params = {}) {
  const editing = Boolean(params.id)
  const owner = editing ? getRecord('owners', params.id) : null
  container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${editing ? 'Edit owner' : 'Add owner'}</h1><p class="mt-2 text-sm text-slate-500">Store reliable contact and billing details for each boarder.</p></div></div><form id="owner-form" class="panel p-6"><div class="grid gap-5 md:grid-cols-2">${[['name','Name','text',true],['phone','Phone','tel',true],['email','Email','email',true],['address','Address','text',true],['emergencyContact','Emergency contact','text',true],['billingInfo','Billing info','text',true]].map(([name,label,type,required]) => `<label class="${name === 'address' ? 'md:col-span-2' : ''}"><span class="field-label">${label}</span><input class="field" name="${name}" type="${type}" value="${owner?.[name] || ''}" ${required ? 'required' : ''} /></label>`).join('')}</div><div class="mt-6 flex justify-end gap-3"><button type="button" class="btn-ghost" data-cancel>Cancel</button><button type="submit" class="btn-primary">${editing ? 'Save changes' : 'Create owner'}</button></div></form></div>`
  container.querySelector('[data-cancel]').addEventListener('click', () => navigate(editing ? `/owners/${owner.id}` : '/owners'))
  container.querySelector('#owner-form').addEventListener('submit', (event) => { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.target).entries()); if (editing) { updateRecord('owners', owner.id, payload); notify(`${payload.name} updated successfully.`, 'success'); navigate(`/owners/${owner.id}`) } else { const created = createRecord('owners', payload); notify(`${payload.name} added.`, 'success'); navigate(`/owners/${created.id}`) } })
}
