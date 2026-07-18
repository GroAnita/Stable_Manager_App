import { navigate } from '../router/index.js'

export function render(container) {
  container.innerHTML = `<div class="panel flex flex-col items-center justify-center gap-4 p-12 text-center"><div class="text-5xl">🧭</div><h1 class="text-2xl font-semibold text-slate-900">Page not found</h1><p class="text-slate-500">The route you requested doesn’t exist. Return to the dashboard to continue.</p><button class="btn-primary" data-go-home>Back to dashboard</button></div>`
  container.querySelector('[data-go-home]').addEventListener('click', () => navigate('/dashboard'))
}
