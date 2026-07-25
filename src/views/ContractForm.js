import { notify } from '../components/Notification.js'
import { createRecord, getAll, getRecord, updateRecord } from '../services/dataService.js'
import { currentBillingCycleDays, formatCurrency } from '../utils/helpers.js'
import { t } from '../i18n/index.js'
import { navigate } from '../router/index.js'

const CYCLE_DAYS = currentBillingCycleDays()

const INCLUDED_SERVICE_OPTIONS = [
  { value: 'full', labelKey: 'contractForm.serviceFull' },
  { value: 'weekFull', labelKey: 'contractForm.serviceWeekFull' },
  { value: 'normal', labelKey: 'contractForm.serviceNormal' },
]

export function render(container, params = {}) {
  const editing = Boolean(params.id)
  const contract = editing ? getRecord('contracts', params.id) : null
  const horses = getAll('horses'),
    owners = getAll('owners'),
    stalls = getAll('stalls'),
    priceListItems = getAll('priceListItems')
  const hayItems = priceListItems.filter((item) => item.category === 'Hay')
  const beddingItems = priceListItems.filter((item) => item.category === 'Bedding')

  const priceItemSelect = ({ name, items, selectedId, placeholderKey, emptyMessageKey }) =>
    items.length
      ? `<select class="field" name="${name}">
          <option value="">${t(placeholderKey)}</option>
          ${items.map((item) => `<option value="${item.id}" ${selectedId === item.id ? 'selected' : ''}>${item.item}${item.unit ? ` (${item.unit})` : ''}</option>`).join('')}
        </select>`
      : `<p class="field flex items-center text-sm text-slate-400">${t(emptyMessageKey)}</p>`

  container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${editing ? t('contractForm.editTitle') : t('contractForm.addTitle')}</h1><p class="mt-2 text-sm text-slate-500">${t('contractForm.subtitle')}</p></div></div><form id="contract-form" class="panel p-6"><div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"><label><span class="field-label">${t('contractForm.horse')}</span><select class="field" name="horseId" required><option value="">${t('contractForm.selectHorse')}</option>${horses.map((horse) => `<option value="${horse.id}" ${contract?.horseId === horse.id ? 'selected' : ''}>${horse.name}</option>`).join('')}</select></label><label><span class="field-label">${t('contractForm.owner')}</span><select class="field" name="ownerId" required><option value="">${t('contractForm.selectOwner')}</option>${owners.map((owner) => `<option value="${owner.id}" ${contract?.ownerId === owner.id ? 'selected' : ''}>${owner.name}</option>`).join('')}</select></label><label><span class="field-label">${t('contractForm.stall')}</span><select class="field" name="stallId" required><option value="">${t('contractForm.selectStall')}</option>${stalls.map((stall) => `<option value="${stall.id}" ${contract?.stallId === stall.id ? 'selected' : ''}>${t('contractForm.stallOption', { number: stall.number })}</option>`).join('')}</select></label><label><span class="field-label">${t('contractForm.monthlyRent')}</span><input class="field" name="monthlyRent" type="number" step="0.01" min="0" value="${contract?.monthlyRent ?? ''}" data-rent-input required /></label><label><span class="field-label">${t('contractForm.deposit')}</span><input class="field" name="deposit" type="number" step="0.01" min="0" value="${contract?.deposit ?? ''}" required /></label><label><span class="field-label">${t('contractForm.startDate')}</span><input class="field" name="startDate" type="date" value="${contract?.startDate || ''}" required /></label><label><span class="field-label">${t('contractForm.endDate')}</span><input class="field" name="endDate" type="date" value="${contract?.endDate || ''}" /></label><label><span class="field-label">${t('contractForm.status')}</span><select class="field" name="status" required>${['active', 'expired', 'cancelled'].map((value) => `<option value="${value}" ${contract?.status === value ? 'selected' : ''}>${t(`status.${value}`)}</option>`).join('')}</select></label><div><span class="field-label">${t('contractForm.hayItem')}</span>${priceItemSelect({ name: 'hayPriceListItemId', items: hayItems, selectedId: contract?.hayPriceListItemId, placeholderKey: 'contractForm.selectHayItem', emptyMessageKey: 'contractForm.noHayItems' })}<span class="mt-1 block text-xs text-slate-400" data-hay-preview></span></div><label><span class="field-label">${t('contractForm.hayQuantity')}</span><input class="field" name="includedHayKg" type="number" step="0.01" min="0" value="${contract?.includedHayKg ?? ''}" data-hay-qty-input /></label><div><span class="field-label">${t('contractForm.beddingItem')}</span>${priceItemSelect({ name: 'beddingPriceListItemId', items: beddingItems, selectedId: contract?.beddingPriceListItemId, placeholderKey: 'contractForm.selectBeddingItem', emptyMessageKey: 'contractForm.noBeddingItems' })}<span class="mt-1 block text-xs text-slate-400" data-bedding-preview></span></div><label><span class="field-label">${t('contractForm.beddingQuantity')}</span><input class="field" name="beddingQuantity" type="number" step="0.01" min="0" value="${contract?.beddingQuantity ?? ''}" data-bedding-qty-input /></label><div class="md:col-span-2 xl:col-span-3"><span class="field-label">${t('contractForm.includedServices')}</span><div class="mt-2 flex flex-col gap-2" data-included-services>${INCLUDED_SERVICE_OPTIONS.map(
    (option) =>
      `<label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" class="h-4 w-4 rounded border-slate-300" data-included-service value="${option.value}" ${contract?.includedServices === option.value ? 'checked' : ''} />${t(option.labelKey)}</label>`,
  ).join(
    '',
  )}</div><p class="mt-1 text-xs text-rose-500 hidden" data-included-services-error>${t('contractForm.includedServicesError')}</p></div><label class="md:col-span-2 xl:col-span-3"><span class="field-label">${t('contractForm.additionalServices')}</span><textarea class="field min-h-24" name="additionalServices">${contract?.additionalServices || ''}</textarea></label><div class="md:col-span-2 xl:col-span-3 rounded-2xl bg-slate-50 p-4"><h3 class="text-sm font-semibold text-slate-800">${t('contractForm.summaryTitle')}</h3><div class="mt-2 space-y-1 text-sm text-slate-600" data-summary-lines></div></div></div><div class="mt-6 flex justify-end gap-3"><button type="button" class="btn-ghost" data-cancel>${t('contractForm.cancel')}</button><button type="submit" class="btn-primary">${editing ? t('contractForm.saveChanges') : t('contractForm.createContract')}</button></div></form></div>`
  container.querySelector('[data-cancel]').addEventListener('click', () => navigate('/contracts'))

  const rentInput = container.querySelector('[data-rent-input]')
  const haySelect = container.querySelector('[name="hayPriceListItemId"]')
  const hayQtyInput = container.querySelector('[data-hay-qty-input]')
  const hayPreview = container.querySelector('[data-hay-preview]')
  const beddingSelect = container.querySelector('[name="beddingPriceListItemId"]')
  const beddingQtyInput = container.querySelector('[data-bedding-qty-input]')
  const beddingPreview = container.querySelector('[data-bedding-preview]')
  const summaryLines = container.querySelector('[data-summary-lines]')

  const hayValueIncVat = () => {
    const item = haySelect && getRecord('priceListItems', haySelect.value)
    const kgPerDay = Number(hayQtyInput.value) || 0
    return Math.round((item?.price || 0) * kgPerDay * CYCLE_DAYS * 1.25 * 100) / 100
  }
  const beddingAmountIncVat = () => {
    const item = beddingSelect && getRecord('priceListItems', beddingSelect.value)
    const qty = Number(beddingQtyInput.value) || 0
    return Math.round((item?.price || 0) * qty * 1.25 * 100) / 100
  }

  const updatePreviews = () => {
    const hayValue = hayValueIncVat()
    hayPreview.textContent = hayValue
      ? t('contractForm.hayIncVat', { amount: formatCurrency(hayValue), days: CYCLE_DAYS })
      : ''
    const beddingAmount = beddingAmountIncVat()
    beddingPreview.textContent = beddingAmount
      ? t('contractForm.beddingIncVat', { amount: formatCurrency(beddingAmount) })
      : ''

    const rent = Number(rentInput.value) || 0
    const total = Math.round((rent + hayValue + beddingAmount) * 100) / 100
    const lines = [
      `<div class="flex justify-between"><span>${t('contractForm.summaryRent')}</span><span>${formatCurrency(rent)}</span></div>`,
    ]
    if (hayValue)
      lines.push(
        `<div class="flex justify-between"><span>${t('contractForm.summaryHay', { kg: Number(hayQtyInput.value) || 0, days: CYCLE_DAYS })}</span><span>${formatCurrency(hayValue)}</span></div>`,
      )
    if (beddingAmount)
      lines.push(
        `<div class="flex justify-between"><span>${t('contractForm.summaryBedding', { qty: Number(beddingQtyInput.value) || 0 })}</span><span>${formatCurrency(beddingAmount)}</span></div>`,
      )
    lines.push(
      `<div class="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900"><span>${t('contractForm.summaryTotal')}</span><span>${formatCurrency(total)}</span></div>`,
    )
    summaryLines.innerHTML = lines.join('')
  }
  ;[rentInput, hayQtyInput, beddingQtyInput].forEach((input) =>
    input.addEventListener('input', updatePreviews),
  )
  ;[haySelect, beddingSelect].forEach((select) =>
    select?.addEventListener('change', updatePreviews),
  )
  updatePreviews()

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
    payload.includedHayKg = payload.includedHayKg === '' ? '' : Number(payload.includedHayKg)
    payload.beddingQuantity = Number(payload.beddingQuantity) || 0
    if (editing) {
      updateRecord('contracts', contract.id, payload)
      notify(t('contractForm.updatedToast'), 'success')
    } else {
      createRecord('contracts', payload)
      notify(t('contractForm.createdToast'), 'success')
    }
    navigate('/contracts')
  })
}
