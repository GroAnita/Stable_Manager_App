import { notify } from '../components/Notification.js'
import { createRecord, getAll, getRecord, updateRecord } from '../services/dataService.js'
import { navigate } from '../router/index.js'

export function render(container, params = {}) {
  const editing = Boolean(params.id)
  const horse = editing ? getRecord('horses', params.id) : null
  const owners = getAll('owners')
  const stalls = getAll('stalls').filter((stall) => !stall.horseId || stall.horseId === horse?.id || stall.status === 'available' || stall.status === 'occupied')
  container.innerHTML = `
    <div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${editing ? 'Edit horse' : 'Add horse'}</h1><p class="mt-2 text-sm text-slate-500">Capture complete profile, care and boarding information.</p></div></div>
      <form id="horse-form" class="panel p-6"><div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        ${[['name','Name','text',true],['breed','Breed','text',true],['age','Age','number',true],['gender','Gender','text',true],['color','Color','text',true],['birthday','Birthday','date',true],['passportNumber','Passport number','text',true],['microchipNumber','Microchip number','text',true],['insurance','Insurance','text',true],['arrivalDate','Arrival date','date',true],['allergies','Allergies','text',false],['photo','Photo placeholder','text',false]].map(([name,label,type,required]) => `<label><span class="field-label">${label}</span><input class="field" name="${name}" type="${type}" value="${horse?.[name] || (name === 'photo' ? '🐴' : '')}" ${required ? 'required' : ''} /></label>`).join('')}
        <label><span class="field-label">Status</span><select class="field" name="status" required>${['active','monitoring','rehab','training','new'].map((value) => `<option value="${value}" ${horse?.status === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label><span class="field-label">Vaccination status</span><select class="field" name="vaccinationStatus" required>${['Up to date','Due soon','Overdue'].map((value) => `<option value="${value}" ${horse?.vaccinationStatus === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label><span class="field-label">Owner</span><select class="field" name="ownerId" required><option value="">Select owner</option>${owners.map((owner) => `<option value="${owner.id}" ${horse?.ownerId === owner.id ? 'selected' : ''}>${owner.name}</option>`).join('')}</select></label>
        <label><span class="field-label">Stall</span><select class="field" name="stallId" required><option value="">Select stall</option>${stalls.map((stall) => `<option value="${stall.id}" ${horse?.stallId === stall.id ? 'selected' : ''}>Stall ${stall.number} · ${stall.size}</option>`).join('')}</select></label>
        <label class="md:col-span-2 xl:col-span-3"><span class="field-label">Feeding instructions</span><textarea class="field min-h-24" name="feedingInstructions" required>${horse?.feedingInstructions || ''}</textarea></label>
        <label class="md:col-span-2 xl:col-span-3"><span class="field-label">Medical notes</span><textarea class="field min-h-24" name="medicalNotes">${horse?.medicalNotes || ''}</textarea></label>
        <label class="md:col-span-2 xl:col-span-3"><span class="field-label">General notes</span><textarea class="field min-h-24" name="notes">${horse?.notes || ''}</textarea></label>
      </div><div class="mt-6 flex flex-wrap justify-end gap-3"><button type="button" class="btn-ghost" data-cancel>Cancel</button><button type="submit" class="btn-primary">${editing ? 'Save changes' : 'Create horse'}</button></div></form></div>`
  container.querySelector('[data-cancel]').addEventListener('click', () => navigate(editing ? `/horses/${horse.id}` : '/horses'))
  container.querySelector('#horse-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.target).entries())
    payload.age = Number(payload.age)
    if (editing) { updateRecord('horses', horse.id, payload); notify(`${payload.name} updated successfully.`, 'success'); navigate(`/horses/${horse.id}`) }
    else { const created = createRecord('horses', payload); notify(`${payload.name} added to the stable.`, 'success'); navigate(`/horses/${created.id}`) }
  })
}
