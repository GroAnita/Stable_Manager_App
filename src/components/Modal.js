import { icon } from '../utils/icons.js'

export function openModal({ title = '', body = '', footer = '', width = 'max-w-2xl' }) {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4'
  overlay.innerHTML = `
    <div class="panel ${width} max-h-[90vh] w-full overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 class="text-lg font-semibold text-slate-900">${title}</h3>
        <button type="button" data-modal-close class="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">${icon('x', 'h-4 w-4')}</button>
      </div>
      <div class="max-h-[65vh] overflow-y-auto px-5 py-4">${body}</div>
      ${footer ? `<div class="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">${footer}</div>` : ''}
    </div>
  `
  const close = () => overlay.remove()
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target.closest('[data-modal-close]')) close()
  })
  document.body.appendChild(overlay)
  return { element: overlay, close }
}
