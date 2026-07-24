import { capitalize, getStatusColor } from '../utils/helpers.js'
import { t } from '../i18n/index.js'

export function Badge(status, label = '') {
  const key = `status.${String(status).toLowerCase().replace(/_/g, '-')}`
  const translated = t(key)
  const display =
    label || (translated === key ? capitalize(String(status).replace(/_/g, ' ')) : translated)
  return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(status)}">${display}</span>`
}
