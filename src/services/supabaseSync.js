import { supabase } from './supabaseClient.js'
import { storage } from './storage.js'
import { getStableId } from './stableContext.js'
import { STORAGE_KEYS } from './dataService.js'

const TABLES = {
  horses: 'horses',
  owners: 'owners',
  stalls: 'stalls',
  contracts: 'contracts',
  payments: 'payments',
  calendarEvents: 'calendar_events',
  tasks: 'tasks',
  feedingPlans: 'feeding_plans',
  medicalRecords: 'medical_records',
  priceListItems: 'price_list_items',
}

const safeJsonParse = (value, fallback) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const combineDateTime = (date, time) =>
  date ? new Date(`${date}T${time || '00:00'}:00`).toISOString() : null
const splitDateTime = (isoString) => {
  if (!isoString) return { date: '', time: '' }
  const date = new Date(isoString)
  const pad = (value) => String(value).padStart(2, '0')
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

// ----------------------------------------------------------------------------
// Per-entity mapping between the app's existing camelCase shape (unchanged,
// so views keep working as-is) and the Supabase snake_case column names.
// ----------------------------------------------------------------------------
const mappers = {
  owners: {
    fromDb: (row) => ({
      id: row.id,
      name: row.full_name || '',
      address: row.address || '',
      phone: row.phone || '',
      email: row.email || '',
      emergencyContact: row.emergency_contact || '',
      paymentMethod: row.payment_method || '',
    }),
    toDb: (record) => ({
      full_name: record.name,
      address: record.address || null,
      phone: record.phone || null,
      email: record.email || null,
      emergency_contact: record.emergencyContact || null,
      payment_method: record.paymentMethod || null,
    }),
  },
  horses: {
    fromDb: (row) => ({
      id: row.id,
      name: row.name || '',
      photo: row.photo_url || '',
      breed: row.breed || '',
      age: row.age ?? '',
      gender: row.gender || '',
      color: row.color || '',
      passportNumber: row.passport_number || '',
      microchipNumber: row.microchip_number || '',
      insurance: row.insurance_company || '',
      vaccinationStatus: row.vaccination_status || '',
      medicalNotes: row.medical_notes || '',
      allergies: row.allergies || '',
      feedingInstructions: row.feeding_notes || '',
      ownerId: row.owner_id || '',
      stallId: row.stall_id || '',
      arrivalDate: row.arrival_date || '',
      birthday: row.birthday || '',
      status: row.status || 'active',
      notes: row.notes || '',
      extras: safeJsonParse(row.extras, []),
    }),
    toDb: (record) => ({
      name: record.name,
      photo_url: record.photo || null,
      breed: record.breed || null,
      age: record.age ? Number(record.age) : null,
      gender: record.gender || null,
      color: record.color || null,
      passport_number: record.passportNumber || null,
      microchip_number: record.microchipNumber || null,
      insurance_company: record.insurance || null,
      vaccination_status: record.vaccinationStatus || null,
      medical_notes: record.medicalNotes || null,
      allergies: record.allergies || null,
      feeding_notes: record.feedingInstructions || null,
      owner_id: record.ownerId || null,
      stall_id: record.stallId || null,
      arrival_date: record.arrivalDate || null,
      birthday: record.birthday || null,
      status: record.status || 'active',
      notes: record.notes || null,
      extras: JSON.stringify(record.extras || []),
    }),
  },
  stalls: {
    fromDb: (row) => ({
      id: row.id,
      number: row.stall_number || '',
      size: row.size || '',
      status: row.status || 'available',
      notes: row.notes || '',
      horseId: '', // attached post-pull by cross-referencing horses
    }),
    toDb: (record) => ({
      stall_number: record.number,
      size: record.size || null,
      status: record.status || 'available',
      notes: record.notes || null,
    }),
  },
  contracts: {
    fromDb: (row) => ({
      id: row.id,
      horseId: row.horse_id || '',
      ownerId: row.owner_id || '',
      stallId: row.stall_id || '',
      monthlyRent: row.monthly_rent ?? 0,
      deposit: row.deposit ?? 0,
      startDate: row.start_date || '',
      endDate: row.end_date || '',
      includedServices: row.included_services || '',
      additionalServices: row.additional_services || '',
      status: row.status || 'active',
    }),
    toDb: (record) => ({
      horse_id: record.horseId,
      owner_id: record.ownerId,
      stall_id: record.stallId || null,
      monthly_rent: Number(record.monthlyRent) || 0,
      deposit: Number(record.deposit) || 0,
      start_date: record.startDate,
      end_date: record.endDate || null,
      included_services: record.includedServices || null,
      additional_services: record.additionalServices || null,
      status: record.status || 'active',
    }),
  },
  payments: {
    fromDb: (row) => ({
      id: row.id,
      contractId: row.contract_id || '',
      ownerId: row.owner_id || '',
      horseId: '', // attached post-pull by cross-referencing contracts
      amount: row.amount ?? 0,
      dueDate: row.due_date || '',
      paidDate: row.paid_date || '',
      status: row.status || 'due',
      invoiceNumber: row.invoice_number || '',
      notes: row.notes || '',
    }),
    toDb: (record) => ({
      contract_id: record.contractId,
      owner_id: record.ownerId,
      amount: Number(record.amount) || 0,
      due_date: record.dueDate,
      paid_date: record.paidDate || null,
      invoice_number: record.invoiceNumber || null,
      status: record.status || 'due',
      notes: record.notes || null,
    }),
  },
  calendarEvents: {
    fromDb: (row) => {
      const { date, time } = splitDateTime(row.start_time)
      return {
        id: row.id,
        title: row.title || '',
        type: row.event_type || 'stable_event',
        date,
        time,
        horseId: row.horse_id || '',
        notes: row.description || '',
      }
    },
    toDb: (record) => ({
      title: record.title,
      event_type: record.type || 'stable_event',
      start_time: combineDateTime(record.date, record.time),
      horse_id: record.horseId || null,
      description: record.notes || null,
    }),
  },
  tasks: {
    fromDb: (row) => {
      const meta = safeJsonParse(row.description, null)
      return {
        id: row.id,
        title: row.title || '',
        type: meta?.type || 'General',
        priority: row.priority || 'medium',
        assignedTo: meta?.assignedTo || '',
        dueTime: meta?.dueTime || '',
        completed: row.completed || false,
        date: row.due_date || '',
        notes: meta?.notes || '',
        horseId: row.horse_id || '',
      }
    },
    toDb: (record) => ({
      title: record.title,
      priority: record.priority || 'medium',
      due_date: record.date || null,
      completed: Boolean(record.completed),
      completed_at: record.completed ? new Date().toISOString() : null,
      horse_id: record.horseId || null,
      description: JSON.stringify({
        type: record.type || '',
        assignedTo: record.assignedTo || '',
        dueTime: record.dueTime || '',
        notes: record.notes || '',
      }),
    }),
  },
  feedingPlans: {
    fromDb: (row) => ({
      id: row.id,
      horseId: row.horse_id,
      morning: {
        hay: row.morning_hay || '',
        grain: row.morning_feed || '',
        supplements: row.morning_supplements || '',
      },
      lunch: safeJsonParse(row.lunch, { hay: '', grain: '', supplements: '' }),
      evening: {
        hay: row.evening_hay || '',
        grain: row.evening_feed || '',
        supplements: row.evening_supplements || '',
      },
      specialInstructions: row.special_instructions || '',
      extras: safeJsonParse(row.extras, []),
    }),
    toDb: (record) => ({
      horse_id: record.horseId,
      morning_hay: record.morning?.hay || null,
      morning_feed: record.morning?.grain || null,
      morning_supplements: record.morning?.supplements || null,
      lunch: JSON.stringify(record.lunch || {}),
      evening_hay: record.evening?.hay || null,
      evening_feed: record.evening?.grain || null,
      evening_supplements: record.evening?.supplements || null,
      special_instructions: record.specialInstructions || null,
      extras: JSON.stringify(record.extras || []),
    }),
  },
  medicalRecords: {
    fromDb: (row) => ({
      id: row.id,
      horseId: row.horse_id,
      type: row.type || '',
      date: row.date || '',
      notes: row.description || '',
      nextDueDate: row.next_due || '',
      vet: row.veterinarian || '',
    }),
    toDb: (record) => ({
      horse_id: record.horseId,
      type: record.type || null,
      date: record.date || new Date().toISOString().slice(0, 10),
      description: record.notes || null,
      next_due: record.nextDueDate || null,
      veterinarian: record.vet || null,
    }),
  },
  priceListItems: {
    fromDb: (row) => ({
      id: row.id,
      item: row.item || '',
      category: row.category || '',
      unit: row.unit || '',
      price: row.price ?? 0,
      notes: row.notes || '',
    }),
    toDb: (record) => ({
      item: record.item,
      category: record.category || null,
      unit: record.unit || null,
      price: Number(record.price) || 0,
      notes: record.notes || null,
    }),
  },
}

async function fetchAll(entity) {
  const { data, error } = await supabase.from(TABLES[entity]).select('*')
  if (error) throw error
  return data.map((row) => mappers[entity].fromDb(row))
}

export async function pullAllFromSupabase() {
  const [
    owners,
    horses,
    stalls,
    contracts,
    payments,
    calendarEvents,
    tasks,
    feedingPlans,
    medicalRecords,
    priceListItems,
  ] = await Promise.all([
    fetchAll('owners'),
    fetchAll('horses'),
    fetchAll('stalls'),
    fetchAll('contracts'),
    fetchAll('payments'),
    fetchAll('calendarEvents'),
    fetchAll('tasks'),
    fetchAll('feedingPlans'),
    fetchAll('medicalRecords'),
    fetchAll('priceListItems'),
  ])

  // stalls.horseId and payments.horseId aren't columns in their own tables —
  // derive them from the horses/contracts we already pulled.
  const stallIdToHorseId = new Map(
    horses.filter((horse) => horse.stallId).map((horse) => [horse.stallId, horse.id]),
  )
  stalls.forEach((stall) => {
    stall.horseId = stallIdToHorseId.get(stall.id) || ''
  })

  const contractIdToHorseId = new Map(contracts.map((contract) => [contract.id, contract.horseId]))
  payments.forEach((payment) => {
    payment.horseId = contractIdToHorseId.get(payment.contractId) || ''
  })

  storage.set(STORAGE_KEYS.owners, owners)
  storage.set(STORAGE_KEYS.horses, horses)
  storage.set(STORAGE_KEYS.stalls, stalls)
  storage.set(STORAGE_KEYS.contracts, contracts)
  storage.set(STORAGE_KEYS.payments, payments)
  storage.set(STORAGE_KEYS.calendarEvents, calendarEvents)
  storage.set(STORAGE_KEYS.tasks, tasks)
  storage.set(STORAGE_KEYS.feedingPlans, feedingPlans)
  storage.set(STORAGE_KEYS.medicalRecords, medicalRecords)
  storage.set(STORAGE_KEYS.priceListItems, priceListItems)

  await pullSettings()
}

export async function pullSettings() {
  const stableId = getStableId()
  if (!stableId) return
  const { data, error } = await supabase.from('stables').select('*').eq('id', stableId).single()
  if (error) throw error
  const existing = storage.get(STORAGE_KEYS.settings) || {}
  storage.set(STORAGE_KEYS.settings, {
    ...existing,
    stableName: data.name || existing.stableName || '',
    address: data.address || existing.address || '',
    phone: data.phone || existing.phone || '',
    email: data.email || existing.email || '',
  })
}

export async function pushCreate(entity, record) {
  if (!mappers[entity]) return null
  const stableId = getStableId()
  const row = { id: record.id, stable_id: stableId, ...mappers[entity].toDb(record) }
  const { error } = await supabase.from(TABLES[entity]).insert(row)
  if (error) throw error
  return record
}

export async function pushUpdate(entity, id, record) {
  if (!mappers[entity]) return null
  const { error } = await supabase
    .from(TABLES[entity])
    .update(mappers[entity].toDb(record))
    .eq('id', id)
  if (error) throw error
  return record
}

export async function pushDelete(entity, id) {
  if (!mappers[entity]) return null
  const { error } = await supabase.from(TABLES[entity]).delete().eq('id', id)
  if (error) throw error
  return true
}

export async function pushSettingsUpdate(settings) {
  const stableId = getStableId()
  if (!stableId) return null
  const { error } = await supabase
    .from('stables')
    .update({
      name: settings.stableName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
    })
    .eq('id', stableId)
  if (error) throw error
  return settings
}
