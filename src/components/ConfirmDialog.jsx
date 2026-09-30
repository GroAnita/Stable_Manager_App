import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ModalFrame } from './Modal.jsx'
import { t } from '../i18n/index.js'

export function confirmDialog({
  title = t('confirmDialog.title'),
  message = t('confirmDialog.message'),
  confirmText = t('confirmDialog.confirm'),
} = {}) {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      root.unmount()
      container.remove()
      resolve(result)
    }

    flushSync(() => {
      root.render(
        <ModalFrame
          title={title}
          width="max-w-md"
          body={<p className="text-sm text-slate-600">{message}</p>}
          footer={
            <>
              <button type="button" className="btn-ghost" onClick={() => finish(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn-primary" onClick={() => finish(true)}>
                {confirmText}
              </button>
            </>
          }
          onCloseRequest={() => finish(false)}
        />,
      )
    })
  })
}
