import { Card } from '../components/Card.js'
import { Badge } from '../components/Badge.js'
import { getAll, getSettings } from '../services/dataService.js'
import { signOut } from '../services/authService.js'
import { escapeHtml, formatCurrency, formatDate, horseAvatarHtml } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'

// The horse-owner portal: a single, self-contained page (no admin sidebar,
// no router) showing only what's relevant to one owner's own horse(s) — the
// RLS policies on the backend already scope every getAll() call below to
// just their own data (plus stable-wide events with no horse attached), so
// this view doesn't need to do any of that filtering itself.
export function renderOwnerDashboard(container) {
  const settings = getSettings()
  const horses = getAll('horses')
  const stalls = getAll('stalls')
  const payments = getAll('payments')
  const tasks = getAll('tasks')
  const events = getAll('calendarEvents')

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const duePayments = payments.filter((payment) => payment.status !== 'paid')
  const dueTotal = duePayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
  const openTasks = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const upcoming = events
    .filter((event) => new Date(event.date) >= startOfToday)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const upcomingFarrier = upcoming.filter((event) => event.type === 'farrier')
  const upcomingVet = upcoming.filter((event) => event.type === 'vet')
  const publicEvents = upcoming.filter((event) => !event.horseId)

  container.innerHTML = `
    <div class="min-h-screen bg-cream">
      <header class="sticky top-0 z-20 border-b border-white/70 bg-cream/90 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur md:px-6">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-xs uppercase tracking-[0.3em] text-slate-400">${escapeHtml(settings.stableName)}</p>
            <h1 class="mt-1 text-2xl font-semibold text-forest">${t('ownerDashboard.title')}</h1>
          </div>
          <button id="owner-sign-out" class="btn-ghost shrink-0">${t('appLayout.signOut')}</button>
        </div>
      </header>
      <main class="page-shell px-4 py-6 md:px-6">
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">${Card({
          label: t('ownerDashboard.myHorses'),
          value: horses.length,
          icon: icon('horse', 'h-5 w-5'),
        })}${Card({
          label: t('ownerDashboard.occupiedStalls'),
          value: stalls.filter((stall) => stall.status === 'occupied').length,
          icon: icon('grid', 'h-5 w-5'),
        })}${Card({
          label: t('ownerDashboard.duePayments'),
          value: formatCurrency(dueTotal),
          icon: icon('dollar', 'h-5 w-5'),
          helper: t('ownerDashboard.duePaymentsHelper', { count: duePayments.length }),
        })}${Card({
          label: t('ownerDashboard.tasks'),
          value: openTasks.length,
          icon: icon('checkSquare', 'h-5 w-5'),
        })}</section>
        <section class="grid gap-6 lg:grid-cols-2">
          <div class="panel p-5">
            <h2 class="section-title">${t('ownerDashboard.myHorsesTitle')}</h2>
            <div class="mt-4 space-y-3">${
              horses.length
                ? horses
                    .map(
                      (horse) =>
                        `<div class="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">${horseAvatarHtml(horse, 'h-12 w-12 shrink-0 rounded-xl text-lg')}<div class="min-w-0"><p class="truncate font-medium text-slate-900">${escapeHtml(horse.name)}</p><p class="truncate text-sm text-slate-500">${escapeHtml(horse.breed)} · ${t('horseList.stall')} ${stalls.find((stall) => stall.id === horse.stallId)?.number || '—'}</p></div></div>`,
                    )
                    .join('')
                : `<p class="text-sm text-slate-500">${t('ownerDashboard.noHorses')}</p>`
            }</div>
          </div>
          <div class="panel p-5">
            <h2 class="section-title">${t('ownerDashboard.duePaymentsTitle')}</h2>
            <div class="mt-4 space-y-3">${
              duePayments.length
                ? duePayments
                    .slice(0, 6)
                    .map(
                      (payment) =>
                        `<div class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"><div class="min-w-0"><p class="truncate font-medium text-slate-900">${escapeHtml(payment.invoiceNumber || t('paymentList.invoice'))}</p><p class="text-sm text-slate-500">${t('ownerDetail.due', { date: formatDate(payment.dueDate) })}</p></div><div class="shrink-0 text-right"><p class="font-medium text-slate-900">${formatCurrency(payment.amount)}</p><div class="mt-1">${Badge(payment.status)}</div></div></div>`,
                    )
                    .join('')
                : `<p class="text-sm text-slate-500">${t('ownerDashboard.noDuePayments')}</p>`
            }</div>
          </div>
        </section>
        <section class="grid gap-6 lg:grid-cols-3">
          <div class="panel p-5">
            <h2 class="section-title">${t('ownerDashboard.tasksTitle')}</h2>
            <div class="mt-4 space-y-3">${
              openTasks.length
                ? openTasks
                    .slice(0, 6)
                    .map(
                      (task) =>
                        `<div class="rounded-2xl border border-slate-100 p-3"><p class="break-words font-medium text-slate-900">${escapeHtml(task.title)}</p><p class="mt-1 text-sm text-slate-500">${formatDate(task.date)}${task.dueTime ? ` · ${escapeHtml(task.dueTime)}` : ''}</p></div>`,
                    )
                    .join('')
                : `<p class="text-sm text-slate-500">${t('ownerDashboard.noTasks')}</p>`
            }</div>
          </div>
          <div class="panel p-5">
            <h2 class="section-title">${t('ownerDashboard.upcomingFarrier')}</h2>
            <div class="mt-4 space-y-3">${
              upcomingFarrier.length
                ? upcomingFarrier
                    .slice(0, 6)
                    .map(
                      (event) =>
                        `<div class="rounded-2xl border border-slate-100 p-3"><p class="break-words font-medium text-slate-900">${escapeHtml(event.title)}</p><p class="mt-1 text-sm text-slate-500">${formatDate(event.date)} · ${event.time}</p></div>`,
                    )
                    .join('')
                : `<p class="text-sm text-slate-500">${t('ownerDashboard.noneScheduled')}</p>`
            }</div>
          </div>
          <div class="panel p-5">
            <h2 class="section-title">${t('ownerDashboard.upcomingVet')}</h2>
            <div class="mt-4 space-y-3">${
              upcomingVet.length
                ? upcomingVet
                    .slice(0, 6)
                    .map(
                      (event) =>
                        `<div class="rounded-2xl border border-slate-100 p-3"><p class="break-words font-medium text-slate-900">${escapeHtml(event.title)}</p><p class="mt-1 text-sm text-slate-500">${formatDate(event.date)} · ${event.time}</p></div>`,
                    )
                    .join('')
                : `<p class="text-sm text-slate-500">${t('ownerDashboard.noneScheduled')}</p>`
            }</div>
          </div>
        </section>
        <section class="panel p-5">
          <h2 class="section-title">${t('ownerDashboard.publicEvents')}</h2>
          <div class="mt-4 space-y-3">${
            publicEvents.length
              ? publicEvents
                  .slice(0, 8)
                  .map(
                    (event) =>
                      `<div class="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"><div class="min-w-0"><p class="break-words font-medium text-slate-900">${escapeHtml(event.title)}</p>${event.notes ? `<p class="mt-1 break-words text-sm text-slate-500">${escapeHtml(event.notes)}</p>` : ''}</div><p class="shrink-0 whitespace-nowrap text-sm text-slate-500">${formatDate(event.date)} · ${event.time}</p></div>`,
                  )
                  .join('')
              : `<p class="text-sm text-slate-500">${t('ownerDashboard.noPublicEvents')}</p>`
          }</div>
        </section>
      </main>
    </div>`

  container.querySelector('#owner-sign-out').addEventListener('click', async () => {
    await signOut()
    window.location.reload()
  })
}
