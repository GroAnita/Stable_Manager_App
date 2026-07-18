export function Card({ label, value, icon = '', trend = '', helper = '' }) {
  return `
    <div class="card-stat">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm text-slate-500">${label}</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900">${value}</p>
          ${helper ? `<p class="mt-2 text-sm text-slate-500">${helper}</p>` : ''}
        </div>
        <div class="rounded-2xl bg-forest/10 p-3 text-forest">${icon}</div>
      </div>
      ${trend ? `<p class="mt-4 text-sm text-emerald-700">${trend}</p>` : ''}
    </div>
  `
}
