import { confirmDialog } from '../components/ConfirmDialog.js'
import { notify } from '../components/Notification.js'
import {
  exportData,
  getSettings,
  importData,
  resetData,
  upsertSettings,
} from '../services/dataService.js'
import { getLanguage, setLanguage, t } from '../i18n/index.js'

/**
 * Supported application currencies.
 *
 * @typedef {'EUR' | 'SEK' | 'NOK' | 'GBP'} Currency
 */

/**
 * Supported calendar display modes.
 *
 * @typedef {'month' | 'week' | 'day'} CalendarView
 */

/**
 * Stable and user-interface settings.
 *
 * @typedef {Object} StableSettings
 * @property {string} stableName - Display name of the stable.
 * @property {string} managerName - Name of the stable manager.
 * @property {string} phone - Stable contact telephone number.
 * @property {string} email - Stable contact email address.
 * @property {string} address - Stable postal address.
 * @property {Currency} currency - Currency used for financial values.
 * @property {CalendarView} defaultCalendarView - Initial calendar display mode.
 * @property {boolean} compactMode - Whether compact interface spacing is enabled.
 */

/**
 * Renders the application settings view.
 *
 * The view allows the user to:
 * - Edit stable and manager information.
 * - Select currency, language and calendar preferences.
 * - Enable compact display mode.
 * - Export application data as JSON.
 * - Import application data from JSON.
 * - clear the local cache and reload data from Supabase.
 *
 * Calling this function replaces the container's existing contents.
 *
 * @param {HTMLElement} container - Element in which the settings view is rendered.
 * @returns {void}
 */
export function render(container) {
  /** @type {StableSettings} */
  const settings = getSettings()
  const language = getLanguage()

  container.innerHTML = `
    <div class="page-shell">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">${t('settings.title')}</h1>
        <p class="mt-2 text-sm text-slate-500">
          ${t('settings.subtitle')}
        </p>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <form id="settings-form" class="panel p-6">
          <h2 class="section-title">${t('settings.stableInformation')}</h2>

          <div class="mt-5 grid gap-5 md:grid-cols-2">
            ${[
              ['stableName', t('settings.stableName'), 'text'],
              ['managerName', t('settings.managerName'), 'text'],
              ['phone', t('settings.phone'), 'tel'],
              ['email', t('settings.email'), 'email'],
              ['address', t('settings.address'), 'text'],
            ]
              .map(
                ([name, label, type]) => `
                  <label class="${name === 'address' ? 'md:col-span-2' : ''}">
                    <span class="field-label">${label}</span>
                    <input
                      class="field"
                      name="${name}"
                      type="${type}"
                      value="${settings[name] || ''}"
                      required
                    />
                  </label>`,
              )
              .join('')}

            <label>
              <span class="field-label">${t('settings.currency')}</span>
              <select class="field" name="currency">
                ${['EUR', 'SEK', 'NOK', 'GBP']
                  .map(
                    (value) => `
                      <option
                        value="${value}"
                        ${settings.currency === value ? 'selected' : ''}
                      >
                        ${value}
                      </option>`,
                  )
                  .join('')}
              </select>
            </label>

            <label>
              <span class="field-label">${t('settings.language')}</span>
              <select class="field" name="language">
                <option value="en" ${language === 'en' ? 'selected' : ''}>English</option>
                <option value="no" ${language === 'no' ? 'selected' : ''}>Norsk</option>
              </select>
            </label>

            <label>
              <span class="field-label">${t('settings.defaultCalendarView')}</span>
              <select class="field" name="defaultCalendarView">
                ${['month', 'week', 'day']
                  .map(
                    (value) => `
                      <option
                        value="${value}"
                        ${settings.defaultCalendarView === value ? 'selected' : ''}
                      >
                        ${value}
                      </option>`,
                  )
                  .join('')}
              </select>
            </label>

            <label
              class="md:col-span-2 flex items-center gap-3 rounded-2xl border
                border-slate-200 bg-white px-4 py-3"
            >
              <input
                type="checkbox"
                name="compactMode"
                ${settings.compactMode ? 'checked' : ''}
              />
              <span class="text-sm text-slate-600">
                ${t('settings.compactMode')}
              </span>
            </label>
          </div>

          <div class="mt-6 flex justify-end">
            <button class="btn-primary" type="submit">
              ${t('settings.saveSettings')}
            </button>
          </div>
        </form>

        <div class="space-y-6">
          <div class="panel p-6">
            <h2 class="section-title">${t('settings.dataManagement')}</h2>

            <div class="mt-5 space-y-3">
              <button
                class="btn-ghost w-full justify-between"
                type="button"
                data-export
              >
                ${t('settings.exportData')} <span>${t('settings.json')}</span>
              </button>

              <label
                class="btn-ghost flex w-full cursor-pointer justify-between"
                for="import-data"
              >
                ${t('settings.importData')} <span>${t('settings.upload')}</span>
              </label>

              <input
                id="import-data"
                class="hidden"
                type="file"
                accept="application/json"
              />

              <button
                class="btn-secondary w-full justify-between"
                type="button"
                data-clear
              >
                ${t('settings.reloadData')} <span>${t('settings.reset')}</span>
              </button>
            </div>
          </div>

          <div class="panel p-6">
            <h2 class="section-title">${t('settings.notes')}</h2>
            <p class="mt-4 text-sm text-slate-500">
              ${t('settings.notesBody')}
            </p>
          </div>
        </div>
      </div>
    </div>`

  /**
   * Saves stable and display settings submitted through the settings form.
   *
   * @param {SubmitEvent} event - Settings form submission event.
   * @returns {void}
   */
  const handleSettingsSubmit = (event) => {
    event.preventDefault()

    const form = /** @type {HTMLFormElement} */ (event.currentTarget)

    /** @type {Record<string, FormDataEntryValue | boolean>} */
    const payload = Object.fromEntries(new FormData(form).entries())

    payload.compactMode = form.elements.namedItem('compactMode').checked

    // Language is a per-device preference, not part of the stable's synced
    // settings, so it's handled separately from upsertSettings().
    const selectedLanguage = payload.language
    delete payload.language
    const languageChanged = selectedLanguage !== language

    upsertSettings(payload)
    if (languageChanged) setLanguage(selectedLanguage)
    notify(t('settings.savedToast'), 'success')
    // The app has no reactive re-render system, so a reload is the simplest
    // reliable way to apply a language switch across every already-rendered
    // screen without risking half-translated leftover DOM state.
    if (languageChanged) window.location.reload()
  }

  /**
   * Creates and downloads a JSON export of the application data.
   *
   * @returns {void}
   */
  const handleExport = () => {
    const content = JSON.stringify(exportData(), null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'stable-manager-export.json'
    link.click()

    URL.revokeObjectURL(url)
    notify(t('settings.exportedToast'), 'success')
  }

  /**
   * Imports application data from a selected JSON file.
   *
   * @async
   * @param {Event} event - File input change event.
   * @returns {Promise<void>}
   */
  const handleImport = async (event) => {
    const input = /** @type {HTMLInputElement} */ (event.currentTarget)
    const file = input.files?.[0]

    if (!file) return

    const payload = JSON.parse(await file.text())

    await importData(payload)
    notify(t('settings.importedToast'), 'success')
    render(container)
  }

  /**
   * Confirms the reset operation, clears the local cache, and reloads the
   * latest stable data from Supabase.
   *
   * @async
   * @returns {Promise<void>}
   */
  const handleReload = async () => {
    const confirmed = await confirmDialog({
      title: t('settings.reloadConfirmTitle'),
      message: t('settings.reloadConfirmMessage'),
      confirmText: t('settings.reloadConfirmButton'),
    })

    if (!confirmed) return

    await resetData()
    notify(t('settings.reloadedToast'), 'success')
    render(container)
  }

  container.querySelector('#settings-form').addEventListener('submit', handleSettingsSubmit)

  container.querySelector('[data-export]').addEventListener('click', handleExport)

  container.querySelector('#import-data').addEventListener('change', handleImport)

  container.querySelector('[data-clear]').addEventListener('click', handleReload)
}
