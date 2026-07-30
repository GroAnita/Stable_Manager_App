import { openModal } from '../components/Modal.js'
import { notify } from '../components/Notification.js'
import {
  FEED_CATEGORIES,
  GENERAL_EXTRA_CATEGORIES,
  extrasListHtml,
} from '../components/ExtrasList.js'
import { getAll, getRecord, initData } from '../services/dataService.js'
import { logHorseExtra } from '../services/ownerActions.js'
import { escapeHtml, formatCurrency, horseAvatarHtml } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'

// Read-only horse profile for the owner portal, plus the one thing an owner
// can actually change: logging a billable extra. Unlike the staff HorseForm,
// there's no edit access to the horse or feeding plan itself, and logged
// extras have no remove button — owners have no direct write access to
// horses/feeding_plans/payments at all, only the log_horse_extra() RPC (see
// ownerActions.js), so there's nothing here for a "remove" button to call.
export function renderOwnerHorseDetail(container, { horseId, onBack }) {
  const horse = getRecord('horses', horseId)
  if (!horse) {
    onBack()
    return
  }
  const stalls = getAll('stalls')
  const feedingPlan = getAll('feedingPlans').find((plan) => plan.horseId === horseId)

  const openLogModal = ({ categories, logLabel, emptyCategoryMessage }) => {
    const items = getAll('priceListItems').filter((item) => categories.includes(item.category))
    if (!items.length) {
      openModal({
        title: logLabel,
        body: `<p class="text-sm text-slate-600">${emptyCategoryMessage}</p>`,
      })
      return
    }
    const grouped = items.reduce((acc, item) => {
      ;(acc[item.category] ||= []).push(item)
      return acc
    }, {})
    const modal = openModal({
      title: logLabel,
      body: `<form class="owner-extra-form grid gap-4"><label><span class="field-label">${t('extrasLogger.item')}</span><select class="field" name="priceListItemId" required>${Object.entries(
        grouped,
      )
        .map(
          ([category, list]) =>
            `<optgroup label="${category}">${list.map((item) => `<option value="${item.id}">${escapeHtml(item.item)} (${formatCurrency(item.price * 1.25)}${item.unit ? ` / ${escapeHtml(item.unit)}` : ''})</option>`).join('')}</optgroup>`,
        )
        .join(
          '',
        )}</select></label><label><span class="field-label">${t('extrasLogger.quantity')}</span><input class="field" name="quantity" type="number" step="0.01" min="0.01" value="1" required /></label><label><span class="field-label">${t('extrasLogger.date')}</span><input class="field" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required /></label><p class="text-sm text-slate-500">${t('extrasLogger.estimatedCharge')} <span class="font-medium text-slate-800" data-extra-cost-preview>${formatCurrency((items[0]?.price || 0) * 1.25)}</span></p><button class="btn-primary" type="submit">${t('extrasLogger.submit')}</button></form>`,
    })
    const form = modal.element.querySelector('.owner-extra-form')
    const itemSelect = form.querySelector('[name="priceListItemId"]')
    const qtyInput = form.querySelector('[name="quantity"]')
    const dateInput = form.querySelector('[name="date"]')
    const preview = form.querySelector('[data-extra-cost-preview]')
    const updatePreview = () => {
      const item = getRecord('priceListItems', itemSelect.value)
      preview.textContent = formatCurrency(
        (item?.price || 0) * (Number(qtyInput.value) || 0) * 1.25,
      )
    }
    itemSelect.addEventListener('change', updatePreview)
    qtyInput.addEventListener('input', updatePreview)
    updatePreview()

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const submitButton = form.querySelector('button[type="submit"]')
      submitButton.disabled = true
      try {
        await logHorseExtra({
          horseId,
          priceListItemId: itemSelect.value,
          quantity: Number(qtyInput.value) || 0,
          date: dateInput.value,
        })
        await initData()
        modal.close()
        notify(t('extrasLogger.loggedToast'), 'success')
        renderOwnerHorseDetail(container, { horseId, onBack })
      } catch (error) {
        submitButton.disabled = false
        notify(t('extrasLogger.logError', { error: error.message || String(error) }), 'error')
      }
    })
  }

  const feedRows = [
    ['morning', feedingPlan?.morning],
    ['lunch', feedingPlan?.lunch],
    ['evening', feedingPlan?.evening],
  ]

  container.innerHTML = `
    <div class="min-h-screen bg-cream">
      <header class="sticky top-0 z-20 border-b border-white/70 bg-cream/90 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur md:px-6">
        <div class="flex items-center gap-3">
          <button id="owner-horse-back" class="btn-ghost shrink-0">${icon('chevronLeft', 'h-4 w-4')}${t('ownerHorseDetail.back')}</button>
          <h1 class="min-w-0 truncate text-2xl font-semibold text-forest">${escapeHtml(horse.name)}</h1>
        </div>
      </header>
      <main class="page-shell px-4 py-6 md:px-6">
        <section class="panel flex flex-wrap items-center gap-4 p-5">
          ${horseAvatarHtml(horse, 'h-16 w-16 rounded-2xl text-xl')}
          <div class="min-w-0">
            <p class="font-medium text-slate-900">${escapeHtml(horse.breed || '—')}</p>
            <p class="text-sm text-slate-500">${[
              horse.age ? `${horse.age} ${t('horseList.yearsAbbrev')}` : '',
              horse.gender,
              horse.color,
              `${t('horseList.stall')} ${stalls.find((stall) => stall.id === horse.stallId)?.number || '—'}`,
            ]
              .filter(Boolean)
              .map(escapeHtml)
              .join(' · ')}</p>
          </div>
        </section>

        <section class="panel p-5">
          <h2 class="section-title">${t('ownerHorseDetail.feedingPlan')}</h2>
          ${
            feedingPlan
              ? `<div class="mt-4 grid gap-3 md:grid-cols-3">${feedRows
                  .map(
                    ([period, entry]) =>
                      `<div class="rounded-2xl bg-slate-50 p-4"><p class="font-medium text-slate-900">${t(`horseForm.${period}`)}</p><p class="mt-1 text-sm text-slate-500">${t('horseForm.hay')}: ${escapeHtml(entry?.hay || '—')}</p><p class="text-sm text-slate-500">${t('horseForm.grain')}: ${escapeHtml(entry?.grain || '—')}</p><p class="text-sm text-slate-500">${t('horseForm.supplements')}: ${escapeHtml(entry?.supplements || '—')}</p></div>`,
                  )
                  .join(
                    '',
                  )}</div>${feedingPlan.specialInstructions ? `<p class="mt-3 text-sm text-slate-500">${escapeHtml(feedingPlan.specialInstructions)}</p>` : ''}`
              : `<p class="mt-3 text-sm text-slate-500">${t('ownerHorseDetail.noFeedingPlan')}</p>`
          }
        </section>

        <section class="panel p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold text-slate-900">${t('horseForm.extraFeedTitle')}</h3>
              <p class="mt-1 text-sm text-slate-500">${t('horseForm.extraFeedDescription')}</p>
            </div>
            <button type="button" class="btn-ghost" data-log-feed-extra>${t('horseForm.logExtra')}</button>
          </div>
          <div class="mt-3 space-y-2">${extrasListHtml(feedingPlan?.extras || [], { removable: false })}</div>
        </section>

        <section class="panel p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold text-slate-900">${t('horseForm.extraGeneralTitle')}</h3>
              <p class="mt-1 text-sm text-slate-500">${t('horseForm.extraGeneralDescription')}</p>
            </div>
            <button type="button" class="btn-ghost" data-log-general-extra>${t('horseForm.logExtra')}</button>
          </div>
          <div class="mt-3 space-y-2">${extrasListHtml(horse.extras || [], { removable: false })}</div>
        </section>
      </main>
    </div>`

  container.querySelector('#owner-horse-back').addEventListener('click', onBack)
  container.querySelector('[data-log-feed-extra]').addEventListener('click', () =>
    openLogModal({
      categories: FEED_CATEGORIES,
      logLabel: t('extrasLogger.logExtraFeed'),
      emptyCategoryMessage: t('extrasLogger.emptyFeedCategories'),
    }),
  )
  container.querySelector('[data-log-general-extra]').addEventListener('click', () =>
    openLogModal({
      categories: GENERAL_EXTRA_CATEGORIES,
      logLabel: t('extrasLogger.logExtraCharge'),
      emptyCategoryMessage: t('extrasLogger.emptyGeneralCategories'),
    }),
  )
}
