import { en } from './en.js'
import { no } from './no.js'

const dictionaries = { en, no }
const LANG_KEY = 'stable-manager:language'

let currentLanguage = window.localStorage.getItem(LANG_KEY) || 'en'

export function getLanguage() {
  return currentLanguage
}

export function setLanguage(lang) {
  if (!dictionaries[lang] || lang === currentLanguage) return
  currentLanguage = lang
  window.localStorage.setItem(LANG_KEY, lang)
}

function resolve(key, dict) {
  return key
    .split('.')
    .reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), dict)
}

/**
 * Looks up a dot-notated key in the active language's dictionary, falling
 * back to English and then the key itself if missing. `{name}`-style
 * placeholders in the template are replaced from `vars`.
 */
export function t(key, vars = {}) {
  const template = resolve(key, dictionaries[currentLanguage]) ?? resolve(key, dictionaries.en)
  if (typeof template !== 'string') return key
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined ? vars[name] : match,
  )
}
