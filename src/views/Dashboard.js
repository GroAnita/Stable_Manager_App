import { Card } from '../components/Card.js'
import { Badge } from '../components/Badge.js'
import { EmptyState } from '../components/EmptyState.js'
import { getAll, getDashboardMetrics, getRecord } from '../services/dataService.js'
import { escapeHtml, formatCurrency, formatDate, formatRelativeTime } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'

export function render(container) {
  const metrics = getDashboardMetrics()
  const events = getAll('calendarEvents')
    .filter((event) => {
      const diff = (new Date(event.date) - new Date()) / 86400000
      return diff >= 0 && diff <= 7
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const tasksToday = getAll('tasks').filter(
    (task) => task.date === new Date().toISOString().slice(0, 10),
  )
  const payments = getAll('payments')
    .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
    .slice(0, 4)
  const recentActivity = [
    ...payments.map((payment) => ({
      title: `${getRecord('horses', payment.horseId)?.name || t('dashboard.boardingFallback')} invoice ${payment.invoiceNumber}`,
      detail: `${formatCurrency(payment.amount)} · ${payment.status}`,
      when: payment.paidDate || payment.dueDate,
    })),
    ...getAll('tasks')
      .filter((task) => task.completed)
      .slice(0, 3)
      .map((task) => ({
        title: task.title,
        detail: t('dashboard.completedBy', { name: task.assignedTo }),
        when: task.date,
      })),
  ]
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, 6)

  container.innerHTML = `
    <div class="page-shell">
      <section class="page-header"><div><p class="text-sm uppercase tracking-[0.25em] text-slate-400">${t('dashboard.welcomeBack')}</p><h1 class="mt-2 text-3xl font-semibold text-slate-900">${t('dashboard.overviewFor', { date: formatDate(new Date().toISOString()) })}</h1><p class="mt-2 max-w-2xl text-sm text-slate-500">${t('dashboard.subtitle')}</p></div></section>
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">${Card({ label: t('dashboard.totalHorses'), value: metrics.totalHorses, icon: '🐴', helper: t('dashboard.totalHorsesHelper') })}${Card({ label: t('dashboard.occupiedStalls'), value: metrics.occupiedStalls, icon: icon('grid', 'h-5 w-5'), helper: t('dashboard.occupiedStallsHelper', { count: metrics.availableStalls }) })}${Card({ label: t('dashboard.availableStalls'), value: metrics.availableStalls, icon: icon('home', 'h-5 w-5'), helper: t('dashboard.availableStallsHelper') })}${Card({ label: t('dashboard.monthlyRevenue'), value: formatCurrency(metrics.monthlyRevenue), icon: icon('dollar', 'h-5 w-5'), helper: t('dashboard.monthlyRevenueHelper') })}</section>
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">${Card({ label: t('dashboard.duePayments'), value: metrics.duePayments, icon: icon('alert', 'h-5 w-5'), helper: t('dashboard.duePaymentsHelper') })}${Card({ label: t('dashboard.tasksToday'), value: metrics.tasksToday, icon: icon('checkSquare', 'h-5 w-5'), helper: t('dashboard.tasksTodayHelper') })}${Card({ label: t('dashboard.upcomingFarrier'), value: metrics.upcomingFarrierVisits, icon: icon('horse', 'h-5 w-5'), helper: t('dashboard.upcomingFarrierHelper') })}${Card({ label: t('dashboard.upcomingVet'), value: metrics.upcomingVetVisits, icon: icon('calendar', 'h-5 w-5'), helper: t('dashboard.upcomingVetHelper') })}</section>
      <section class="grid gap-6 xl:grid-cols-[1.7fr,1fr]">
        <div class="space-y-6">
          <div class="panel p-5"><div class="mb-4 flex items-center justify-between"><h2 class="section-title">${t('dashboard.upcomingEvents')}</h2><span class="text-sm text-slate-400">${t('dashboard.next7Days')}</span></div><div class="space-y-3">${events.length ? events.map((event) => `<div class="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full" style="background:${event.color}"></span><p class="min-w-0 break-words font-medium text-slate-800">${escapeHtml(event.title)}</p>${Badge(event.type)}</div><p class="mt-1 break-words text-sm text-slate-500">${getRecord('horses', event.horseId) ? `${escapeHtml(getRecord('horses', event.horseId).name)} · ` : ''}${escapeHtml(event.notes)}</p></div><p class="shrink-0 whitespace-nowrap text-sm text-slate-500">${formatDate(event.date, { day: 'numeric', month: 'short' })} · ${event.time}</p></div>`).join('') : EmptyState({ icon: '📅', title: t('dashboard.noUpcomingEventsTitle'), message: t('dashboard.noUpcomingEventsMessage') })}</div></div>
          <div class="grid gap-6 lg:grid-cols-2">
            <div class="panel p-5"><div class="mb-4 flex items-center justify-between"><h2 class="section-title">${t('dashboard.todaysTasks')}</h2><span class="text-sm text-slate-400">${t('dashboard.scheduledCount', { count: tasksToday.length })}</span></div><div class="space-y-3">${tasksToday.length ? tasksToday.map((task) => `<div class="rounded-2xl border border-slate-100 px-4 py-3"><div class="flex items-center justify-between gap-3"><p class="font-medium text-slate-800">${task.title}</p>${Badge(task.priority)}</div><p class="mt-1 text-sm text-slate-500">${task.assignedTo} · ${task.type} · ${task.dueTime}</p></div>`).join('') : `<p class="text-sm text-slate-500">${t('dashboard.noTasksToday')}</p>`}</div></div>
            <div class="panel p-5"><div class="mb-4 flex items-center justify-between"><h2 class="section-title">${t('dashboard.recentActivity')}</h2><span class="text-sm text-slate-400">${t('dashboard.liveFromStorage')}</span></div><div class="space-y-3">${recentActivity.map((item) => `<div class="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3"><div class="mt-1 h-2.5 w-2.5 rounded-full bg-forest"></div><div><p class="font-medium text-slate-800">${item.title}</p><p class="text-sm text-slate-500">${item.detail}</p><p class="mt-1 text-xs text-slate-400">${formatRelativeTime(item.when)}</p></div></div>`).join('')}</div></div>
          </div>
        </div>
        <aside class="panel p-5"><div class="mb-4 flex items-center justify-between"><h2 class="section-title">${t('dashboard.notifications')}</h2><span class="text-sm text-slate-400">${t('dashboard.attentionNeeded')}</span></div><div class="space-y-3">${metrics.notifications.length ? metrics.notifications.map((item) => `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex items-center justify-between gap-3"><p class="font-medium text-slate-800">${item.title}</p>${Badge(item.type)}</div><p class="mt-2 text-sm text-slate-500">${item.message}</p><p class="mt-2 text-xs text-slate-400">${formatDate(item.date)}</p></div>`).join('') : `<p class="text-sm text-slate-500">${t('dashboard.everythingCalm')}</p>`}</div></aside>
      </section>
    </div>`
}
