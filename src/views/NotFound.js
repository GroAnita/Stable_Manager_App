import { navigate } from '../router/index.js'
import { t } from '../i18n/index.js'

export function render(container) {
  container.innerHTML = `<div class="panel flex flex-col items-center justify-center gap-4 p-12 text-center"><div class="text-5xl">🧭</div><h1 class="text-2xl font-semibold text-slate-900">${t('notFound.title')}</h1><p class="text-slate-500">${t('notFound.message')}</p><button class="btn-primary" data-go-home>${t('notFound.backToDashboard')}</button></div>`
  container.querySelector('[data-go-home]').addEventListener('click', () => navigate('/dashboard'))
}
