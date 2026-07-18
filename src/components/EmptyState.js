export function EmptyState({ icon = '🐴', title = 'Nothing here yet', message = 'Add your first item to get started.' }) {
  return `<div class="panel flex flex-col items-center justify-center gap-3 p-10 text-center text-slate-500"><div class="text-4xl">${icon}</div><h3 class="text-lg font-semibold text-slate-800">${title}</h3><p class="max-w-md text-sm">${message}</p></div>`
}
