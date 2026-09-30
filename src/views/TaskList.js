import { Badge } from '../components/Badge.js'
import { EmptyState } from '../components/EmptyState.js'
import { openModal } from '../components/Modal.jsx'
import { notify } from '../components/Notification.jsx'
import { createRecord, getAll, updateRecord } from '../services/dataService.js'
import { escapeHtml, formatDate } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'

/**
 * Supported task priority values.
 *
 * @typedef {'high' | 'medium' | 'low'} TaskPriority
 */

/**
 * Represents a stable-management task.
 *
 * @typedef {Object} Task
 * @property {string} id - Unique task identifier.
 * @property {string} title - Short description of the task.
 * @property {string} type - Category used to group the task.
 * @property {TaskPriority} priority - Importance of the task.
 * @property {string} assignedTo - Person responsible for completing the task.
 * @property {string} date - Due date in `YYYY-MM-DD` format.
 * @property {string} dueTime - Due time in `HH:mm` format.
 * @property {string} notes - Additional task instructions.
 * @property {boolean} completed - Whether the task has been completed.
 * @property {string} [horseId] - Optional associated horse identifier.
 */

/**
 * Renders the task-management view inside the supplied container.
 *
 * The view provides:
 * - Priority and completion-status filters.
 * - Tasks grouped by category.
 * - Task creation through a modal form.
 * - Completion-status toggling.
 *
 * Calling this function replaces the container's existing content.
 *
 * @param {HTMLElement} container - Element in which the task view is rendered.
 * @returns {void}
 */
export function render(container) {
  /** @type {'all' | TaskPriority} */
  let priorityFilter = 'all'
  /** @type {'all' | 'true' | 'false'} */
  let statusFilter = 'all'

  /**
   * Reads the current tasks, applies filters, and redraws the view.
   *
   * Event listeners are recreated after every draw because replacing
   * `container.innerHTML` removes the previous elements and listeners.
   *
   * @returns {void}
   */
  const draw = () => {
    /** @type {Task[]} */
    const tasks = getAll('tasks')
      .filter(
        (task) =>
          (priorityFilter === 'all' || task.priority === priorityFilter) &&
          (statusFilter === 'all' || String(task.completed) === statusFilter),
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a.dueTime.localeCompare(b.dueTime))

    /** @type {Record<string, Task[]>} */
    const grouped = tasks.reduce((acc, task) => ((acc[task.type] ||= []).push(task), acc), {})
    container.innerHTML = `<div class="page-shell"><div class="page-header"><div><h1 class="text-3xl font-semibold text-slate-900">${t('taskList.title')}</h1><p class="mt-2 text-sm text-slate-500">${t('taskList.subtitle')}</p></div><button class="btn-primary" data-add-task>${icon('plus', 'h-4 w-4')}${t('taskList.addTask')}</button></div><div class="panel p-4"><div class="grid gap-3 md:grid-cols-2"><select class="field" data-priority-filter>${['all', 'high', 'medium', 'low'].map((value) => `<option value="${value}" ${priorityFilter === value ? 'selected' : ''}>${value === 'all' ? t('taskList.allPriorities') : t(`status.${value}`)}</option>`).join('')}</select><select class="field" data-status-filter><option value="all" ${statusFilter === 'all' ? 'selected' : ''}>${t('taskList.allTasks')}</option><option value="false" ${statusFilter === 'false' ? 'selected' : ''}>${t('taskList.incomplete')}</option><option value="true" ${statusFilter === 'true' ? 'selected' : ''}>${t('taskList.completed')}</option></select></div></div>${
      tasks.length
        ? `<div class="space-y-6">${Object.entries(grouped)
            .map(
              ([group, items]) =>
                `<section class="panel p-5"><div class="mb-4 flex items-center justify-between"><h2 class="section-title">${escapeHtml(group)}</h2><span class="text-sm text-slate-400">${t('taskList.tasksCount', { count: items.length })}</span></div><div class="space-y-3">${items.map((task) => `<div class="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div class="flex items-start gap-3"><button class="mt-1 flex h-5 w-5 items-center justify-center rounded border ${task.completed ? 'border-forest bg-forest text-white' : 'border-slate-300'}" data-task-toggle="${task.id}">${task.completed ? '✓' : ''}</button><div><p class="font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}">${escapeHtml(task.title)}</p><p class="mt-1 text-sm text-slate-500">${formatDate(task.date)} · ${escapeHtml(task.dueTime)} · ${escapeHtml(task.assignedTo)}</p><p class="mt-1 text-sm text-slate-500">${escapeHtml(task.notes)}</p></div></div><div class="flex items-center gap-2">${Badge(task.priority)}${Badge(task.completed ? 'completed' : 'scheduled', task.completed ? t('taskList.completed') : t('taskList.open'))}</div></div>`).join('')}</div></section>`,
            )
            .join('')}</div>`
        : EmptyState({
            icon: '✅',
            title: t('taskList.noTasksTitle'),
            message: t('taskList.noTasksMessage'),
          })
    }</div>`
    container.querySelector('[data-add-task]').addEventListener('click', () => {
      const modal = openModal({
        title: t('taskList.addModalTitle'),
        width: 'max-w-lg',
        body: `<form id="task-form" class="grid gap-4"><label><span class="field-label">${t('taskList.taskTitle')}</span><input class="field" name="title" required /></label><label><span class="field-label">${t('taskList.category')}</span><input class="field" name="type" required placeholder="${t('taskList.categoryPlaceholder')}" /></label><label><span class="field-label">${t('taskList.priority')}</span><select class="field" name="priority">${['high', 'medium', 'low'].map((value) => `<option value="${value}">${t(`status.${value}`)}</option>`).join('')}</select></label><label><span class="field-label">${t('taskList.assignedTo')}</span><input class="field" name="assignedTo" required /></label><label><span class="field-label">${t('taskList.date')}</span><input class="field" name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}" /></label><label><span class="field-label">${t('taskList.dueTime')}</span><input class="field" name="dueTime" type="time" required /></label><label><span class="field-label">${t('taskList.notes')}</span><textarea class="field min-h-24" name="notes"></textarea></label><button class="btn-primary" type="submit">${t('taskList.save')}</button></form>`,
      })
      modal.element.querySelector('#task-form').addEventListener('submit', (event) => {
        event.preventDefault()
        createRecord('tasks', {
          ...Object.fromEntries(new FormData(event.target).entries()),
          completed: false,
        })
        modal.close()
        notify(t('taskList.createdToast'), 'success')
        draw()
      })
    })
    container.querySelector('[data-priority-filter]').addEventListener('change', (event) => {
      priorityFilter = event.target.value
      draw()
    })
    container.querySelector('[data-status-filter]').addEventListener('change', (event) => {
      statusFilter = event.target.value
      draw()
    })
    container.querySelectorAll('[data-task-toggle]').forEach((button) =>
      button.addEventListener('click', () => {
        const task = tasks.find((item) => item.id === button.getAttribute('data-task-toggle'))
        updateRecord('tasks', task.id, { completed: !task.completed })
        draw()
      }),
    )
  }
  draw()
}

/** One important compatibility note: if you change createRecord() and updateRecord() to database-first asynchronous functions, the submit and toggle handlers in this view must become async and use await; otherwise the modal will report success before Supabase confirms the operation. */
