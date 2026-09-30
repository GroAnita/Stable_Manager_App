import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { searchAll } from '../api/search.js'
import { navigate } from '../router/index.js'
import { debounce } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'

function SearchBarWidget({ placeholder }) {
  const [query, setQuery] = useState('')
  // null = dropdown closed, [] = open with no matches, [...] = open with matches.
  const [results, setResults] = useState(null)
  const containerRef = useRef(null)

  const runSearch = useMemo(() => debounce((value) => setResults(searchAll(value)), 150), [])

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setResults(null)
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  const handleChange = (event) => {
    const value = event.target.value
    setQuery(value)
    if (!value.trim()) {
      setResults(null)
      return
    }
    runSearch(value)
  }

  const handleFocus = () => {
    if (query.trim()) setResults(searchAll(query))
  }

  const handleSelect = (route) => {
    navigate(route)
    setQuery('')
    setResults(null)
  }

  return (
    <div ref={containerRef} className="relative w-full min-w-0 max-w-xl">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"
        dangerouslySetInnerHTML={{ __html: icon('search', 'h-4 w-4') }}
      />
      <input
        className="field pl-11 pr-4"
        type="search"
        placeholder={placeholder}
        autoComplete="off"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
      />
      {results ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
          {results.length ? (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-start justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => handleSelect(item.route)}
              >
                <span>
                  <span className="block text-sm font-medium text-slate-800">{item.title}</span>
                  <span className="block text-xs text-slate-500">
                    {item.type} · {item.subtitle}
                  </span>
                </span>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {t('common.open')}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">{t('appLayout.noMatchesFound')}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function mountSearchBar(container, { placeholder = t('appLayout.searchPlaceholder') } = {}) {
  createRoot(container).render(<SearchBarWidget placeholder={placeholder} />)
}
