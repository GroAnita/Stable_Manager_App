import { getAll, getRecord } from '../services/dataService.js'
import { formatCurrency } from '../utils/helpers.js'
import { t } from '../i18n/index.js'

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
      type: t('search.horse'),
      title: horse.name,
      subtitle: `${horse.breed} · ${t('horseList.stall')} ${getRecord('stalls', horse.stallId)?.number || '—'}`,
      route: `/horses/${horse.id}`,
    }))

  const owners = getAll('owners')
    .filter((owner) => [owner.name, owner.email, owner.phone].some((value) => match(value, query)))
    .map((owner) => ({
      id: `owner-${owner.id}`,
      type: t('search.owner'),
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
      type: t('search.stall'),
      title: `${t('horseList.stall')} ${stall.number}`,
      subtitle: `${stall.size} · ${t(`status.${stall.status}`)}`,
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
      type: t('search.contract'),
      title: getRecord('horses', contract.horseId)?.name || t('contractList.contractFallback'),
      subtitle: `${t(`status.${contract.status}`)} · ${t('horseList.stall')} ${getRecord('stalls', contract.stallId)?.number || '—'}`,
      route: '/contracts',
    }))

  const priceListItems = getAll('priceListItems')
    .filter((item) => [item.item, item.unit, item.notes].some((value) => match(value, query)))
    .map((item) => ({
      id: `price-list-${item.id}`,
      type: t('search.priceList'),
      title: item.item,
      subtitle: `${formatCurrency(item.price)}${item.unit ? ` · ${item.unit}` : ''}`,
      route: '/price-list',
    }))

  return [...horses, ...owners, ...stalls, ...contracts, ...priceListItems].slice(0, 10)
}
