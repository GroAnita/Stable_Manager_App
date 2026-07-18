import { Badge } from '../components/Badge.js'
import { openModal } from '../components/Modal.js'
import { getAll, getRecord } from '../services/dataService.js'

export function render(container) {
  const stalls = getAll('stalls')
  let filter = 'all'
  const draw = () => {
    const filtered = stalls.filter((stall) => filter === 'all' || stall.status === filter)
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">Stall layout</h1><p class="mt-2 text-sm text-slate-500">A visual layout of all 20 stalls with occupancy, reservations and maintenance at a glance.</p></div><select class="field max-w-xs" data-stall-filter>${['all','available','occupied','reserved','maintenance'].map((value) => `<option value="${value}" ${filter === value ? 'selected' : ''}>${value === 'all' ? 'All stalls' : value}</option>`).join('')}</select></div><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">${filtered.map((stall) => { const palette = { available: 'bg-emerald-50 border-emerald-200 text-emerald-900', occupied: 'bg-amber-50 border-amber-200 text-amber-900', reserved: 'bg-sky-50 border-sky-200 text-sky-900', maintenance: 'bg-red-50 border-red-200 text-red-900' }; const horse = getRecord('horses', stall.horseId); return `<button class="rounded-[1.25rem] border p-4 text-left shadow-card ${palette[stall.status]}" data-stall-open="${stall.id}"><div class="flex items-center justify-between"><p class="text-sm uppercase tracking-[0.25em]">Stall</p>${Badge(stall.status)}</div><h3 class="mt-3 text-2xl font-semibold">${stall.number}</h3><p class="mt-2 text-sm opacity-80">${stall.size} box</p><p class="mt-4 text-sm opacity-80">${horse ? horse.name : stall.status === 'reserved' ? 'Reserved' : stall.status === 'maintenance' ? 'Maintenance' : 'Ready'}</p></button>` }).join('')}</div></div>`
    container.querySelector('[data-stall-filter]').addEventListener('change', (event) => { filter = event.target.value; draw() })
    container.querySelectorAll('[data-stall-open]').forEach((button) => button.addEventListener('click', () => { const stall = getRecord('stalls', button.getAttribute('data-stall-open')); const horse = getRecord('horses', stall.horseId); const owner = horse ? getRecord('owners', horse.ownerId) : null; openModal({ title: `Stall ${stall.number}`, body: `<div class="space-y-4 text-sm text-slate-600"><div><span class="font-medium text-slate-800">Status:</span> ${stall.status}</div><div><span class="font-medium text-slate-800">Size:</span> ${stall.size}</div><div><span class="font-medium text-slate-800">Current horse:</span> ${horse?.name || 'None assigned'}</div><div><span class="font-medium text-slate-800">Owner:</span> ${owner?.name || '—'}</div><div><span class="font-medium text-slate-800">Notes:</span> ${stall.notes}</div></div>` }) }))
  }
  draw()
}
