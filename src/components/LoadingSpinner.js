import { t } from '../i18n/index.js'

export function LoadingSpinner(label = t('common.loading')) {
  return `<div class="flex items-center justify-center gap-3 py-10 text-slate-500"><span class="h-6 w-6 animate-spin rounded-full border-2 border-forest/20 border-t-forest"></span><span class="text-sm">${label}</span></div>`
}
