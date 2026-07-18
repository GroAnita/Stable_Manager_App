import { openModal } from './Modal.js'

export function confirmDialog({ title = 'Confirm action', message = 'Are you sure?', confirmText = 'Confirm' } = {}) {
  return new Promise((resolve) => {
    const modal = openModal({
      title,
      body: `<p class="text-sm text-slate-600">${message}</p>`,
      footer: `<button type="button" class="btn-ghost" data-action="cancel">Cancel</button><button type="button" class="btn-primary" data-action="confirm">${confirmText}</button>`,
      width: 'max-w-md',
    })
    modal.element.querySelector('[data-action="cancel"]').addEventListener('click', () => { modal.close(); resolve(false) })
    modal.element.querySelector('[data-action="confirm"]').addEventListener('click', () => { modal.close(); resolve(true) })
  })
}
