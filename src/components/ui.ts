export const panelClass = 'surface operation-panel'
export const tablePanelClass = 'surface table-panel'
export const tableClass = 'data-table'
export const tableRowClass = 'data-row'
export const labelClass = 'field-label'
export const fieldClass = 'field-input'
export const primaryButtonClass = 'button button-primary'

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function readText(form: FormData, key: string, fallback = '') {
  return String(form.get(key) ?? fallback).trim()
}

export function readNumber(form: FormData, key: string, fallback = 0) {
  const value = Number.parseFloat(String(form.get(key) ?? ''))
  return Number.isFinite(value) ? value : fallback
}
