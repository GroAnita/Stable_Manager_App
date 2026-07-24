import { SearchBar } from '../components/SearchBar.js'
import { initNotifications } from '../components/Notification.js'
import { searchAll } from '../api/search.js'
import { initData, getDashboardMetrics, getSettings } from '../services/dataService.js'
import { signOut } from '../services/authService.js'
import { debounce, formatDate } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'
import { initRouter, navigate, getCurrentRoute } from '../router/index.js'

const getNavItems = () => [
  { label: t('nav.dashboard'), route: '/dashboard', iconName: 'home' },
  { label: t('nav.horses'), route: '/horses', iconName: 'horse' },
  { label: t('nav.owners'), route: '/owners', iconName: 'users' },
  { label: t('nav.stalls'), route: '/stalls', iconName: 'grid' },
  { label: t('nav.contracts'), route: '/contracts', iconName: 'fileText' },
  { label: t('nav.payments'), route: '/payments', iconName: 'dollar' },
  { label: t('nav.calendar'), route: '/calendar', iconName: 'calendar' },
  { label: t('nav.tasks'), route: '/tasks', iconName: 'checkSquare' },
  { label: t('nav.reports'), route: '/reports', iconName: 'chart' },
  { label: t('nav.priceList'), route: '/price-list', iconName: 'priceList' },
  { label: t('nav.settings'), route: '/settings', iconName: 'settings' },
]

const renderNavItem = (item) =>
  `<a href="#${item.route}" data-nav-link="${item.route}" class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-white hover:text-forest"><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-forest">${icon(item.iconName, 'h-5 w-5')}</span><span>${item.label}</span></a>`

function updateActiveNavigation(navItems) {
  const route = getCurrentRoute()
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const target = link.getAttribute('data-nav-link')
    const active = route === target || (target !== '/dashboard' && route.startsWith(target))
    link.classList.toggle('bg-white', active)
    link.classList.toggle('text-forest', active)
    link.classList.toggle('shadow-soft', active)
  })
  const title =
    navItems.find((item) => route === item.route || route.startsWith(`${item.route}/`))?.label ||
    t('appLayout.title')
  const titleNode = document.getElementById('page-title')
  if (titleNode) titleNode.textContent = title
}

function bindSearch() {
  const input = document.getElementById('global-search')
  const results = document.getElementById('global-search-results')
  const drawResults = (items) => {
    if (!items.length) {
      results.innerHTML = `<p class="px-3 py-2 text-sm text-slate-500">${t('appLayout.noMatchesFound')}</p>`
      results.classList.remove('hidden')
      return
    }
    results.innerHTML = items
      .map(
        (item) =>
          `<button type="button" class="flex w-full items-start justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50" data-search-route="${item.route}"><span><span class="block text-sm font-medium text-slate-800">${item.title}</span><span class="block text-xs text-slate-500">${item.type} · ${item.subtitle}</span></span><span class="text-xs uppercase tracking-wide text-slate-400">${t('common.open')}</span></button>`,
      )
      .join('')
    results.classList.remove('hidden')
  }
  input.addEventListener(
    'input',
    debounce((event) => {
      if (!event.target.value.trim()) {
        results.classList.add('hidden')
        results.innerHTML = ''
        return
      }
      drawResults(searchAll(event.target.value))
    }, 150),
  )
  input.addEventListener('focus', () => {
    if (results.innerHTML) results.classList.remove('hidden')
  })
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#global-search-results') && !event.target.closest('#global-search'))
      results.classList.add('hidden')
    const route = event.target.closest('[data-search-route]')?.getAttribute('data-search-route')
    if (route) {
      navigate(route)
      input.value = ''
      results.classList.add('hidden')
    }
  })
}

function bindShellInteractions() {
  const sidebar = document.getElementById('app-sidebar')
  const overlay = document.getElementById('sidebar-overlay')
  const open = () => {
    sidebar.classList.remove('-translate-x-full')
    overlay.classList.remove('hidden')
  }
  const close = () => {
    sidebar.classList.add('-translate-x-full')
    overlay.classList.add('hidden')
  }
  document.getElementById('sidebar-toggle').addEventListener('click', open)
  document.getElementById('sidebar-close').addEventListener('click', close)
  overlay.addEventListener('click', close)
  window.addEventListener('hashchange', close)
  const bell = document.getElementById('notification-bell')
  const dropdown = document.getElementById('notification-dropdown')
  bell.addEventListener('click', () => dropdown.classList.toggle('hidden'))
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#notification-area')) dropdown.classList.add('hidden')
  })
}

export async function initApp() {
  await initData()
  initNotifications()
  const app = document.getElementById('app')
  const settings = getSettings()
  const metrics = getDashboardMetrics()
  const navItems = getNavItems()
  app.innerHTML = `
    <div class="min-h-screen lg:flex">
      <div id="sidebar-overlay" class="fixed inset-0 z-30 hidden bg-slate-900/40 lg:hidden"></div>
      <aside id="app-sidebar" class="fixed inset-y-0 left-0 z-40 flex w-80 -translate-x-full flex-col gap-6 overflow-y-auto border-r border-white/70 bg-cream px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] transition-transform duration-300 lg:static lg:translate-x-0">
        <div class="flex items-center justify-between"><div><div class="flex items-center gap-2"><img src="/ND-Iconedited.png" alt="" class="h-6 w-6 rounded-md" /><p class="text-xs uppercase tracking-[0.3em] text-slate-400">${t('appLayout.tagline')}</p></div><h1 class="mt-2 text-2xl font-semibold text-forest">${settings.stableName}</h1></div><button id="sidebar-close" class="rounded-full p-2 text-slate-500 hover:bg-white lg:hidden">${icon('x', 'h-5 w-5')}</button></div>
        <div class="panel p-4"><p class="text-sm font-medium text-slate-500">${t('appLayout.today')}</p><p class="mt-1 text-lg font-semibold text-slate-900">${formatDate(new Date().toISOString())}</p><p class="mt-2 text-sm text-slate-500">${t('appLayout.horsesStallsActive', { horses: metrics.totalHorses, occupied: metrics.occupiedStalls, total: metrics.totalHorses + metrics.availableStalls })}</p></div>
        <nav class="flex-1 space-y-1">${navItems.map(renderNavItem).join('')}</nav>
        <div class="rounded-2xl bg-forest px-5 py-4 text-white shadow-soft"><p class="text-sm font-medium text-white/80">${t('appLayout.manager')}</p><p class="mt-1 text-lg font-semibold">${settings.managerName}</p><p class="mt-1 text-sm text-white/80">${settings.phone}</p><button id="sign-out-button" class="mt-3 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20">${t('appLayout.signOut')}</button></div>
      </aside>
      <div class="flex min-h-screen flex-1 flex-col">
        <header class="sticky top-0 z-20 border-b border-white/70 bg-cream/90 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur md:px-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-3"><button id="sidebar-toggle" class="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 lg:hidden">${icon('menu', 'h-5 w-5')}</button><div><p class="text-xs uppercase tracking-[0.3em] text-slate-400">${t('appLayout.overview')}</p><h2 id="page-title" class="text-2xl font-semibold text-slate-900">${t('appLayout.title')}</h2></div></div>
            <div class="flex items-center gap-3">${SearchBar()}<div id="notification-area" class="relative"><button id="notification-bell" class="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:text-forest">${icon('bell', 'h-5 w-5')}<span class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-white">${metrics.notifications.length}</span></button><div id="notification-dropdown" class="absolute right-0 top-[calc(100%+0.75rem)] hidden w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-card"><div class="mb-3 flex items-center justify-between"><h3 class="font-semibold text-slate-900">${t('appLayout.notifications')}</h3><span class="text-xs text-slate-400">${t('appLayout.activeCount', { count: metrics.notifications.length })}</span></div><div class="space-y-2">${
              metrics.notifications.length
                ? metrics.notifications
                    .slice(0, 5)
                    .map(
                      (item) =>
                        `<div class="rounded-xl bg-slate-50 px-3 py-2"><p class="text-sm font-medium text-slate-800">${item.title}</p><p class="mt-1 text-xs text-slate-500">${item.message}</p></div>`,
                    )
                    .join('')
                : `<p class="text-sm text-slate-500">${t('appLayout.noUrgentUpdates')}</p>`
            }</div></div></div></div>
          </div>
        </header>
        <main id="view-root" class="flex-1 px-4 py-6 md:px-6"></main>
      </div>
    </div>`
  bindShellInteractions()
  bindSearch()
  document.getElementById('sign-out-button').addEventListener('click', async () => {
    await signOut()
    window.location.reload()
  })
  initRouter(document.getElementById('view-root'))
  updateActiveNavigation(navItems)
  window.addEventListener('hashchange', () => updateActiveNavigation(navItems))
  window.addEventListener('app:route-change', () => updateActiveNavigation(navItems))
}
