import { icon } from '../utils/icons.js'

export function SearchBar({ id = 'global-search', placeholder = 'Search horses, owners, stalls, contracts...' } = {}) {
  return `
    <div class="relative w-full max-w-xl">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">${icon('search', 'h-4 w-4')}</div>
      <input id="${id}" class="field pl-11 pr-4" type="search" placeholder="${placeholder}" autocomplete="off" />
      <div id="${id}-results" class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-card"></div>
    </div>
  `
}
