import { Badge } from '../components/Badge.js'
import { getAll } from '../services/dataService.js'
import { formatCurrency } from '../utils/helpers.js'

export function render(container) {
  const payments = getAll('payments'),
    stalls = getAll('stalls'),
    horses = getAll('horses')
  const monthlyIncome = Object.entries(
    payments.reduce((acc, payment) => {
      const month = payment.dueDate.slice(0, 7)
      acc[month] ||= 0
      if (payment.status === 'paid') acc[month] += payment.amount
      return acc
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
  const maxIncome = Math.max(...monthlyIncome.map(([, amount]) => amount), 1)
  const paymentSummary = ['paid', 'due', 'overdue'].map((status) => ({
    status,
    count: payments.filter((payment) => payment.status === status).length,
  }))
  const vaccinationSummary = ['Up to date', 'Due soon', 'Overdue'].map((status) => ({
    status,
    count: horses.filter((horse) => horse.vaccinationStatus === status).length,
  }))
  container.innerHTML = `<div class="page-shell"><div><h1 class="text-3xl font-semibold text-slate-900">Reports</h1><p class="mt-2 text-sm text-slate-500">Monitor income, occupancy, payment health and vaccination readiness.</p></div><div class="grid gap-6 xl:grid-cols-[1.4fr,1fr]"><div class="panel p-5"><h2 class="section-title">Income report</h2><div class="mt-6 space-y-4">${monthlyIncome.map(([month, amount]) => `<div><div class="mb-2 flex items-center justify-between text-sm text-slate-500"><span>${month}</span><span>${formatCurrency(amount)}</span></div><div class="h-3 rounded-full bg-slate-100"><div class="h-3 rounded-full bg-forest" style="width:${(amount / maxIncome) * 100}%"></div></div></div>`).join('')}</div></div><div class="space-y-6"><div class="panel p-5"><h2 class="section-title">Occupancy report</h2><div class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p><span class="font-medium text-slate-800">Occupied stalls:</span> ${stalls.filter((stall) => stall.status === 'occupied').length}</p><p class="mt-2"><span class="font-medium text-slate-800">Available stalls:</span> ${stalls.filter((stall) => stall.status === 'available').length}</p><p class="mt-2"><span class="font-medium text-slate-800">Reserved stalls:</span> ${stalls.filter((stall) => stall.status === 'reserved').length}</p><p class="mt-2"><span class="font-medium text-slate-800">Maintenance stalls:</span> ${stalls.filter((stall) => stall.status === 'maintenance').length}</p></div></div><div class="panel p-5"><h2 class="section-title">Payment status summary</h2><div class="mt-4 space-y-3">${paymentSummary.map((item) => `<div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span class="font-medium text-slate-800">${item.status}</span><span>${Badge(item.status, `${item.count}`)}</span></div>`).join('')}</div></div><div class="panel p-5"><h2 class="section-title">Vaccination status summary</h2><div class="mt-4 space-y-3">${vaccinationSummary.map((item) => `<div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span class="font-medium text-slate-800">${item.status}</span><span>${Badge(item.status, `${item.count}`)}</span></div>`).join('')}</div></div></div></div></div>`
}
