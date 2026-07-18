import * as Dashboard from '../views/Dashboard.js'
import * as HorseList from '../views/HorseList.js'
import * as HorseDetail from '../views/HorseDetail.js'
import * as HorseForm from '../views/HorseForm.js'
import * as OwnerList from '../views/OwnerList.js'
import * as OwnerDetail from '../views/OwnerDetail.js'
import * as OwnerForm from '../views/OwnerForm.js'
import * as StallView from '../views/StallView.js'
import * as ContractList from '../views/ContractList.js'
import * as ContractForm from '../views/ContractForm.js'
import * as PaymentList from '../views/PaymentList.js'
import * as CalendarView from '../views/CalendarView.js'
import * as TaskList from '../views/TaskList.js'
import * as Reports from '../views/Reports.js'
import * as Settings from '../views/Settings.js'
import * as NotFound from '../views/NotFound.js'

let rootContainer
const routes = [
  { path: '/dashboard', view: Dashboard },
  { path: '/horses', view: HorseList },
  { path: '/horses/new', view: HorseForm },
  { path: '/horses/:id/edit', view: HorseForm },
  { path: '/horses/:id', view: HorseDetail },
  { path: '/owners', view: OwnerList },
  { path: '/owners/new', view: OwnerForm },
  { path: '/owners/:id/edit', view: OwnerForm },
  { path: '/owners/:id', view: OwnerDetail },
  { path: '/stalls', view: StallView },
  { path: '/contracts', view: ContractList },
  { path: '/contracts/new', view: ContractForm },
  { path: '/contracts/:id/edit', view: ContractForm },
  { path: '/payments', view: PaymentList },
  { path: '/calendar', view: CalendarView },
  { path: '/tasks', view: TaskList },
  { path: '/reports', view: Reports },
  { path: '/settings', view: Settings },
]

const parseLocation = () => {
  const hash = window.location.hash.replace(/^#/, '') || '/dashboard'
  const [path, query = ''] = hash.split('?')
  return { path: path.startsWith('/') ? path : `/${path}`, query: new URLSearchParams(query) }
}

function matchRoute(pathname) {
  for (const route of routes) {
    const keys = []
    const pattern = route.path.replace(/:([^/]+)/g, (_, key) => { keys.push(key); return '([^/]+)' })
    const match = pathname.match(new RegExp(`^${pattern}$`))
    if (match) return { route, params: keys.reduce((acc, key, index) => ({ ...acc, [key]: decodeURIComponent(match[index + 1]) }), {}) }
  }
  return null
}

function renderRoute() {
  if (!rootContainer) return
  const location = parseLocation()
  const matched = matchRoute(location.path)
  const view = matched?.route.view || NotFound
  view.render(rootContainer, { ...(matched?.params || {}), query: location.query, path: location.path })
  window.dispatchEvent(new CustomEvent('app:route-change', { detail: { path: location.path } }))
}

export function navigate(path) {
  const target = path.startsWith('/') ? path : `/${path}`
  if (window.location.hash.replace(/^#/, '') === target) return renderRoute()
  window.location.hash = target
}

export function getCurrentRoute() { return parseLocation().path }
export function initRouter(container) { rootContainer = container; window.addEventListener('hashchange', renderRoute); if (!window.location.hash) navigate('/dashboard'); else renderRoute() }
