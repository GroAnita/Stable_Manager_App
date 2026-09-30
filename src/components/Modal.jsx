import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { icon } from '../utils/icons.js'

// body/footer accept either a raw HTML string (existing call sites build
// markup with template literals, then query/bind it via modal.element) or a
// React node (used by components authored as JSX, e.g. ConfirmDialog).
export function ModalFrame({ title, body, footer, width = 'max-w-2xl', onCloseRequest }) {
  const isBodyString = typeof body === 'string'
  const isFooterString = typeof footer === 'string'

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCloseRequest()
      }}
    >
      <div className={`panel ${width} max-h-[90vh] w-full overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onCloseRequest}
            dangerouslySetInnerHTML={{ __html: icon('x', 'h-4 w-4') }}
          />
        </div>
        <div
          className="max-h-[65vh] overflow-y-auto px-5 py-4"
          {...(isBodyString ? { dangerouslySetInnerHTML: { __html: body } } : {})}
        >
          {isBodyString ? null : body}
        </div>
        {footer ? (
          <div
            className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4"
            {...(isFooterString ? { dangerouslySetInnerHTML: { __html: footer } } : {})}
          >
            {isFooterString ? null : footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function openModal({ title = '', body = '', footer = '', width = 'max-w-2xl' }) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    root.unmount()
    container.remove()
  }

  // The rest of the app calls openModal() and immediately does
  // `modal.element.querySelector(...)` on the same tick to wire up its own
  // form/button listeners, so the DOM has to exist synchronously here —
  // flushSync forces that instead of relying on React's default scheduling.
  flushSync(() => {
    root.render(
      <ModalFrame title={title} body={body} footer={footer} width={width} onCloseRequest={close} />,
    )
  })

  return { element: container.firstElementChild, close }
}
