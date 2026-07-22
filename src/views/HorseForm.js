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
  ['overview', 'Overview'],
  ['medical', 'Medical'],
  ['feeding', 'Feeding'],
  ['documents', 'Documents'],
  ['schedule', 'Schedule'],
  ['notes', 'Notes'],
]

export function render(container, params = {}) {
  const editing = Boolean(params.id)
  const horse = editing ? getRecord('horses', params.id) : null
  const owners = getAll('owners')
  const stalls = getAll('stalls').filter(
    (stall) =>
      !stall.horseId ||
      stall.horseId === horse?.id ||
      stall.status === 'available' ||
      stall.status === 'occupied',
  )
  const feedingPlan = editing
    ? getAll('feedingPlans').find((plan) => plan.horseId === horse.id)
    : null
  const medicalRecords = editing
    ? getAll('medicalRecords').filter((record) => record.horseId === horse.id)
    : []
  const events = editing
    ? getAll('calendarEvents').filter((event) => event.horseId === horse.id)
    : []
  let activeTab = 'overview'
  let medicalRows = medicalRecords.map((record) => ({ ...record }))
  let eventRows = events.map((event) => ({ ...event }))

  const medicalRowTemplate = (row = {}) => `
    <div class="record-row grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-4" data-row-id="${row.id || ''}">
      <label><span class="field-label">Type</span><select class="field" data-field="type"><option value="vaccination" ${row.type === 'vaccination' ? 'selected' : ''}>Vaccination</option><option value="farrier" ${row.type === 'farrier' ? 'selected' : ''}>Farrier</option><option value="worming" ${row.type === 'worming' ? 'selected' : ''}>Worming</option><option value="dental" ${row.type === 'dental' ? 'selected' : ''}>Dental</option><option value="vet" ${row.type === 'vet' ? 'selected' : ''}>Vet</option></select></label>
      <label><span class="field-label">Date</span><input class="field" type="date" data-field="date" value="${row.date || ''}" /></label>
      <label><span class="field-label">Next due</span><input class="field" type="date" data-field="nextDueDate" value="${row.nextDueDate || ''}" /></label>
      <label><span class="field-label">Vet / provider</span><input class="field" type="text" data-field="vet" value="${row.vet || ''}" /></label>
      <label class="md:col-span-2 xl:col-span-3"><span class="field-label">Notes</span><textarea class="field min-h-16" data-field="notes">${row.notes || ''}</textarea></label>
      <div class="flex items-end"><button type="button" class="btn-ghost w-full" data-remove-row>Remove</button></div>
    </div>`

  const eventRowTemplate = (row = {}) => `
    <div class="record-row grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-4" data-row-id="${row.id || ''}">
      <label><span class="field-label">Title</span><input class="field" type="text" data-field="title" value="${row.title || ''}" /></label>
      <label><span class="field-label">Type</span><select class="field" data-field="type">${['vet', 'farrier', 'vaccination', 'worming', 'training', 'stable_event', 'arena_booking'].map((value) => `<option value="${value}" ${row.type === value ? 'selected' : ''}>${value.replace('_', ' ')}</option>`).join('')}</select></label>
      <label><span class="field-label">Date</span><input class="field" type="date" data-field="date" value="${row.date || ''}" /></label>
      <label><span class="field-label">Time</span><input class="field" type="time" data-field="time" value="${row.time || ''}" /></label>
      <label class="md:col-span-2 xl:col-span-3"><span class="field-label">Notes</span><textarea class="field min-h-16" data-field="notes">${row.notes || ''}</textarea></label>
      <div class="flex items-end"><button type="button" class="btn-ghost w-full" data-remove-row>Remove</button></div>
    </div>`

  container.innerHTML = `
    <div class="page-shell">
      <div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${editing ? 'Edit horse' : 'Add horse'}</h1><p class="mt-2 text-sm text-slate-500">Capture complete profile, care and boarding information.</p></div></div>
      <div class="flex flex-wrap gap-2">${TABS.map(([key, label]) => `<button type="button" class="${key === activeTab ? 'bg-forest text-white' : 'bg-white text-slate-600'} rounded-xl px-4 py-2 text-sm font-medium" data-tab="${key}">${label}</button>`).join('')}</div>
      <form id="horse-form" class="panel p-6">

        <div class="tab-panel" data-panel="overview">
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            ${[
              ['name', 'Name', 'text', true],
              ['breed', 'Breed', 'text', true],
              ['age', 'Age', 'number', true],
              ['gender', 'Gender', 'text', true],
              ['color', 'Color', 'text', true],
              ['birthday', 'Birthday', 'date', true],
              ['arrivalDate', 'Arrival date', 'date', true],
              ['photo', 'Photo placeholder', 'text', false],
            ]
              .map(
                ([name, label, type, required]) =>
                  `<label><span class="field-label">${label}</span><input class="field" name="${name}" type="${type}" value="${horse?.[name] || (name === 'photo' ? '🐴' : '')}" ${required ? 'required' : ''} /></label>`,
              )
              .join('')}
            <label><span class="field-label">Status</span><select class="field" name="status" required>${['active', 'monitoring', 'rehab', 'training', 'new'].map((value) => `<option value="${value}" ${horse?.status === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
            <label><span class="field-label">Owner</span><select class="field" name="ownerId" required><option value="">Select owner</option>${owners.map((owner) => `<option value="${owner.id}" ${horse?.ownerId === owner.id ? 'selected' : ''}>${owner.name}</option>`).join('')}</select></label>
            <label><span class="field-label">Stall</span><select class="field" name="stallId" required><option value="">Select stall</option>${stalls.map((stall) => `<option value="${stall.id}" ${horse?.stallId === stall.id ? 'selected' : ''}>Stall ${stall.number} · ${stall.size}</option>`).join('')}</select></label>
          </div>
        </div>

        <div class="tab-panel hidden" data-panel="medical">
          <div class="grid gap-5 md:grid-cols-2">
            <label><span class="field-label">Vaccination status</span><select class="field" name="vaccinationStatus">${['Up to date', 'Due soon', 'Overdue'].map((value) => `<option value="${value}" ${horse?.vaccinationStatus === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
            <label><span class="field-label">Allergies</span><input class="field" name="allergies" type="text" value="${horse?.allergies || ''}" /></label>
            <label class="md:col-span-2"><span class="field-label">Medical notes</span><textarea class="field min-h-24" name="medicalNotes">${horse?.medicalNotes || ''}</textarea></label>
          </div>
          <div class="mt-6 flex items-center justify-between"><h3 class="font-semibold text-slate-900">Medical records</h3><button type="button" class="btn-ghost" data-add-medical>Add record</button></div>
          <div class="mt-3 space-y-3" data-medical-list>${medicalRows.map(medicalRowTemplate).join('')}</div>
        </div>

        <div class="tab-panel hidden" data-panel="feeding">
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            ${['morning', 'lunch', 'evening']
              .map(
                (period) => `
              <div class="rounded-2xl bg-slate-50 p-4 space-y-3">
                <h3 class="font-semibold text-slate-900">${period.charAt(0).toUpperCase() + period.slice(1)}</h3>
                <label><span class="field-label">Hay</span><input class="field" name="${period}Hay" type="text" value="${feedingPlan?.[period]?.hay || ''}" /></label>
                <label><span class="field-label">Grain</span><input class="field" name="${period}Grain" type="text" value="${feedingPlan?.[period]?.grain || ''}" /></label>
                <label><span class="field-label">Supplements</span><input class="field" name="${period}Supplements" type="text" value="${feedingPlan?.[period]?.supplements || ''}" /></label>
              </div>`,
              )
              .join('')}
          </div>
          <label class="mt-5 block"><span class="field-label">Feeding instructions</span><textarea class="field min-h-24" name="feedingInstructions">${horse?.feedingInstructions || ''}</textarea></label>
          <label class="mt-5 block"><span class="field-label">Special feeding instructions</span><textarea class="field min-h-24" name="specialInstructions">${feedingPlan?.specialInstructions || ''}</textarea></label>
        </div>

        <div class="tab-panel hidden" data-panel="documents">
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            ${[
              ['passportNumber', 'Passport number', 'text', false],
              ['microchipNumber', 'Microchip number', 'text', false],
              ['insurance', 'Insurance', 'text', false],
            ]
              .map(
                ([name, label, type, required]) =>
                  `<label><span class="field-label">${label}</span><input class="field" name="${name}" type="${type}" value="${horse?.[name] || ''}" ${required ? 'required' : ''} /></label>`,
              )
              .join('')}
          </div>
        </div>

        <div class="tab-panel hidden" data-panel="schedule">
          <div class="flex items-center justify-between"><h3 class="font-semibold text-slate-900">Calendar events</h3><button type="button" class="btn-ghost" data-add-event>Add event</button></div>
          <div class="mt-3 space-y-3" data-event-list>${eventRows.map(eventRowTemplate).join('')}</div>
        </div>

        <div class="tab-panel hidden" data-panel="notes">
          <label class="block"><span class="field-label">General notes</span><textarea class="field min-h-32" name="notes">${horse?.notes || ''}</textarea></label>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-3"><button type="button" class="btn-ghost" data-cancel>Cancel</button><button type="submit" class="btn-primary">${editing ? 'Save changes' : 'Create horse'}</button></div>
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
  container.querySelectorAll('#horse-form [required]').forEach((field) => {
    field.addEventListener('invalid', () => {
      const panel = field.closest('[data-panel]')
      if (panel) switchTab(panel.getAttribute('data-panel'))
    })
  })

  const medicalList = container.querySelector('[data-medical-list]')
  const eventList = container.querySelector('[data-event-list]')

  container
    .querySelector('[data-add-medical]')
    .addEventListener('click', () =>
      medicalList.insertAdjacentHTML('beforeend', medicalRowTemplate()),
    )
  container
    .querySelector('[data-add-event]')
    .addEventListener('click', () => eventList.insertAdjacentHTML('beforeend', eventRowTemplate()))
  container.querySelector('[data-medical-list]').addEventListener('click', (event) => {
    if (event.target.closest('[data-remove-row]')) event.target.closest('.record-row').remove()
  })
  container.querySelector('[data-event-list]').addEventListener('click', (event) => {
    if (event.target.closest('[data-remove-row]')) event.target.closest('.record-row').remove()
  })

  container
    .querySelector('[data-cancel]')
    .addEventListener('click', () => navigate(editing ? `/horses/${horse.id}` : '/horses'))

  container.querySelector('#horse-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(event.target)
    const payload = Object.fromEntries(formData.entries())
    payload.age = Number(payload.age)

    const feedingPayload = {
      morning: {
        hay: payload.morningHay || '',
        grain: payload.morningGrain || '',
        supplements: payload.morningSupplements || '',
      },
      lunch: {
        hay: payload.lunchHay || '',
        grain: payload.lunchGrain || '',
        supplements: payload.lunchSupplements || '',
      },
      evening: {
        hay: payload.eveningHay || '',
        grain: payload.eveningGrain || '',
        supplements: payload.eveningSupplements || '',
      },
      specialInstructions: payload.specialInstructions || '',
    }
    ;[
      'morningHay',
      'morningGrain',
      'morningSupplements',
      'lunchHay',
      'lunchGrain',
      'lunchSupplements',
      'eveningHay',
      'eveningGrain',
      'eveningSupplements',
      'specialInstructions',
    ].forEach((key) => delete payload[key])

    const medicalPayload = Array.from(medicalList.querySelectorAll('.record-row')).map((row) => ({
      id: row.getAttribute('data-row-id') || undefined,
      type: row.querySelector('[data-field="type"]').value,
      date: row.querySelector('[data-field="date"]').value,
      nextDueDate: row.querySelector('[data-field="nextDueDate"]').value,
      vet: row.querySelector('[data-field="vet"]').value,
      notes: row.querySelector('[data-field="notes"]').value,
    }))

    const eventPayload = Array.from(eventList.querySelectorAll('.record-row')).map((row) => ({
      id: row.getAttribute('data-row-id') || undefined,
      title: row.querySelector('[data-field="title"]').value,
      type: row.querySelector('[data-field="type"]').value,
      date: row.querySelector('[data-field="date"]').value,
      time: row.querySelector('[data-field="time"]').value,
      notes: row.querySelector('[data-field="notes"]').value,
    }))

    const horseId = editing ? horse.id : createRecord('horses', payload).id
    if (editing) updateRecord('horses', horseId, payload)

    const existingPlan = getAll('feedingPlans').find((plan) => plan.horseId === horseId)
    if (existingPlan) updateRecord('feedingPlans', existingPlan.id, feedingPayload)
    else createRecord('feedingPlans', { ...feedingPayload, horseId })

    // Update rows that already existed, delete rows the user removed, and
    // only create rows that are genuinely new. Deleting everything and
    // recreating it (even unchanged rows) raced the fire-and-forget Supabase
    // delete/create calls for the same id and could throw a duplicate-key
    // error when the recreate reached the server before the delete did.
    const syncChildRecords = (entity, payloadRows) => {
      const existing = getAll(entity).filter((item) => item.horseId === horseId)
      const keptIds = new Set(payloadRows.filter((row) => row.id).map((row) => row.id))
      existing
        .filter((item) => !keptIds.has(item.id))
        .forEach((item) => deleteRecord(entity, item.id))
      payloadRows.forEach((row) =>
        row.id
          ? updateRecord(entity, row.id, { ...row, horseId })
          : createRecord(entity, { ...row, horseId }),
      )
    }
    syncChildRecords('medicalRecords', medicalPayload)
    syncChildRecords('calendarEvents', eventPayload)

    notify(
      `${payload.name} ${editing ? 'updated' : 'added to the stable'} successfully.`,
      'success',
    )
    navigate(`/horses/${horseId}`)
  })
}
