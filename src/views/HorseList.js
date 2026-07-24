import { EmptyState } from '../components/EmptyState.js'
import { Pagination } from '../components/Pagination.js'
import { getAll, getRecord } from '../services/dataService.js'
import { capitalize, horseAvatarHtml } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'
import { navigate } from '../router/index.js'

const SERVICE_LABEL_KEYS = {
  full: 'horseList.serviceFull',
  weekFull: 'horseList.serviceWeekFull',
  normal: 'horseList.serviceNormal',
}

// Falls back to a capitalized raw value when a status/breed word has no
// translation entry, matching how the Badge component handles the same case.
const statusText = (value) => {
  const key = `status.${String(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')}`
  const translated = t(key)
  return translated === key ? capitalize(value) : translated
}

const getServiceLabel = (horse) => {
  const contract = getAll('contracts').find(
    (item) => item.horseId === horse.id && item.status === 'active',
  )
  if (!contract) return null
  const key = SERVICE_LABEL_KEYS[contract.includedServices]
  return key ? t(key) : contract.includedServices
}

const renderCard = (horse) => {
  const serviceLabel = getServiceLabel(horse)
  return `<button class="panel flex flex-col gap-4 p-5 text-left hover:-translate-y-0.5" data-horse-open="${horse.id}"><div class="flex items-start justify-between gap-4">${horseAvatarHtml(horse, 'h-14 w-14 rounded-2xl text-2xl')}<div class="flex flex-wrap justify-end gap-2"><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">${statusText(horse.status)}</span>${serviceLabel ? `<span class="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest">${serviceLabel}</span>` : ''}</div></div><div><h3 class="text-xl font-semibold text-slate-900">${horse.name}</h3><p class="mt-1 text-sm text-slate-500">${horse.breed} · ${horse.age} ${t('horseList.yearsAbbrev')} · ${horse.gender}</p></div><div class="grid grid-cols-2 gap-3 text-sm text-slate-500"><div><span class="block text-xs uppercase tracking-wide text-slate-400">${t('horseList.stall')}</span>${getRecord('stalls', horse.stallId)?.number || '—'}</div><div><span class="block text-xs uppercase tracking-wide text-slate-400">${t('horseList.owner')}</span>${getRecord('owners', horse.ownerId)?.name || '—'}</div></div></button>`
}
const renderRow = (horse) => {
  const serviceLabel = getServiceLabel(horse)
  return `<button class="panel flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50" data-horse-open="${horse.id}"><div class="flex items-center gap-4">${horseAvatarHtml(horse, 'h-12 w-12 rounded-2xl text-lg')}<div><p class="font-medium text-slate-900">${horse.name}</p><p class="text-sm text-slate-500">${horse.breed} · ${horse.color}</p></div></div><div class="hidden text-sm text-slate-500 md:block">${getRecord('owners', horse.ownerId)?.name || '—'}</div><div class="hidden text-sm text-slate-500 md:block">${t('horseList.stall')} ${getRecord('stalls', horse.stallId)?.number || '—'}</div><div class="flex flex-wrap items-center gap-2"><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">${statusText(horse.status)}</span>${serviceLabel ? `<span class="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest">${serviceLabel}</span>` : ''}</div></button>`
}

export function render(container) {
  const horses = getAll('horses')
  let search = '',
    breed = 'all',
    status = 'all',
    viewMode = 'grid',
    page = 1
  const pageSize = 6
  const breeds = [...new Set(horses.map((horse) => horse.breed))].sort()
  const statuses = [...new Set(horses.map((horse) => horse.status))].sort()

  const draw = () => {
    const filtered = horses.filter(
      (horse) =>
        [horse.name, horse.breed, horse.color, horse.passportNumber].some((value) =>
          String(value).toLowerCase().includes(search.toLowerCase()),
        ) &&
        (breed === 'all' || horse.breed === breed) &&
        (status === 'all' || horse.status === status),
    )
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    if (page > totalPages) page = totalPages
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
    container.innerHTML = `
      <div class="page-shell">
        <div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${t('horseList.title')}</h1><p class="mt-2 text-sm text-slate-500">${t('horseList.subtitle')}</p></div><button class="btn-primary" data-add-horse>${icon('plus', 'h-4 w-4')}${t('horseList.addHorse')}</button></div>
        <div class="panel p-4"><div class="grid gap-3 lg:grid-cols-[2fr,1fr,1fr,auto]"><input class="field" type="search" placeholder="${t('horseList.searchPlaceholder')}" value="${search}" data-filter-search /><select class="field" data-filter-breed><option value="all">${t('horseList.allBreeds')}</option>${breeds.map((item) => `<option value="${item}" ${breed === item ? 'selected' : ''}>${item}</option>`).join('')}</select><select class="field" data-filter-status><option value="all">${t('horseList.allStatuses')}</option>${statuses.map((item) => `<option value="${item}" ${status === item ? 'selected' : ''}>${statusText(item)}</option>`).join('')}</select><div class="flex rounded-2xl border border-slate-200 bg-white p-1"><button class="${viewMode === 'grid' ? 'bg-forest text-white' : 'text-slate-500'} rounded-xl px-4 py-2 text-sm font-medium" data-view="grid">${t('horseList.grid')}</button><button class="${viewMode === 'list' ? 'bg-forest text-white' : 'text-slate-500'} rounded-xl px-4 py-2 text-sm font-medium" data-view="list">${t('horseList.list')}</button></div></div></div>
        ${visible.length ? `<div class="${viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}">${visible.map((horse) => (viewMode === 'grid' ? renderCard(horse) : renderRow(horse))).join('')}</div>` : EmptyState({ icon: '🐎', title: t('horseList.noHorsesTitle'), message: t('horseList.noHorsesMessage') })}
        ${Pagination({ page, totalPages })}
      </div>`
    container
      .querySelector('[data-add-horse]')
      .addEventListener('click', () => navigate('/horses/new'))
    container.querySelector('[data-filter-search]').addEventListener('input', (event) => {
      search = event.target.value
      page = 1
      draw()
    })
    container.querySelector('[data-filter-breed]').addEventListener('change', (event) => {
      breed = event.target.value
      page = 1
      draw()
    })
    container.querySelector('[data-filter-status]').addEventListener('change', (event) => {
      status = event.target.value
      page = 1
      draw()
    })
    container.querySelectorAll('[data-view]').forEach((button) =>
      button.addEventListener('click', () => {
        viewMode = button.getAttribute('data-view')
        draw()
      }),
    )
    container
      .querySelectorAll('[data-horse-open]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          navigate(`/horses/${button.getAttribute('data-horse-open')}`),
        ),
      )
    container.querySelectorAll('[data-page-nav]').forEach((button) =>
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-page-nav')
        if (action === 'prev') page = Math.max(1, page - 1)
        else if (action === 'next') page += 1
        else page = Number(action)
        draw()
      }),
    )
  }
  draw()
}
