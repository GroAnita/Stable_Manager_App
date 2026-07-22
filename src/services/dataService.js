import { storage } from './storage.js'
import { generateId, setCurrency } from '../utils/helpers.js'
import { notify } from '../components/Notification.js'
import {
  pullAllFromSupabase,
  pushCreate,
  pushUpdate,
  pushDelete,
  pushSettingsUpdate,
} from './supabaseSync.js'

const PREFIX = 'stable-manager'
export const STORAGE_KEYS = {
  horses: `${PREFIX}:horses`,
  owners: `${PREFIX}:owners`,
  stalls: `${PREFIX}:stalls`,
  contracts: `${PREFIX}:contracts`,
  payments: `${PREFIX}:payments`,
  calendarEvents: `${PREFIX}:calendarEvents`,
  tasks: `${PREFIX}:tasks`,
  feedingPlans: `${PREFIX}:feedingPlans`,
  medicalRecords: `${PREFIX}:medicalRecords`,
  settings: `${PREFIX}:settings`,
}

const today = new Date()
const pad = (value) => String(value).padStart(2, '0')
const dateISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (days) => {
  const date = new Date(today)
  date.setDate(date.getDate() + days)
  return dateISO(date)
}
const addMonths = (months, day = 1) =>
  dateISO(new Date(today.getFullYear(), today.getMonth() + months, day))
const time = (h, m = 0) => `${pad(h)}:${pad(m)}`

const ownerSeeds = [
  [
    'owner-anna-lindberg',
    'Anna Lindberg',
    'Birch Lane 14, Stockholm',
    '+46 70 112 3344',
    'anna.lindberg@example.com',
    'Erik Lindberg · +46 70 998 2211',
    'Bank transfer · Ref AL-001',
  ],
  [
    'owner-johan-dahl',
    'Johan Dahl',
    'Meadow Road 8, Uppsala',
    '+46 73 334 5566',
    'johan.dahl@example.com',
    'Maria Dahl · +46 73 771 8811',
    'Invoice by email · 14-day terms',
  ],
  [
    'owner-freja-nystrom',
    'Freja Nyström',
    'Oak Court 27, Gothenburg',
    '+46 72 889 1144',
    'freja.nystrom@example.com',
    'Lars Nyström · +46 72 221 4400',
    'Autopay registered · Ref FN-27',
  ],
  [
    'owner-mikael-berg',
    'Mikael Berg',
    'Harbour View 5, Malmö',
    '+46 76 220 1188',
    'mikael.berg@example.com',
    'Sofia Berg · +46 76 220 1177',
    'Invoice by post · customer 1045',
  ],
  [
    'owner-lina-karlsson',
    'Lina Karlsson',
    'Pine Terrace 2, Lund',
    '+46 79 501 6633',
    'lina.karlsson@example.com',
    'Nils Karlsson · +46 79 444 2233',
    'Bank transfer · Ref LK-005',
  ],
].map(([id, name, address, phone, email, emergencyContact, paymentMethod]) => ({
  id,
  name,
  address,
  phone,
  email,
  emergencyContact,
  paymentMethod,
}))

const horseSeeds = [
  [
    'horse-bella',
    'Bella',
    'Swedish Warmblood',
    9,
    'Mare',
    'Bay',
    'SE-SWB-10294',
    '752098100112233',
    'Agria Premium',
    'Up to date',
    'Sensitive to spring pollen; monitor coughing after trail rides.',
    'Spring pollen',
    'Low starch diet with soaked beet pulp.',
    'owner-anna-lindberg',
    'stall-1',
    addMonths(-14, 12),
    '2017-04-18',
    'active',
    'Prefers quiet turnout companions and evening grooming.',
  ],
  [
    'horse-thunder',
    'Thunder',
    'Holsteiner',
    11,
    'Gelding',
    'Dark Bay',
    'DE-HOL-88310',
    '276098106778899',
    'If Equine Sport',
    'Due soon',
    'Needs protective boots when hacking.',
    'None',
    'Extra electrolytes after training.',
    'owner-johan-dahl',
    'stall-2',
    addMonths(-20, 5),
    '2015-08-03',
    'active',
    'Competes monthly in 1.10m showjumping classes.',
  ],
  [
    'horse-spirit',
    'Spirit',
    'Icelandic',
    7,
    'Gelding',
    'Chestnut',
    'IS-ICE-55021',
    '352098700123456',
    'Folksam Equine',
    'Up to date',
    'Watch hoof sensitivity after farrier visits.',
    'Dusty hay',
    'Feed steamed hay and mineral balancer only.',
    'owner-freja-nystrom',
    'stall-3',
    addMonths(-9, 20),
    '2019-05-11',
    'monitoring',
    'Very friendly with children; suitable for therapy sessions.',
  ],
  [
    'horse-luna',
    'Luna',
    'Andalusian',
    10,
    'Mare',
    'Grey',
    'ES-AND-22045',
    '724098100998877',
    'Trygg Hansa Full Care',
    'Up to date',
    'Massage every 6 weeks for topline support.',
    'None',
    'Split grain into three small meals.',
    'owner-lina-karlsson',
    'stall-4',
    addMonths(-16, 2),
    '2016-02-27',
    'active',
    'Excellent dressage mare with calm temperament.',
  ],
  [
    'horse-duke',
    'Duke',
    'Friesian',
    12,
    'Gelding',
    'Black',
    'NL-FRI-33192',
    '528098100324567',
    'Sveland Equine',
    'Overdue',
    'Needs regular feather checks and drying.',
    'Midge bites',
    'Add linseed oil to evening feed.',
    'owner-mikael-berg',
    'stall-5',
    addMonths(-26, 9),
    '2014-06-16',
    'rehab',
    'Recovering from mild hock inflammation.',
  ],
  [
    'horse-willow',
    'Willow',
    'Connemara',
    8,
    'Mare',
    'Dun',
    'IE-CON-78411',
    '372098100114499',
    'Agria Standard',
    'Up to date',
    'No current issues.',
    'None',
    'Small grain ration, ad-lib hay.',
    'owner-anna-lindberg',
    'stall-6',
    addMonths(-11, 8),
    '2018-09-09',
    'active',
    'Sensitive in windy weather; warm-up gradually.',
  ],
  [
    'horse-atlas',
    'Atlas',
    'Dutch Warmblood',
    6,
    'Gelding',
    'Seal Brown',
    'NL-KWPN-55210',
    '528098109990011',
    'Protector Equine Plus',
    'Due soon',
    'Monitor left fore tendon after intense jumping.',
    'None',
    'High fibre cubes with joint supplement.',
    'owner-johan-dahl',
    'stall-7',
    addMonths(-6, 14),
    '2020-03-22',
    'training',
    'Young horse in a progressive jumping program.',
  ],
  [
    'horse-aurora',
    'Aurora',
    'Lusitano',
    13,
    'Mare',
    'Palomino',
    'PT-LUS-18540',
    '620098102224466',
    'Equit Protect',
    'Up to date',
    'Senior vitamin supplement required.',
    'Grass pollen',
    'Mash on colder evenings.',
    'owner-freja-nystrom',
    'stall-8',
    addMonths(-30, 1),
    '2013-07-30',
    'active',
    'Elegant schoolmaster used for advanced flatwork lessons.',
  ],
  [
    'horse-comet',
    'Comet',
    'Welsh Cob',
    5,
    'Gelding',
    'Skewbald',
    'GB-WC-66219',
    '826098100771122',
    'Agria Young Horse',
    'Up to date',
    'No current issues.',
    'None',
    'Plenty of hay, light concentrate.',
    'owner-lina-karlsson',
    'stall-9',
    addMonths(-4, 18),
    '2021-06-14',
    'new',
    'Settling in well and enjoying groundwork sessions.',
  ],
  [
    'horse-sage',
    'Sage',
    'Arabian',
    14,
    'Mare',
    'Flea-bitten Grey',
    'PL-ARA-44103',
    '616098100563278',
    'Sveland Premium',
    'Due soon',
    'Teeth check booked next month.',
    'Lucerne intolerance',
    'Avoid alfalfa, add probiotic daily.',
    'owner-mikael-berg',
    'stall-10',
    addMonths(-18, 6),
    '2012-01-05',
    'active',
    'Excellent endurance mare, enjoys long hacks.',
  ],
].map(
  ([
    id,
    name,
    breed,
    age,
    gender,
    color,
    passportNumber,
    microchipNumber,
    insurance,
    vaccinationStatus,
    medicalNotes,
    allergies,
    feedingInstructions,
    ownerId,
    stallId,
    arrivalDate,
    birthday,
    status,
    notes,
  ]) => ({
    id,
    name,
    photo: '🐴',
    breed,
    age,
    gender,
    color,
    passportNumber,
    microchipNumber,
    insurance,
    vaccinationStatus,
    medicalNotes,
    allergies,
    feedingInstructions,
    ownerId,
    stallId,
    arrivalDate,
    birthday,
    status,
    notes,
  }),
)

const stallSeeds = Array.from({ length: 20 }, (_, index) => {
  const number = index + 1
  const horse = horseSeeds[index]
  const status = horse
    ? 'occupied'
    : [11, 12].includes(number)
      ? 'reserved'
      : number === 19
        ? 'maintenance'
        : 'available'
  return {
    id: `stall-${number}`,
    number: String(number),
    size: number <= 8 ? 'large' : number <= 15 ? 'medium' : 'small',
    status,
    horseId: horse?.id || '',
    notes: horse
      ? `${horse.name}'s stall near ${number <= 10 ? 'indoor arena' : 'south yard'}.`
      : status === 'reserved'
        ? 'Held for incoming training horse next month.'
        : status === 'maintenance'
          ? 'Floor mat replacement scheduled this week.'
          : 'Fresh bedding and automatic waterer checked.',
  }
})

const contractSeeds = [
  [
    'contract-bella',
    'horse-bella',
    'owner-anna-lindberg',
    'stall-1',
    720,
    700,
    addMonths(-12, 1),
    addMonths(12, 30),
    'Stall, daily turnout, hay, mucking',
    'Blanketing service',
    'active',
  ],
  [
    'contract-thunder',
    'horse-thunder',
    'owner-johan-dahl',
    'stall-2',
    780,
    750,
    addMonths(-10, 1),
    addMonths(2, 30),
    'Competition board, tack locker, arena access',
    'Extra grooming',
    'active',
  ],
  [
    'contract-spirit',
    'horse-spirit',
    'owner-freja-nystrom',
    'stall-3',
    610,
    600,
    addMonths(-6, 1),
    addMonths(6, 30),
    'Paddock board, hay, turnout',
    'Steamed hay preparation',
    'active',
  ],
  [
    'contract-luna',
    'horse-luna',
    'owner-lina-karlsson',
    'stall-4',
    760,
    700,
    addMonths(-20, 1),
    addMonths(4, 30),
    'Full board, lessons coordination',
    'Physio scheduling',
    'active',
  ],
  [
    'contract-duke',
    'horse-duke',
    'owner-mikael-berg',
    'stall-5',
    690,
    650,
    addMonths(-18, 1),
    addMonths(1, 15),
    'Full board and rehab paddock',
    'Ice therapy after exercise',
    'active',
  ],
  [
    'contract-willow',
    'horse-willow',
    'owner-anna-lindberg',
    'stall-6',
    640,
    600,
    addMonths(-8, 1),
    addMonths(5, 30),
    'Pony board, turnout, hay',
    'Schooling ride weekly',
    'active',
  ],
  [
    'contract-atlas',
    'horse-atlas',
    'owner-johan-dahl',
    'stall-7',
    735,
    700,
    addMonths(-3, 1),
    addMonths(9, 30),
    'Young horse training board',
    'Jump schooling package',
    'active',
  ],
  [
    'contract-aurora',
    'horse-aurora',
    'owner-freja-nystrom',
    'stall-8',
    680,
    650,
    addMonths(-24, 1),
    addMonths(-1, 30),
    'Senior care board',
    'Supplement administration',
    'expired',
  ],
].map(
  ([
    id,
    horseId,
    ownerId,
    stallId,
    monthlyRent,
    deposit,
    startDate,
    endDate,
    includedServices,
    additionalServices,
    status,
  ]) => ({
    id,
    horseId,
    ownerId,
    stallId,
    monthlyRent,
    deposit,
    startDate,
    endDate,
    includedServices,
    additionalServices,
    status,
  }),
)

function generatePayments() {
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  return contractSeeds
    .flatMap((contract, contractIndex) =>
      Array.from({ length: 12 }, (_, index) => 11 - index).map((offset) => {
        const dueDate = new Date(currentYear, currentMonth - offset, 5 + (contractIndex % 4))
        const due = dateISO(dueDate)
        const monthDiff =
          (currentYear - dueDate.getFullYear()) * 12 + (currentMonth - dueDate.getMonth())
        const amount =
          contract.monthlyRent + (contractIndex % 3 === 0 ? 40 : contractIndex % 4 === 0 ? 25 : 0)
        let status = 'paid'
        let paidDate = dateISO(
          new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + 2),
        )
        if (monthDiff === 0 && contractIndex % 2 === 0) {
          status = 'due'
          paidDate = ''
        }
        if (monthDiff === 1 && [1, 4].includes(contractIndex)) {
          status = 'overdue'
          paidDate = ''
        }
        return {
          id: generateId(),
          contractId: contract.id,
          ownerId: contract.ownerId,
          horseId: contract.horseId,
          amount,
          dueDate: due,
          paidDate,
          status,
          invoiceNumber: `INV-${dueDate.getFullYear()}${pad(dueDate.getMonth() + 1)}-${contractIndex + 1}`,
        }
      }),
    )
    .filter((payment) => payment)
}

const calendarEvents = [
  [
    'Spring vaccination clinic',
    'vaccination',
    2,
    time(9),
    'horse-bella',
    'Annual influenza and tetanus boosters.',
    '#D8B25A',
  ],
  [
    'Thunder shoe reset',
    'farrier',
    1,
    time(13, 30),
    'horse-thunder',
    'Front shoes with stud holes.',
    '#8B6B4A',
  ],
  [
    'Spirit dental check',
    'vet',
    5,
    time(10),
    'horse-spirit',
    'Routine annual dentistry.',
    '#3A6B52',
  ],
  [
    'Arena harrow maintenance',
    'arena',
    3,
    time(7, 30),
    '',
    'Surface groomed before lessons.',
    '#7C8A7D',
  ],
  [
    'Luna owner visit',
    'owner_visit',
    4,
    time(16),
    'horse-luna',
    'Owner lesson with trainer Sofia.',
    '#C88E59',
  ],
  [
    'Duke rehab review',
    'vet',
    6,
    time(14),
    'horse-duke',
    'Hock flexion check and ultrasound.',
    '#A15454',
  ],
  [
    'Willow pony club lesson',
    'training',
    2,
    time(17),
    'horse-willow',
    'Group lesson in outdoor arena.',
    '#5B8A72',
  ],
  [
    'Atlas jumping school',
    'training',
    8,
    time(11),
    'horse-atlas',
    'Gridwork with poles and bounces.',
    '#5B8A72',
  ],
  [
    'Aurora worming',
    'worming',
    9,
    time(8, 30),
    'horse-aurora',
    'Oral dose after breakfast.',
    '#D8B25A',
  ],
  [
    'Comet settle-in check',
    'vet',
    10,
    time(15, 30),
    'horse-comet',
    'New arrival wellness exam.',
    '#3A6B52',
  ],
  [
    'Sage farrier visit',
    'farrier',
    12,
    time(9, 15),
    'horse-sage',
    'Hind balance correction.',
    '#8B6B4A',
  ],
  [
    'Pasture rotation day',
    'event',
    13,
    time(8),
    '',
    'Move group turnout to north pasture.',
    '#688F91',
  ],
  [
    'Bella physiotherapy',
    'vet',
    15,
    time(12),
    'horse-bella',
    'Back release and stretching routine.',
    '#3A6B52',
  ],
  [
    'Thunder vaccination follow-up',
    'vaccination',
    18,
    time(10, 45),
    'horse-thunder',
    'Booster and paperwork update.',
    '#D8B25A',
  ],
  [
    'Spirit groundwork clinic',
    'training',
    20,
    time(18),
    'horse-spirit',
    'Confidence poles and desensitisation.',
    '#5B8A72',
  ],
  [
    'Luna grooming event',
    'event',
    22,
    time(14),
    'horse-luna',
    'Scandinavian style grooming workshop.',
    '#688F91',
  ],
  [
    'Duke farrier review',
    'farrier',
    24,
    time(11, 30),
    'horse-duke',
    'Therapeutic shoeing follow-up.',
    '#8B6B4A',
  ],
  [
    'Willow worming',
    'worming',
    26,
    time(8, 15),
    'horse-willow',
    'Routine schedule dose.',
    '#D8B25A',
  ],
  [
    'Atlas owner training review',
    'owner_visit',
    28,
    time(16, 30),
    'horse-atlas',
    'Video review with owner.',
    '#C88E59',
  ],
  [
    'Aurora stretch class',
    'training',
    30,
    time(9, 45),
    'horse-aurora',
    'In-hand mobility work.',
    '#5B8A72',
  ],
  [
    'Comet passport check',
    'event',
    33,
    time(13),
    'horse-comet',
    'Document review and insurance update.',
    '#688F91',
  ],
  [
    'Sage dental appointment',
    'vet',
    37,
    time(10),
    'horse-sage',
    'Sedated dental float booked.',
    '#3A6B52',
  ],
  [
    'Yard open evening',
    'event',
    40,
    time(18, 30),
    '',
    'Owner social and stable briefing.',
    '#688F91',
  ],
  [
    'Winter blanket fitting',
    'event',
    44,
    time(15),
    '',
    'Sizing and labelling blankets.',
    '#688F91',
  ],
].map(([title, type, offset, eventTime, horseId, notes, color], index) => ({
  id: `event-${index + 1}`,
  title,
  type,
  date: addDays(offset),
  time: eventTime,
  horseId,
  notes,
  color,
}))

const tasks = [
  [
    'Check hay delivery',
    'Yard',
    'high',
    'Emma',
    time(8),
    false,
    0,
    'Confirm moisture level and stack placement.',
  ],
  [
    'Prepare Thunder for farrier',
    'Care',
    'medium',
    'Noah',
    time(12, 45),
    false,
    0,
    'Brush legs and set out pads.',
  ],
  [
    'Update insurance documents',
    'Admin',
    'low',
    'Maja',
    time(10),
    false,
    0,
    'Review expiring policies for Bella and Comet.',
  ],
  [
    'Call vet about Duke',
    'Medical',
    'high',
    'Sofia',
    time(9, 30),
    false,
    0,
    'Confirm rehab exercise plan.',
  ],
  ['Clean tack room', 'Yard', 'medium', 'Leo', time(15), false, 0, 'Reorganise labelled shelves.'],
  [
    'Invoice reminders',
    'Admin',
    'high',
    'Maja',
    time(11, 15),
    false,
    0,
    'Send reminders for overdue rent.',
  ],
  ['Fill water troughs', 'Yard', 'medium', 'Emma', time(7, 30), true, 0, 'Done on first round.'],
  [
    'Order supplements',
    'Medical',
    'low',
    'Sofia',
    time(13, 30),
    false,
    1,
    'Joint support and probiotics stock.',
  ],
  ['Clip bridle path for Luna', 'Care', 'low', 'Noah', time(16), false, 1, 'Before owner lesson.'],
  [
    'Check turnout fencing',
    'Yard',
    'medium',
    'Leo',
    time(14),
    false,
    2,
    'Storm expected tomorrow.',
  ],
  [
    'Prepare monthly report',
    'Admin',
    'medium',
    'Maja',
    time(17),
    false,
    2,
    'Occupancy and income summary.',
  ],
  ['Schedule flu boosters', 'Medical', 'high', 'Sofia', time(9), false, 3, 'Thunder, Atlas, Sage.'],
  [
    'Deep clean stall 19',
    'Yard',
    'medium',
    'Emma',
    time(10, 30),
    false,
    3,
    'Ready for maintenance inspection.',
  ],
  [
    'Review lesson timetable',
    'Admin',
    'low',
    'Maja',
    time(12),
    false,
    4,
    'Update owner visit slots.',
  ],
  [
    'Polish trophies in lounge',
    'Yard',
    'low',
    'Leo',
    time(15, 30),
    false,
    5,
    'Prepare for yard open evening.',
  ],
].map(([title, type, priority, assignedTo, dueTime, completed, offset, notes], index) => ({
  id: `task-${index + 1}`,
  title,
  type,
  priority,
  assignedTo,
  dueTime,
  completed,
  date: addDays(offset),
  notes,
}))

const feedingPlans = horseSeeds.map((horse, index) => ({
  id: `feeding-${horse.id}`,
  horseId: horse.id,
  morning: {
    hay: `${6 + (index % 2)} kg`,
    grain: `${1 + (index % 3) * 0.5} kg`,
    supplements: index % 2 === 0 ? 'Electrolytes, mineral mix' : 'Joint support, mineral mix',
  },
  lunch: {
    hay: `${2 + (index % 2)} kg`,
    grain: `${index % 3 === 0 ? 0.5 : 0} kg`,
    supplements: 'Salt lick access',
  },
  evening: {
    hay: `${7 + (index % 3)} kg`,
    grain: `${1 + (index % 2) * 0.5} kg`,
    supplements: index % 4 === 0 ? 'Mash, probiotic' : 'Linseed oil',
  },
  specialInstructions: horse.feedingInstructions,
}))

const medicalRecords = horseSeeds.flatMap((horse, index) => [
  {
    id: `medical-${horse.id}-1`,
    horseId: horse.id,
    type: 'vaccination',
    date: addMonths(-(index % 6) - 1, 12),
    notes: `${horse.name} received influenza/tetanus booster.`,
    nextDueDate: addMonths((index % 3) + 1, 12),
    vet: 'North Meadow Equine Clinic',
  },
  {
    id: `medical-${horse.id}-2`,
    horseId: horse.id,
    type: index % 3 === 0 ? 'farrier' : index % 3 === 1 ? 'worming' : 'dental',
    date: addMonths(-(index % 4), 20),
    notes:
      index % 3 === 0
        ? 'Balanced trim and reset shoes.'
        : index % 3 === 1
          ? 'Routine worming administration.'
          : 'Dental float with mild sedation.',
    nextDueDate: addMonths((index % 2) + 2, 18),
    vet: index % 3 === 0 ? 'Farrier Lars Holm' : 'North Meadow Equine Clinic',
  },
])

const settingsSeed = {
  stableName: 'Nestun Stable',
  managerName: 'Gro Anita Bråthen',
  phone: '984 83 540',
  email: 'gro.anita.brathen@gmail.com',
  address: 'Vålaugsvegen 57, 2032 Maura, Norway',
  currency: 'EUR',
  compactMode: false,
  defaultCalendarView: 'month',
}

const seedData = {
  horses: horseSeeds,
  owners: ownerSeeds,
  stalls: stallSeeds,
  contracts: contractSeeds,
  payments: generatePayments(),
  calendarEvents,
  tasks,
  feedingPlans,
  medicalRecords,
  settings: settingsSeed,
}

// Fire-and-forget helper: local storage is updated synchronously (so the UI
// never blocks), while every mutation is also pushed to Supabase in the
// background. Failures are surfaced as a toast rather than thrown, since the
// local write has already succeeded and views don't await these calls.
function syncToSupabase(promise) {
  Promise.resolve(promise).catch((error) => {
    console.error('Supabase sync failed:', error)
    notify(`Sync error: ${error.message || 'Failed to save to server.'}`, 'error')
  })
}

export async function initData() {
  await pullAllFromSupabase()
}

export const getAll = (entity) => storage.get(STORAGE_KEYS[entity]) || []
export const getRecord = (entity, id) => storage.getById(STORAGE_KEYS[entity], id)
const saveAll = (entity, records) => storage.set(STORAGE_KEYS[entity], records)

function syncHorseStall(horse, previous = null) {
  const stalls = getAll('stalls').map((stall) => {
    if (
      (stall.horseId === horse.id || stall.id === previous?.stallId) &&
      stall.id !== horse.stallId
    )
      return { ...stall, horseId: '', status: 'available' }
    if (stall.id === horse.stallId) return { ...stall, horseId: horse.id, status: 'occupied' }
    return stall
  })
  saveAll('stalls', stalls)
}

function syncContract(contract) {
  const horse = getRecord('horses', contract.horseId)
  if (horse)
    updateRecord(
      'horses',
      horse.id,
      { ownerId: contract.ownerId, stallId: contract.stallId },
      { silent: true },
    )
}

export function createRecord(entity, data) {
  const record = { ...data, id: data.id || generateId() }
  saveAll(entity, [...getAll(entity), record])
  if (entity === 'horses') syncHorseStall(record)
  if (entity === 'contracts') syncContract(record)
  syncToSupabase(pushCreate(entity, record))
  return record
}

export function updateRecord(entity, id, data, options = {}) {
  const records = getAll(entity)
  const index = records.findIndex((item) => item.id === id)
  if (index === -1) return null
  const previous = records[index]
  const record = { ...previous, ...data, id }
  records[index] = record
  saveAll(entity, records)
  if (!options.silent && entity === 'horses') syncHorseStall(record, previous)
  if (!options.silent && entity === 'contracts') syncContract(record)
  syncToSupabase(pushUpdate(entity, id, record))
  return record
}

export function deleteHorseCascade(id) {
  const horse = getRecord('horses', id)
  if (!horse) return false
  saveAll(
    'horses',
    getAll('horses').filter((item) => item.id !== id),
  )
  saveAll(
    'feedingPlans',
    getAll('feedingPlans').filter((item) => item.horseId !== id),
  )
  saveAll(
    'medicalRecords',
    getAll('medicalRecords').filter((item) => item.horseId !== id),
  )
  saveAll(
    'calendarEvents',
    getAll('calendarEvents').filter((item) => item.horseId !== id),
  )
  saveAll(
    'payments',
    getAll('payments').filter((item) => item.horseId !== id),
  )
  saveAll(
    'contracts',
    getAll('contracts').filter((item) => item.horseId !== id),
  )
  saveAll(
    'stalls',
    getAll('stalls').map((stall) =>
      stall.id === horse.stallId ? { ...stall, horseId: '', status: 'available' } : stall,
    ),
  )
  // Deleting the horse remotely cascades to its feeding plan, medical
  // records, calendar events, contracts (and their payments) automatically.
  syncToSupabase(pushDelete('horses', id))
  return true
}

export function deleteOwnerCascade(id) {
  getAll('horses')
    .filter((horse) => horse.ownerId === id)
    .forEach((horse) => deleteHorseCascade(horse.id))
  saveAll(
    'owners',
    getAll('owners').filter((item) => item.id !== id),
  )
  saveAll(
    'payments',
    getAll('payments').filter((item) => item.ownerId !== id),
  )
  saveAll(
    'contracts',
    getAll('contracts').filter((item) => item.ownerId !== id),
  )
  syncToSupabase(pushDelete('owners', id))
  return true
}

export function deleteContractCascade(id) {
  const contract = getRecord('contracts', id)
  saveAll(
    'contracts',
    getAll('contracts').filter((item) => item.id !== id),
  )
  saveAll(
    'payments',
    getAll('payments').filter((item) => item.contractId !== id),
  )
  if (contract?.stallId)
    saveAll(
      'stalls',
      getAll('stalls').map((stall) =>
        stall.id === contract.stallId && stall.horseId === contract.horseId
          ? { ...stall, horseId: '', status: 'available' }
          : stall,
      ),
    )
  // Deleting the contract remotely cascades to its payments automatically.
  syncToSupabase(pushDelete('contracts', id))
  return true
}

export function deleteRecord(entity, id) {
  if (entity === 'horses') return deleteHorseCascade(id)
  if (entity === 'owners') return deleteOwnerCascade(id)
  if (entity === 'contracts') return deleteContractCascade(id)
  saveAll(
    entity,
    getAll(entity).filter((item) => item.id !== id),
  )
  syncToSupabase(pushDelete(entity, id))
  return true
}

export function getSettings() {
  const settings = storage.get(STORAGE_KEYS.settings) || settingsSeed
  setCurrency(settings.currency)
  return settings
}
export function upsertSettings(data) {
  const next = { ...getSettings(), ...data }
  storage.set(STORAGE_KEYS.settings, next)
  setCurrency(next.currency)
  syncToSupabase(pushSettingsUpdate(next))
  return next
}
export const exportData = () =>
  Object.fromEntries(
    Object.keys(STORAGE_KEYS).map((entity) => [
      entity,
      entity === 'settings' ? getSettings() : getAll(entity),
    ]),
  )
export const importData = (payload) =>
  Object.entries(STORAGE_KEYS).forEach(([entity, key]) => {
    if (payload[entity] !== undefined) storage.set(key, payload[entity])
  })
export async function resetData() {
  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key))
  await initData()
}

export function buildNotifications({
  horses = getAll('horses'),
  contracts = getAll('contracts'),
  payments = getAll('payments'),
  calendarEvents: events = getAll('calendarEvents'),
} = {}) {
  const notices = []
  payments
    .filter((payment) => payment.status === 'overdue')
    .slice(0, 4)
    .forEach((payment) =>
      notices.push({
        id: `payment-${payment.id}`,
        type: 'warning',
        title: 'Overdue payment',
        message: `${getRecord('horses', payment.horseId)?.name || 'Unknown horse'} invoice ${payment.invoiceNumber} is overdue.`,
        date: payment.dueDate,
      }),
    )
  horses
    .filter((horse) => horse.vaccinationStatus !== 'Up to date')
    .slice(0, 3)
    .forEach((horse) =>
      notices.push({
        id: `vaccination-${horse.id}`,
        type: 'info',
        title: 'Vaccination follow-up',
        message: `${horse.name} has vaccination status: ${horse.vaccinationStatus}.`,
        date: horse.arrivalDate,
      }),
    )
  events
    .filter((event) => ['farrier', 'vet'].includes(event.type))
    .slice(0, 4)
    .forEach((event) =>
      notices.push({
        id: `event-${event.id}`,
        type: event.type === 'farrier' ? 'info' : 'success',
        title: `${event.type === 'farrier' ? 'Farrier' : 'Vet'} due`,
        message: `${event.title} on ${event.date} at ${event.time}.`,
        date: event.date,
      }),
    )
  contracts
    .filter((contract) => {
      const diff = (new Date(contract.endDate) - new Date()) / 86400000
      return diff >= 0 && diff <= 45
    })
    .forEach((contract) =>
      notices.push({
        id: `contract-${contract.id}`,
        type: 'warning',
        title: 'Contract ending soon',
        message: `${getRecord('horses', contract.horseId)?.name || 'Contract'} ends on ${contract.endDate}.`,
        date: contract.endDate,
      }),
    )
  return notices.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10)
}

export function getDashboardMetrics() {
  const horses = getAll('horses')
  const stalls = getAll('stalls')
  const payments = getAll('payments')
  const tasks = getAll('tasks')
  const events = getAll('calendarEvents')
  const monthKey = today.toISOString().slice(0, 7)
  return {
    totalHorses: horses.length,
    occupiedStalls: stalls.filter((stall) => stall.status === 'occupied').length,
    availableStalls: stalls.filter((stall) => stall.status === 'available').length,
    monthlyRevenue: payments
      .filter((payment) => payment.status === 'paid' && payment.paidDate?.startsWith(monthKey))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    duePayments: payments.filter((payment) => payment.status === 'due').length,
    tasksToday: tasks.filter((task) => task.date === addDays(0) && !task.completed).length,
    upcomingFarrierVisits: events.filter(
      (event) => event.type === 'farrier' && new Date(event.date) >= new Date(),
    ).length,
    upcomingVetVisits: events.filter(
      (event) => event.type === 'vet' && new Date(event.date) >= new Date(),
    ).length,
    notifications: buildNotifications({
      horses,
      payments,
      calendarEvents: events,
      contracts: getAll('contracts'),
    }),
  }
}

export function getHorseBundle(id) {
  const horse = getRecord('horses', id)
  if (!horse) return null
  return {
    horse,
    owner: getRecord('owners', horse.ownerId),
    stall: getRecord('stalls', horse.stallId),
    feedingPlan: getAll('feedingPlans').find((plan) => plan.horseId === id) || null,
    medicalRecords: getAll('medicalRecords')
      .filter((record) => record.horseId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    contracts: getAll('contracts').filter((contract) => contract.horseId === id),
    events: getAll('calendarEvents')
      .filter((event) => event.horseId === id)
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
  }
}

export function getOwnerBundle(id) {
  return {
    owner: getRecord('owners', id),
    horses: getAll('horses').filter((horse) => horse.ownerId === id),
    contracts: getAll('contracts').filter((contract) => contract.ownerId === id),
    payments: getAll('payments')
      .filter((payment) => payment.ownerId === id)
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)),
  }
}
