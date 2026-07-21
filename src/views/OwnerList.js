import { EmptyState } from '../components/EmptyState.js'
import { getAll } from '../services/dataService.js'
import { icon } from '../utils/icons.js'
import { navigate } from '../router/index.js'

export function render(container) {
  const owners = getAll('owners')
  let search = ''
  const draw = () => {
    const filtered = owners.filter((owner) =>
      [owner.name, owner.email, owner.phone].some((value) =>
        value.toLowerCase().includes(search.toLowerCase()),
      ),
    )
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">Owners</h1><p class="mt-2 text-sm text-slate-500">Keep owner contacts, horses and payment relationships neatly connected.</p></div><button class="btn-primary" data-add-owner>${icon('plus', 'h-4 w-4')}Add owner</button></div><div class="panel p-4"><input class="field" type="search" placeholder="Search owners by name, email or phone..." value="${search}" data-owner-search /></div>${filtered.length ? `<div class="grid gap-4 lg:grid-cols-2">${filtered.map((owner) => `<button class="panel p-5 text-left hover:-translate-y-0.5" data-owner-open="${owner.id}"><div class="flex items-start justify-between gap-4"><div><h3 class="text-xl font-semibold text-slate-900">${owner.name}</h3><p class="mt-1 text-sm text-slate-500">${owner.email}</p></div><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">${owner.phone}</span></div><p class="mt-4 text-sm text-slate-500">${owner.address}</p><p class="mt-3 text-sm text-slate-400">Emergency: ${owner.emergencyContact}</p></button>`).join('')}</div>` : EmptyState({ icon: '👤', title: 'No owners found', message: 'Add a new owner to begin managing boarding records.' })}</div>`
    container
      .querySelector('[data-add-owner]')
      .addEventListener('click', () => navigate('/owners/new'))
    container.querySelector('[data-owner-search]').addEventListener('input', (event) => {
      search = event.target.value
      draw()
    })
    container
      .querySelectorAll('[data-owner-open]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          navigate(`/owners/${button.getAttribute('data-owner-open')}`),
        ),
      )
  }
  draw()
}
