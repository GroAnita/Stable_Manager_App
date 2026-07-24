import { Badge } from '../components/Badge.js'
import { openModal } from '../components/Modal.js'
import { notify } from '../components/Notification.js'
import { createRecord, getAll, getRecord } from '../services/dataService.js'
import { escapeHtml, formatDate } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { getLanguage, t } from '../i18n/index.js'

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
function weekRange(date) {
  const start = new Date(date)
  const day = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}
const LOCALES = { en: 'en-GB', no: 'nb-NO' }
const eventTypeLabel = (type) => t(`status.${type.replace(/_/g, '-')}`)

export function render(container) {
  let currentDate = new Date(),
    mode = 'month'
  const horses = getAll('horses')
  const colors = {
    vet: '#3A6B52',
    farrier: '#8B6B4A',
    vaccination: '#D8B25A',
    worming: '#D8B25A',
    training: '#5B8A72',
    stable_event: '#688F91',
    arena_booking: '#7C8A7D',
  }
  const modeLabels = {
    month: t('calendarView.modeMonth'),
    week: t('calendarView.modeWeek'),
    day: t('calendarView.modeDay'),
  }
  const weekdayLabels = [
    t('calendarView.mon'),
    t('calendarView.tue'),
    t('calendarView.wed'),
    t('calendarView.thu'),
    t('calendarView.fri'),
    t('calendarView.sat'),
    t('calendarView.sun'),
  ]
  const draw = () => {
    const events = getAll('calendarEvents').sort((a, b) => new Date(a.date) - new Date(b.date))
    const range =
      mode === 'month'
        ? { start: startOfMonth(currentDate), end: endOfMonth(currentDate) }
        : mode === 'week'
          ? weekRange(currentDate)
          : { start: new Date(currentDate), end: new Date(currentDate) }
    const visibleEvents = events.filter(
      (event) => new Date(event.date) >= range.start && new Date(event.date) <= range.end,
    )
    const monthGrid = () => {
      const start = startOfMonth(currentDate),
        end = endOfMonth(currentDate),
        firstDay = (start.getDay() + 6) % 7,
        days = []
      for (let i = 0; i < firstDay; i += 1) days.push(null)
      for (let day = 1; day <= end.getDate(); day += 1)
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
      while (days.length % 7 !== 0) days.push(null)
      return `<div class="grid grid-cols-7 gap-3">${weekdayLabels.map((label) => `<p class="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">${label}</p>`).join('')}${days
        .map((day) => {
          if (!day) return '<div class="min-h-28 rounded-2xl bg-white/50"></div>'
          const iso = day.toISOString().slice(0, 10)
          const dayEvents = events.filter((event) => event.date === iso)
          const typeCounts = dayEvents.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1
            return acc
          }, {})
          return `<div class="min-h-28 rounded-2xl border border-slate-200 bg-white p-3"><div class="flex items-center justify-between"><p class="font-medium text-slate-900">${day.getDate()}</p><span class="text-xs text-slate-400">${dayEvents.length || ''}</span></div><div class="mt-2 hidden space-y-1 sm:block">${dayEvents
            .slice(0, 3)
            .map(
              (event) =>
                `<button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-slate-50" data-open-event="${event.id}"><span class="h-2 w-2 rounded-full" style="background:${colors[event.type] || '#688F91'}"></span>${escapeHtml(event.title)}</button>`,
            )
            .join('')}</div>${
            dayEvents.length
              ? `<button type="button" class="mt-2 flex w-full flex-wrap items-center gap-1.5 sm:hidden" data-open-day="${iso}">${Object.entries(
                  typeCounts,
                )
                  .map(
                    ([type, count]) =>
                      `<span class="flex items-center gap-1 rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"><span class="h-2 w-2 rounded-full" style="background:${colors[type] || '#688F91'}"></span>${count}</span>`,
                  )
                  .join('')}</button>`
              : ''
          }</div>`
        })
        .join('')}</div>`
    }
    const listLayout = () =>
      `<div class="space-y-3">${visibleEvents.length ? visibleEvents.map((event) => `<button class="panel flex w-full items-start justify-between gap-4 p-4 text-left" data-open-event="${event.id}"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full" style="background:${colors[event.type] || '#688F91'}"></span><p class="min-w-0 break-words font-medium text-slate-900">${escapeHtml(event.title)}</p>${Badge(event.type)}</div><p class="mt-1 break-words text-sm text-slate-500">${getRecord('horses', event.horseId)?.name ? escapeHtml(getRecord('horses', event.horseId).name) : t('calendarView.stableEventFallback')} · ${escapeHtml(event.notes)}</p></div><p class="shrink-0 whitespace-nowrap text-sm text-slate-500">${formatDate(event.date)} · ${event.time}</p></button>`).join('') : `<div class="panel p-10 text-center text-sm text-slate-500">${t('calendarView.noEventsRange')}</div>`}</div>`
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${t('calendarView.title')}</h1><p class="mt-2 text-sm text-slate-500">${t('calendarView.subtitle')}</p></div><button class="btn-primary" data-add-event>${icon('plus', 'h-4 w-4')}${t('calendarView.addEvent')}</button></div><div class="panel p-4"><div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div class="flex gap-2"><button class="btn-ghost px-3 py-2" data-prev>${icon('chevronLeft', 'h-4 w-4')}</button><button class="btn-ghost px-3 py-2" data-next>${icon('chevronRight', 'h-4 w-4')}</button><button class="btn-ghost px-3 py-2" data-today>${t('calendarView.today')}</button></div><h2 class="text-xl font-semibold text-slate-900">${currentDate.toLocaleString(LOCALES[getLanguage()] || 'en-GB', { month: 'long', year: 'numeric' })}</h2><div class="flex gap-2">${['month', 'week', 'day'].map((item) => `<button class="${mode === item ? 'bg-forest text-white' : 'bg-white text-slate-600'} rounded-xl px-4 py-2 text-sm font-medium" data-mode="${item}">${modeLabels[item]}</button>`).join('')}</div></div></div><div class="panel p-5"><div class="mb-4 flex flex-wrap gap-3 text-sm text-slate-500">${Object.entries(
      colors,
    )
      .map(
        ([type, color]) =>
          `<div class="flex items-center gap-2"><span class="h-3 w-3 rounded-full" style="background:${color}"></span>${eventTypeLabel(type)}</div>`,
      )
      .join('')}</div>${mode === 'month' ? monthGrid() : listLayout()}</div></div>`
    container.querySelector('[data-prev]').addEventListener('click', () => {
      if (mode === 'month') currentDate.setMonth(currentDate.getMonth() - 1)
      else currentDate.setDate(currentDate.getDate() - (mode === 'week' ? 7 : 1))
      draw()
    })
    container.querySelector('[data-next]').addEventListener('click', () => {
      if (mode === 'month') currentDate.setMonth(currentDate.getMonth() + 1)
      else currentDate.setDate(currentDate.getDate() + (mode === 'week' ? 7 : 1))
      draw()
    })
    container.querySelector('[data-today]').addEventListener('click', () => {
      currentDate = new Date()
      draw()
    })
    container.querySelectorAll('[data-mode]').forEach((button) =>
      button.addEventListener('click', () => {
        mode = button.getAttribute('data-mode')
        draw()
      }),
    )
    container.querySelector('[data-add-event]').addEventListener('click', () => {
      const modal = openModal({
        title: t('calendarView.addModalTitle'),
        body: `<form id="event-form" class="grid gap-4"><label><span class="field-label">${t('calendarView.eventTitle')}</span><input class="field" name="title" required /></label><label><span class="field-label">${t('calendarView.eventType')}</span><select class="field" name="type">${Object.keys(
          colors,
        )
          .map((value) => `<option value="${value}">${eventTypeLabel(value)}</option>`)
          .join(
            '',
          )}</select></label><label><span class="field-label">${t('calendarView.eventDate')}</span><input class="field" name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}" /></label><label><span class="field-label">${t('calendarView.eventTime')}</span><input class="field" name="time" type="time" required /></label><label><span class="field-label">${t('calendarView.horse')}</span><select class="field" name="horseId"><option value="">${t('calendarView.noHorse')}</option>${horses.map((horse) => `<option value="${horse.id}">${horse.name}</option>`).join('')}</select></label><label><span class="field-label">${t('calendarView.notes')}</span><textarea class="field min-h-24" name="notes"></textarea></label><button class="btn-primary" type="submit">${t('calendarView.save')}</button></form>`,
      })
      modal.element.querySelector('#event-form').addEventListener('submit', (event) => {
        event.preventDefault()
        const payload = Object.fromEntries(new FormData(event.target).entries())
        createRecord('calendarEvents', payload)
        modal.close()
        notify(t('calendarView.addedToast'), 'success')
        draw()
      })
    })
    container.querySelectorAll('[data-open-event]').forEach((button) =>
      button.addEventListener('click', () => {
        const event = getRecord('calendarEvents', button.getAttribute('data-open-event'))
        openModal({
          title: event.title,
          body: `<div class="space-y-3 text-sm text-slate-600"><div><span class="font-medium text-slate-800">${t('calendarView.date')}</span> ${formatDate(event.date)} ${t('calendarView.at')} ${event.time}</div><div><span class="font-medium text-slate-800">${t('calendarView.type')}</span> ${eventTypeLabel(event.type)}</div><div><span class="font-medium text-slate-800">${t('calendarView.horseLabel')}</span> ${getRecord('horses', event.horseId)?.name ? escapeHtml(getRecord('horses', event.horseId).name) : t('calendarView.stableEventFallback')}</div><div><span class="font-medium text-slate-800">${t('calendarView.notesLabel')}</span> ${escapeHtml(event.notes)}</div></div>`,
        })
      }),
    )
    container.querySelectorAll('[data-open-day]').forEach((button) =>
      button.addEventListener('click', () => {
        const iso = button.getAttribute('data-open-day')
        const dayEvents = events.filter((event) => event.date === iso)
        openModal({
          title: formatDate(iso),
          body: dayEvents.length
            ? `<div class="space-y-3">${dayEvents
                .map(
                  (event) =>
                    `<div class="flex items-start gap-3 rounded-2xl border border-slate-100 p-3"><span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style="background:${colors[event.type] || '#688F91'}"></span><div><div class="flex flex-wrap items-center gap-2"><p class="font-medium text-slate-900">${escapeHtml(event.title)}</p>${Badge(event.type)}</div><p class="mt-1 text-xs text-slate-500">${event.time}${getRecord('horses', event.horseId)?.name ? ` · ${escapeHtml(getRecord('horses', event.horseId).name)}` : ''}</p>${event.notes ? `<p class="mt-1 text-xs text-slate-400">${escapeHtml(event.notes)}</p>` : ''}</div></div>`,
                )
                .join('')}</div>`
            : `<p class="text-sm text-slate-500">${t('calendarView.noEventsDay')}</p>`,
        })
      }),
    )
  }
  draw()
}
