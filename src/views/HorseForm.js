import { notify } from '../components/Notification.js'
import { openModal } from '../components/Modal.js'
import { confirmDialog } from '../components/ConfirmDialog.js'
import {
  FEED_CATEGORIES,
  GENERAL_EXTRA_CATEGORIES,
  extrasListHtml,
} from '../components/ExtrasList.js'
import {
  createRecord,
  deleteRecord,
  getAll,
  getRecord,
  updateRecord,
} from '../services/dataService.js'
import { deleteHorsePhoto, uploadHorsePhoto } from '../services/photoService.js'
import {
  currentBillingCycleDueDate,
  daysInBillingCycle,
  escapeHtml,
  formatCurrency,
  formatDate,
  generateId,
  horseAvatarHtml,
} from '../utils/helpers.js'
import { t } from '../i18n/index.js'
import { navigate } from '../router/index.js'

// Stable fees are due the 25th of every month, covering the cycle from the
// 26th of the previous month through the 25th of the given month. An extra
// dated inside that window belongs on the invoice due at the window's end.
const getInvoiceDueDate = (dateStr) => currentBillingCycleDueDate(new Date(dateStr))

// Shared logger for "pick something off the price list beyond what the
// contract covers, bill it to the horse's monthly invoice" flows. Feeding
// extras (hay/grain/supplements) and general extras (vet/farrier/bedding/
// mucking) both use this — they only differ in which price list categories
// they draw from and where their log entries live.
function initExtrasLogger({
  container,
  horse,
  categories,
  listSelector,
  addButtonSelector,
  logLabel,
  emptyCategoryMessage,
  getEntries,
  saveEntries,
}) {
  const bindRemoveButtons = () => {
    container.querySelectorAll(`${listSelector} [data-remove-extra]`).forEach((button) =>
      button.addEventListener('click', async () => {
        const extraId = button.getAttribute('data-remove-extra')
        const entries = getEntries()
        const entry = entries.find((item) => item.id === extraId)
        if (!entry) return
        const payment = entry.paymentId && getRecord('payments', entry.paymentId)
        if (
          !(await confirmDialog({
            title: t('extrasLogger.removeTitle'),
            message: payment
              ? t('extrasLogger.removeMessageWithPayment', {
                  amount: formatCurrency(entry.amount),
                  date: formatDate(payment.dueDate),
                })
              : t('extrasLogger.removeMessagePlain'),
            confirmText: t('extrasLogger.removeConfirm'),
          }))
        )
          return
        if (payment) {
          const remainingAmount = Math.round((payment.amount - entry.amount) * 100) / 100
          if (remainingAmount <= 0) {
            deleteRecord('payments', payment.id)
          } else {
            updateRecord('payments', payment.id, {
              amount: remainingAmount,
              notes: (payment.notes || '')
                .split('\n')
                .filter((line) => line !== entry.invoiceLine)
                .join('\n'),
            })
          }
        }
        saveEntries(entries.filter((item) => item.id !== extraId))
        notify(t('extrasLogger.removedToast'), 'success')
        redraw()
      }),
    )
  }

  const redraw = () => {
    const list = container.querySelector(listSelector)
    if (list) list.innerHTML = extrasListHtml(getEntries())
    bindRemoveButtons()
  }

  const openLogModal = () => {
    const items = getAll('priceListItems').filter((item) => categories.includes(item.category))
    if (!items.length) {
      const emptyModal = openModal({
        title: logLabel,
        body: `<p class="text-sm text-slate-600">${emptyCategoryMessage}</p>`,
        footer: `<button type="button" class="btn-primary" data-go-price-list>${t('common.goToPriceList')}</button>`,
      })
      emptyModal.element.querySelector('[data-go-price-list]').addEventListener('click', () => {
        emptyModal.close()
        navigate('/price-list')
      })
      return
    }
    const grouped = items.reduce((acc, item) => {
      ;(acc[item.category] ||= []).push(item)
      return acc
    }, {})
    const modal = openModal({
      title: logLabel,
      body: `<form class="extra-charge-form grid gap-4"><label><span class="field-label">${t('extrasLogger.item')}</span><select class="field" name="priceListItemId" required>${Object.entries(
        grouped,
      )
        .map(
          ([category, list]) =>
            `<optgroup label="${category}">${list.map((item) => `<option value="${item.id}">${escapeHtml(item.item)} (${formatCurrency(item.price * 1.25)}${item.unit ? ` / ${escapeHtml(item.unit)}` : ''})</option>`).join('')}</optgroup>`,
        )
        .join(
          '',
        )}</select></label><label><span class="field-label">${t('extrasLogger.quantity')}</span><input class="field" name="quantity" type="number" step="0.01" min="0.01" value="1" required /></label><label><span class="field-label">${t('extrasLogger.date')}</span><input class="field" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required /></label><p class="text-sm text-slate-500">${t('extrasLogger.estimatedCharge')} <span class="font-medium text-slate-800" data-extra-cost-preview>${formatCurrency((items[0]?.price || 0) * 1.25)}</span></p><p class="text-xs text-slate-400" data-extra-due-hint></p><button class="btn-primary" type="submit">${t('extrasLogger.submit')}</button></form>`,
    })
    const form = modal.element.querySelector('.extra-charge-form')
    const itemSelect = form.querySelector('[name="priceListItemId"]')
    const qtyInput = form.querySelector('[name="quantity"]')
    const dateInput = form.querySelector('[name="date"]')
    const preview = form.querySelector('[data-extra-cost-preview]')
    const dueHint = form.querySelector('[data-extra-due-hint]')
    const updatePreview = () => {
      const item = getRecord('priceListItems', itemSelect.value)
      preview.textContent = formatCurrency(
        (item?.price || 0) * (Number(qtyInput.value) || 0) * 1.25,
      )
      dueHint.textContent = t('extrasLogger.billedOn', {
        date: formatDate(getInvoiceDueDate(dateInput.value)),
      })
    }
    itemSelect.addEventListener('change', updatePreview)
    qtyInput.addEventListener('input', updatePreview)
    dateInput.addEventListener('change', updatePreview)
    updatePreview()

    form.addEventListener('submit', (event) => {
      event.preventDefault()
      const item = getRecord('priceListItems', itemSelect.value)
      const quantity = Number(qtyInput.value) || 0
      const date = dateInput.value
      // Price list rates are ex-VAT; extras billed to a horse's invoice carry
      // 25% VAT on top, same as the "Price incl. 25% VAT" price list column.
      const amount = Math.round((item.price || 0) * quantity * 1.25 * 100) / 100

      const activeContract = getAll('contracts').find(
        (contract) => contract.horseId === horse.id && contract.status === 'active',
      )
      if (!activeContract) {
        notify(t('extrasLogger.noActiveContract'), 'error')
        return
      }

      const dueDate = getInvoiceDueDate(date)
      const invoiceLine = t('extrasLogger.invoiceLine', {
        item: item.item,
        quantity,
        unit: item.unit ? ` ${item.unit}` : '',
        amount: formatCurrency(amount),
        date: formatDate(date),
      })
      const openInvoice = getAll('payments').find(
        (invoicePayment) =>
          invoicePayment.contractId === activeContract.id &&
          invoicePayment.dueDate === dueDate &&
          invoicePayment.status !== 'paid',
      )

      let payment, message
      if (openInvoice) {
        payment = updateRecord('payments', openInvoice.id, {
          amount: Math.round((openInvoice.amount + amount) * 100) / 100,
          notes: openInvoice.notes ? `${openInvoice.notes}\n${invoiceLine}` : invoiceLine,
        })
        message = t('extrasLogger.addedToInvoice', { item: item.item, date: formatDate(dueDate) })
      } else {
        const alreadyPaidThisCycle = getAll('payments').some(
          (invoicePayment) =>
            invoicePayment.contractId === activeContract.id &&
            invoicePayment.dueDate === dueDate &&
            invoicePayment.status === 'paid',
        )
        const baseRent = alreadyPaidThisCycle ? 0 : activeContract.monthlyRent || 0
        const beddingItem =
          activeContract.beddingPriceListItemId &&
          getRecord('priceListItems', activeContract.beddingPriceListItemId)
        const beddingCharge = alreadyPaidThisCycle
          ? 0
          : Math.round(
              (activeContract.beddingQuantity || 0) * (beddingItem?.price || 0) * 1.25 * 100,
            ) / 100
        const hayItem =
          activeContract.hayPriceListItemId &&
          getRecord('priceListItems', activeContract.hayPriceListItemId)
        const hayCharge = alreadyPaidThisCycle
          ? 0
          : Math.round(
              (activeContract.includedHayKg || 0) *
                daysInBillingCycle(dueDate) *
                (hayItem?.price || 0) *
                1.25 *
                100,
            ) / 100
        // Every invoice due the same date shares the 'INV-YYYYMM' prefix, so
        // a running per-cycle sequence keeps them distinct across contracts
        // instead of colliding on an identical number.
        const sequence =
          getAll('payments').filter((invoicePayment) => invoicePayment.dueDate === dueDate).length +
          1
        const boardLines = []
        if (baseRent)
          boardLines.push(t('extrasLogger.monthlyBoardLine', { amount: formatCurrency(baseRent) }))
        if (hayCharge)
          boardLines.push(t('extrasLogger.monthlyHayLine', { amount: formatCurrency(hayCharge) }))
        if (beddingCharge)
          boardLines.push(
            t('extrasLogger.monthlyBeddingLine', { amount: formatCurrency(beddingCharge) }),
          )
        payment = createRecord('payments', {
          contractId: activeContract.id,
          ownerId: activeContract.ownerId,
          horseId: horse.id,
          amount: Math.round((baseRent + hayCharge + beddingCharge + amount) * 100) / 100,
          dueDate,
          paidDate: '',
          status: 'due',
          invoiceNumber: `INV-${dueDate.slice(0, 7).replace('-', '')}-${String(sequence).padStart(3, '0')}${alreadyPaidThisCycle ? '-EXTRA' : ''}`,
          notes: boardLines.length ? `${boardLines.join('\n')}\n${invoiceLine}` : invoiceLine,
        })
        message = alreadyPaidThisCycle
          ? t('extrasLogger.alreadyPaidExtra', { amount: formatCurrency(amount), item: item.item })
          : t('extrasLogger.createdInvoice', { date: formatDate(dueDate), item: item.item })
      }

      const entry = {
        id: generateId(),
        priceListItemId: item.id,
        item: item.item,
        category: item.category || '',
        unit: item.unit || '',
        price: item.price || 0,
        quantity,
        amount,
        date,
        paymentId: payment.id,
        invoiceLine,
      }
      saveEntries([...getEntries(), entry])

      modal.close()
      notify(message, 'success')
      redraw()
    })
  }

  container.querySelector(addButtonSelector).addEventListener('click', openLogModal)
  bindRemoveButtons()
}

const TAB_KEYS = [
  'overview',
  'medical',
  'feeding',
  'extra',
  'documents',
  'schedule',
  'farrier',
  'notes',
]

const HOOF_SIZES = ['8x0', '7x0', '6x0', '5x0', '4x0', '000', '00', '0', '1', '2', '3', '4', '5']

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
  let medicalRows = medicalRecords
    .filter((record) => record.type !== 'farrier')
    .map((record) => ({ ...record }))
  let farrierRows = medicalRecords
    .filter((record) => record.type === 'farrier')
    .map((record) => ({ ...record }))
  let eventRows = events.map((event) => ({ ...event }))

  const tabLabels = {
    overview: t('horseForm.tabOverview'),
    medical: t('horseForm.tabMedical'),
    feeding: t('horseForm.tabFeeding'),
    extra: t('horseForm.tabExtra'),
    documents: t('horseForm.tabDocuments'),
    schedule: t('horseForm.tabSchedule'),
    farrier: t('horseForm.tabFarrier'),
    notes: t('horseForm.tabNotes'),
  }

  const medicalRowTemplate = (row = {}) => `
    <div class="record-row grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-4" data-row-id="${row.id || ''}">
      <label><span class="field-label">${t('horseForm.recordType')}</span><select class="field" data-field="type"><option value="vaccination" ${row.type === 'vaccination' ? 'selected' : ''}>${t('status.vaccination')}</option><option value="farrier" ${row.type === 'farrier' ? 'selected' : ''}>${t('status.farrier')}</option><option value="worming" ${row.type === 'worming' ? 'selected' : ''}>${t('status.worming')}</option><option value="dental" ${row.type === 'dental' ? 'selected' : ''}>${t('status.dental')}</option><option value="vet" ${row.type === 'vet' ? 'selected' : ''}>${t('status.vet')}</option></select></label>
      <label><span class="field-label">${t('horseForm.recordDate')}</span><input class="field" type="date" data-field="date" value="${row.date || ''}" /></label>
      <label><span class="field-label">${t('horseForm.nextDue')}</span><input class="field" type="date" data-field="nextDueDate" value="${row.nextDueDate || ''}" /></label>
      <label><span class="field-label">${t('horseForm.vetProvider')}</span><input class="field" type="text" data-field="vet" value="${row.vet || ''}" /></label>
      <label class="md:col-span-2 xl:col-span-3"><span class="field-label">${t('horseForm.notes')}</span><textarea class="field min-h-16" data-field="notes">${row.notes || ''}</textarea></label>
      <div class="flex items-end"><button type="button" class="btn-ghost w-full" data-remove-row>${t('horseForm.remove')}</button></div>
    </div>`

  const farrierRowTemplate = (row = {}) => `
    <div class="record-row grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-4" data-row-id="${row.id || ''}">
      <label><span class="field-label">${t('horseForm.recordDate')}</span><input class="field" type="date" data-field="date" value="${row.date || ''}" /></label>
      <label><span class="field-label">${t('horseForm.nextShoeing')}</span><input class="field" type="date" data-field="nextDueDate" value="${row.nextDueDate || ''}" /></label>
      <label><span class="field-label">${t('horseForm.farrierProvider')}</span><input class="field" type="text" data-field="vet" value="${row.vet || ''}" /></label>
      <label class="md:col-span-2 xl:col-span-3"><span class="field-label">${t('horseForm.notes')}</span><textarea class="field min-h-16" data-field="notes">${row.notes || ''}</textarea></label>
      <div class="flex items-end"><button type="button" class="btn-ghost w-full" data-remove-row>${t('horseForm.remove')}</button></div>
    </div>`

  const eventRowTemplate = (row = {}) => `
    <div class="record-row grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-4" data-row-id="${row.id || ''}">
      <label><span class="field-label">${t('horseForm.eventTitle')}</span><input class="field" type="text" data-field="title" value="${row.title || ''}" /></label>
      <label><span class="field-label">${t('horseForm.eventType')}</span><select class="field" data-field="type">${['vet', 'farrier', 'vaccination', 'worming', 'training', 'stable_event', 'arena_booking'].map((value) => `<option value="${value}" ${row.type === value ? 'selected' : ''}>${t(`status.${value.replace(/_/g, '-')}`)}</option>`).join('')}</select></label>
      <label><span class="field-label">${t('horseForm.eventDate')}</span><input class="field" type="date" data-field="date" value="${row.date || ''}" /></label>
      <label><span class="field-label">${t('horseForm.eventTime')}</span><input class="field" type="time" data-field="time" value="${row.time || ''}" /></label>
      <label class="md:col-span-2 xl:col-span-3"><span class="field-label">${t('horseForm.notes')}</span><textarea class="field min-h-16" data-field="notes">${row.notes || ''}</textarea></label>
      <div class="flex items-end"><button type="button" class="btn-ghost w-full" data-remove-row>${t('horseForm.remove')}</button></div>
    </div>`

  container.innerHTML = `
    <div class="page-shell">
      <div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${editing ? t('horseForm.editTitle', { name: horse.name }) : t('horseForm.addTitle')}</h1><p class="mt-2 text-sm text-slate-500">${t('horseForm.subtitle')}</p></div></div>
      <div class="flex flex-wrap gap-2">${TAB_KEYS.map((key) => `<button type="button" class="${key === activeTab ? 'bg-forest text-white' : 'bg-white text-slate-600'} rounded-xl px-4 py-2 text-sm font-medium" data-tab="${key}">${tabLabels[key]}</button>`).join('')}</div>
      <form id="horse-form" class="panel p-6">

        <div class="tab-panel" data-panel="overview">
          <div class="mb-6 flex flex-wrap items-center gap-4">
            <div data-photo-preview>${
              horse
                ? horseAvatarHtml(horse, 'h-20 w-20 rounded-2xl text-2xl')
                : '<div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-forest/10 text-2xl">🐴</div>'
            }</div>
            ${
              editing
                ? `<div class="flex flex-wrap gap-2"><label class="btn-ghost cursor-pointer" for="horse-photo-input">${horse?.photo ? t('horseForm.changePhoto') : t('horseForm.uploadPhoto')}</label><input id="horse-photo-input" type="file" accept="image/*" class="hidden" />${horse?.photo ? `<button type="button" class="btn-ghost" data-remove-photo>${t('horseForm.removePhoto')}</button>` : ''}</div>`
                : `<p class="text-sm text-slate-500">${t('horseForm.saveFirstPhoto')}</p>`
            }
          </div>
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            ${[
              ['name', t('horseForm.name'), 'text', true],
              ['breed', t('horseForm.breed'), 'text', true],
              ['age', t('horseForm.age'), 'number', true],
              ['gender', t('horseForm.gender'), 'text', true],
              ['color', t('horseForm.color'), 'text', true],
              ['birthday', t('horseForm.birthday'), 'date', true],
              ['arrivalDate', t('horseForm.arrivalDate'), 'date', true],
            ]
              .map(
                ([name, label, type, required]) =>
                  `<label><span class="field-label">${label}</span><input class="field" name="${name}" type="${type}" value="${horse?.[name] || ''}" ${required ? 'required' : ''} /></label>`,
              )
              .join('')}
            <label><span class="field-label">${t('horseForm.status')}</span><select class="field" name="status" required>${['active', 'monitoring', 'rehab', 'training', 'new'].map((value) => `<option value="${value}" ${horse?.status === value ? 'selected' : ''}>${t(`status.${value}`)}</option>`).join('')}</select></label>
            <label><span class="field-label">${t('horseForm.owner')}</span><select class="field" name="ownerId" required><option value="">${t('horseForm.selectOwner')}</option>${owners.map((owner) => `<option value="${owner.id}" ${horse?.ownerId === owner.id ? 'selected' : ''}>${owner.name}</option>`).join('')}</select></label>
            <label><span class="field-label">${t('horseForm.stall')}</span><select class="field" name="stallId" required><option value="">${t('horseForm.selectStall')}</option>${stalls.map((stall) => `<option value="${stall.id}" ${horse?.stallId === stall.id ? 'selected' : ''}>${t('horseList.stall')} ${stall.number} · ${stall.size}</option>`).join('')}</select></label>
          </div>
        </div>

        <div class="tab-panel hidden" data-panel="medical">
          <div class="grid gap-5 md:grid-cols-2">
            <label><span class="field-label">${t('horseForm.vaccinationStatus')}</span><select class="field" name="vaccinationStatus">${['Up to date', 'Due soon', 'Overdue'].map((value) => `<option value="${value}" ${horse?.vaccinationStatus === value ? 'selected' : ''}>${t(`status.${value.toLowerCase().replace(/\s+/g, '-')}`)}</option>`).join('')}</select></label>
            <label><span class="field-label">${t('horseForm.allergies')}</span><input class="field" name="allergies" type="text" value="${horse?.allergies || ''}" /></label>
            <label class="md:col-span-2"><span class="field-label">${t('horseForm.medicalNotes')}</span><textarea class="field min-h-24" name="medicalNotes">${horse?.medicalNotes || ''}</textarea></label>
          </div>
          <div class="mt-6 flex items-center justify-between"><h3 class="font-semibold text-slate-900">${t('horseForm.medicalRecords')}</h3><button type="button" class="btn-ghost" data-add-medical>${t('horseForm.addRecord')}</button></div>
          <div class="mt-3 space-y-3" data-medical-list>${medicalRows.map(medicalRowTemplate).join('')}</div>
        </div>

        <div class="tab-panel hidden" data-panel="feeding">
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            ${['morning', 'lunch', 'evening']
              .map(
                (period) => `
              <div class="rounded-2xl bg-slate-50 p-4 space-y-3">
                <h3 class="font-semibold text-slate-900">${t(`horseForm.${period}`)}</h3>
                <label><span class="field-label">${t('horseForm.hay')}</span><input class="field" name="${period}Hay" type="text" value="${feedingPlan?.[period]?.hay || ''}" /></label>
                <label><span class="field-label">${t('horseForm.grain')}</span><input class="field" name="${period}Grain" type="text" value="${feedingPlan?.[period]?.grain || ''}" /></label>
                <label><span class="field-label">${t('horseForm.supplements')}</span><input class="field" name="${period}Supplements" type="text" value="${feedingPlan?.[period]?.supplements || ''}" /></label>
              </div>`,
              )
              .join('')}
          </div>
          <label class="mt-5 block"><span class="field-label">${t('horseForm.feedingInstructions')}</span><textarea class="field min-h-24" name="feedingInstructions">${horse?.feedingInstructions || ''}</textarea></label>
          <label class="mt-5 block"><span class="field-label">${t('horseForm.specialFeedingInstructions')}</span><textarea class="field min-h-24" name="specialInstructions">${feedingPlan?.specialInstructions || ''}</textarea></label>

          <div class="mt-8 border-t border-slate-100 pt-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="font-semibold text-slate-900">${t('horseForm.extraFeedTitle')}</h3>
                <p class="mt-1 text-sm text-slate-500">${t('horseForm.extraFeedDescription')}</p>
              </div>
              ${editing ? `<button type="button" class="btn-ghost" data-log-feed-extra>${t('horseForm.logExtra')}</button>` : ''}
            </div>
            ${
              editing
                ? `<div class="mt-3 space-y-2" data-feed-extras-list>${extrasListHtml(feedingPlan?.extras || [])}</div>`
                : `<p class="mt-3 text-sm text-slate-500">${t('horseForm.saveFirstFeed')}</p>`
            }
          </div>
        </div>

        <div class="tab-panel hidden" data-panel="extra">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold text-slate-900">${t('horseForm.extraGeneralTitle')}</h3>
              <p class="mt-1 text-sm text-slate-500">${t('horseForm.extraGeneralDescription')}</p>
            </div>
            ${editing ? `<button type="button" class="btn-ghost" data-log-general-extra>${t('horseForm.logExtra')}</button>` : ''}
          </div>
          ${
            editing
              ? `<div class="mt-3 space-y-2" data-general-extras-list>${extrasListHtml(horse?.extras || [])}</div>`
              : `<p class="mt-3 text-sm text-slate-500">${t('horseForm.saveFirstGeneral')}</p>`
          }
        </div>

        <div class="tab-panel hidden" data-panel="documents">
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            ${[
              ['passportNumber', t('horseForm.passportNumber'), 'text', false],
              ['microchipNumber', t('horseForm.microchipNumber'), 'text', false],
              ['insurance', t('horseForm.insurance'), 'text', false],
            ]
              .map(
                ([name, label, type, required]) =>
                  `<label><span class="field-label">${label}</span><input class="field" name="${name}" type="${type}" value="${horse?.[name] || ''}" ${required ? 'required' : ''} /></label>`,
              )
              .join('')}
          </div>
        </div>

        <div class="tab-panel hidden" data-panel="schedule">
          <div class="flex items-center justify-between"><h3 class="font-semibold text-slate-900">${t('horseForm.calendarEvents')}</h3><button type="button" class="btn-ghost" data-add-event>${t('horseForm.addEvent')}</button></div>
          <div class="mt-3 space-y-3" data-event-list>${eventRows.map(eventRowTemplate).join('')}</div>
        </div>

        <div class="tab-panel hidden" data-panel="farrier">
          <div class="grid gap-5 md:grid-cols-2">
            <label><span class="field-label">${t('horseForm.frontHoofSize')}</span><select class="field" name="frontHoofSize"><option value="">${t('horseForm.selectSize')}</option>${HOOF_SIZES.map((size) => `<option value="${size}" ${horse?.frontHoofSize === size ? 'selected' : ''}>${size}</option>`).join('')}</select></label>
            <label><span class="field-label">${t('horseForm.backHoofSize')}</span><select class="field" name="backHoofSize"><option value="">${t('horseForm.selectSize')}</option>${HOOF_SIZES.map((size) => `<option value="${size}" ${horse?.backHoofSize === size ? 'selected' : ''}>${size}</option>`).join('')}</select></label>
          </div>
          <div class="mt-8 flex items-center justify-between border-t border-slate-100 pt-6"><h3 class="font-semibold text-slate-900">${t('horseForm.farrierRecords')}</h3><button type="button" class="btn-ghost" data-add-farrier>${t('horseForm.addRecord')}</button></div>
          <div class="mt-3 space-y-3" data-farrier-list>${farrierRows.map(farrierRowTemplate).join('')}</div>
        </div>

        <div class="tab-panel hidden" data-panel="notes">
          <label class="block"><span class="field-label">${t('horseForm.generalNotes')}</span><textarea class="field min-h-32" name="notes">${horse?.notes || ''}</textarea></label>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-3"><button type="button" class="btn-ghost" data-cancel>${t('horseForm.cancel')}</button><button type="submit" class="btn-primary">${editing ? t('horseForm.saveChanges') : t('horseForm.createHorse')}</button></div>
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
  const farrierList = container.querySelector('[data-farrier-list]')
  const eventList = container.querySelector('[data-event-list]')

  container
    .querySelector('[data-add-medical]')
    .addEventListener('click', () =>
      medicalList.insertAdjacentHTML('beforeend', medicalRowTemplate()),
    )
  container
    .querySelector('[data-add-farrier]')
    .addEventListener('click', () =>
      farrierList.insertAdjacentHTML('beforeend', farrierRowTemplate()),
    )
  container
    .querySelector('[data-add-event]')
    .addEventListener('click', () => eventList.insertAdjacentHTML('beforeend', eventRowTemplate()))
  container.querySelector('[data-medical-list]').addEventListener('click', (event) => {
    if (event.target.closest('[data-remove-row]')) event.target.closest('.record-row').remove()
  })
  container.querySelector('[data-farrier-list]').addEventListener('click', (event) => {
    if (event.target.closest('[data-remove-row]')) event.target.closest('.record-row').remove()
  })
  container.querySelector('[data-event-list]').addEventListener('click', (event) => {
    if (event.target.closest('[data-remove-row]')) event.target.closest('.record-row').remove()
  })

  if (editing) {
    container.querySelector('#horse-photo-input').addEventListener('change', async (event) => {
      const file = event.target.files[0]
      if (!file) return
      try {
        const url = await uploadHorsePhoto(horse.id, file)
        updateRecord('horses', horse.id, { photo: url })
        notify(t('horseForm.photoUpdatedToast'), 'success')
        render(container, params)
      } catch (error) {
        notify(t('horseForm.photoUploadError', { error: error.message || String(error) }), 'error')
      }
    })
    const removePhotoButton = container.querySelector('[data-remove-photo]')
    if (removePhotoButton) {
      removePhotoButton.addEventListener('click', async () => {
        if (
          !(await confirmDialog({
            title: t('horseForm.removePhotoConfirmTitle'),
            message: t('horseForm.removePhotoConfirmMessage'),
            confirmText: t('horseForm.removePhotoConfirmButton'),
          }))
        )
          return
        try {
          await deleteHorsePhoto(horse.id)
          updateRecord('horses', horse.id, { photo: '' })
          notify(t('horseForm.photoRemovedToast'), 'success')
          render(container, params)
        } catch (error) {
          notify(
            t('horseForm.photoUploadError', { error: error.message || String(error) }),
            'error',
          )
        }
      })
    }

    initExtrasLogger({
      container,
      horse,
      categories: FEED_CATEGORIES,
      listSelector: '[data-feed-extras-list]',
      addButtonSelector: '[data-log-feed-extra]',
      logLabel: t('extrasLogger.logExtraFeed'),
      emptyCategoryMessage: t('extrasLogger.emptyFeedCategories'),
      getEntries: () =>
        getAll('feedingPlans').find((plan) => plan.horseId === horse.id)?.extras || [],
      saveEntries: (next) => {
        const plan = getAll('feedingPlans').find((item) => item.horseId === horse.id)
        if (plan) updateRecord('feedingPlans', plan.id, { extras: next })
        else createRecord('feedingPlans', { horseId: horse.id, extras: next })
      },
    })

    initExtrasLogger({
      container,
      horse,
      categories: GENERAL_EXTRA_CATEGORIES,
      listSelector: '[data-general-extras-list]',
      addButtonSelector: '[data-log-general-extra]',
      logLabel: t('extrasLogger.logExtraCharge'),
      emptyCategoryMessage: t('extrasLogger.emptyGeneralCategories'),
      getEntries: () => getRecord('horses', horse.id)?.extras || [],
      saveEntries: (next) => updateRecord('horses', horse.id, { extras: next }),
    })
  }

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

    const farrierPayload = Array.from(farrierList.querySelectorAll('.record-row')).map((row) => ({
      id: row.getAttribute('data-row-id') || undefined,
      type: 'farrier',
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
    syncChildRecords('medicalRecords', [...medicalPayload, ...farrierPayload])
    syncChildRecords('calendarEvents', eventPayload)

    notify(
      editing
        ? t('horseForm.savedToast', { name: payload.name })
        : t('horseForm.createdToast', { name: payload.name }),
      'success',
    )
    navigate(`/horses/${horseId}`)
  })
}
