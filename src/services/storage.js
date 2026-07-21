import { generateId } from '../utils/helpers.js'

const parse = (value) => {
  if (value === null || value === undefined) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export const storage = {
  get(key) {
    return parse(window.localStorage.getItem(key))
  },
  set(key, value) {
    const next = Array.isArray(value)
      ? value.map((item) =>
          item && typeof item === 'object' && !item.id ? { ...item, id: generateId() } : item,
        )
      : value
    window.localStorage.setItem(key, JSON.stringify(next))
    return next
  },
  create(key, data) {
    const items = this.get(key) || []
    const record = { id: generateId(), ...data }
    items.push(record)
    this.set(key, items)
    return record
  },
  update(key, id, data) {
    const items = this.get(key) || []
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return null
    items[index] = { ...items[index], ...data, id }
    this.set(key, items)
    return items[index]
  },
  delete(key, id) {
    const items = this.get(key) || []
    const next = items.filter((item) => item.id !== id)
    this.set(key, next)
    return next.length !== items.length
  },
  getById(key, id) {
    const items = this.get(key) || []
    return items.find((item) => item.id === id) || null
  },
}
