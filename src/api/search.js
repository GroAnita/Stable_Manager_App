import { getAll, getRecord } from '../services/dataService.js'

const match = (text, query) =>
  String(text || '')
    .toLowerCase()
    .includes(query)

export function searchAll(term) {
  const query = term.trim().toLowerCase()
  if (!query) return []

  const horses = getAll('horses')
    .filter((horse) =>
      [horse.name, horse.breed, horse.passportNumber, horse.microchipNumber].some((value) =>
        match(value, query),
      ),
    )
    .map((horse) => ({
      id: `horse-${horse.id}`,
      type: 'Horse',
      title: horse.name,
      subtitle: `${horse.breed} · Stall ${getRecord('stalls', horse.stallId)?.number || '—'}`,
      route: `/horses/${horse.id}`,
    }))

  const owners = getAll('owners')
    .filter((owner) => [owner.name, owner.email, owner.phone].some((value) => match(value, query)))
    .map((owner) => ({
      id: `owner-${owner.id}`,
      type: 'Owner',
      title: owner.name,
      subtitle: owner.email,
      route: `/owners/${owner.id}`,
    }))

  const stalls = getAll('stalls')
    .filter((stall) =>
      [stall.number, stall.status, stall.notes].some((value) => match(value, query)),
    )
    .map((stall) => ({
      id: `stall-${stall.id}`,
      type: 'Stall',
      title: `Stall ${stall.number}`,
      subtitle: `${stall.size} · ${stall.status}`,
      route: '/stalls',
    }))

  const contracts = getAll('contracts')
    .filter((contract) =>
      [contract.status, contract.includedServices, contract.additionalServices].some((value) =>
        match(value, query),
      ),
    )
    .map((contract) => ({
      id: `contract-${contract.id}`,
      type: 'Contract',
      title: getRecord('horses', contract.horseId)?.name || 'Contract',
      subtitle: `${contract.status} · Stall ${getRecord('stalls', contract.stallId)?.number || '—'}`,
      route: '/contracts',
    }))

  return [...horses, ...owners, ...stalls, ...contracts].slice(0, 10)
}
