import { capitalize, getStatusColor } from '../utils/helpers.js'

export function Badge(status, label = '') {
  return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(status)}">${label || capitalize(String(status).replace(/_/g, ' '))}</span>`
}
