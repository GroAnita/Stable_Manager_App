import { Badge } from '../components/Badge.js'
import { confirmDialog } from '../components/ConfirmDialog.js'
import { notify } from '../components/Notification.js'
import { deleteHorseCascade, getHorseBundle } from '../services/dataService.js'
import { escapeHtml, formatDate, horseAvatarHtml } from '../utils/helpers.js'
import { icon } from '../utils/icons.js'
import { t } from '../i18n/index.js'
import { navigate } from '../router/index.js'

export function render(container, params) {
  const bundle = getHorseBundle(params.id)
  if (!bundle)
    return void (container.innerHTML = `<div class="panel p-8 text-center text-slate-500">${t('horseDetail.notFound')}</div>`)
  let activeTab = 'overview'
  const tabs = ['overview', 'medical', 'feeding', 'documents', 'schedule', 'notes']
  const tabLabels = {
    overview: t('horseDetail.tabOverview'),
    medical: t('horseDetail.tabMedical'),
    feeding: t('horseDetail.tabFeeding'),
    documents: t('horseDetail.tabDocuments'),
    schedule: t('horseDetail.tabSchedule'),
    notes: t('horseDetail.tabNotes'),
  }
  const documents = [
    { label: t('horseDetail.docPassport'), detail: bundle.horse.passportNumber },
    { label: t('horseDetail.docInsurance'), detail: bundle.horse.insurance },
    { label: t('horseDetail.docMicrochip'), detail: bundle.horse.microchipNumber },
  ]

  const draw = () => {
    container.innerHTML = `
      <div class="page-shell">
        <div class="page-header"><div class="flex items-center gap-4">${horseAvatarHtml(bundle.horse, 'h-20 w-20 rounded-[1.5rem] text-3xl')}<div><p class="text-sm uppercase tracking-[0.25em] text-slate-400">${t('horseDetail.profile')}</p><h1 class="mt-2 text-3xl font-semibold text-slate-900">${escapeHtml(bundle.horse.name)}</h1><p class="mt-2 text-sm text-slate-500">${escapeHtml(bundle.horse.breed)} · ${escapeHtml(bundle.horse.gender)} · ${escapeHtml(bundle.horse.color)}</p></div></div><div class="flex flex-wrap gap-3"><button class="btn-ghost" data-edit>${icon('edit', 'h-4 w-4')}${t('horseDetail.edit')}</button><button class="btn-secondary" data-delete>${icon('trash', 'h-4 w-4')}${t('horseDetail.deleteHorse')}</button></div></div>
        <div class="flex flex-wrap gap-2">${tabs.map((tab) => `<button class="${tab === activeTab ? 'bg-forest text-white' : 'bg-white text-slate-600'} rounded-xl px-4 py-2 text-sm font-medium" data-tab="${tab}">${tabLabels[tab]}</button>`).join('')}</div>
        <div class="panel p-6">${activeTab === 'overview' ? `<div class="grid gap-6 lg:grid-cols-2"><div class="space-y-4"><div class="grid grid-cols-2 gap-4 text-sm"><div><p class="text-slate-400">${t('horseDetail.age')}</p><p class="font-medium text-slate-800">${bundle.horse.age} ${t('horseDetail.years')}</p></div><div><p class="text-slate-400">${t('horseDetail.birthday')}</p><p class="font-medium text-slate-800">${formatDate(bundle.horse.birthday)}</p></div><div><p class="text-slate-400">${t('horseDetail.passport')}</p><p class="font-medium text-slate-800">${escapeHtml(bundle.horse.passportNumber)}</p></div><div><p class="text-slate-400">${t('horseDetail.microchip')}</p><p class="font-medium text-slate-800">${escapeHtml(bundle.horse.microchipNumber)}</p></div></div><div class="rounded-2xl bg-slate-50 p-4"><p class="text-sm text-slate-400">${t('horseDetail.owner')}</p><p class="mt-1 font-medium text-slate-900">${bundle.owner?.name ? escapeHtml(bundle.owner.name) : '—'}</p><p class="text-sm text-slate-500">${escapeHtml(bundle.owner?.phone || '')}</p></div><div class="rounded-2xl bg-slate-50 p-4"><p class="text-sm text-slate-400">${t('horseDetail.stallAssignment')}</p><p class="mt-1 font-medium text-slate-900">${t('horseList.stall')} ${escapeHtml(bundle.stall?.number || '—')} · ${escapeHtml(bundle.stall?.size || '—')}</p><p class="text-sm text-slate-500">${escapeHtml(bundle.stall?.notes || t('horseDetail.noStallNotes'))}</p></div></div><div class="space-y-4"><div><p class="text-sm text-slate-400">${t('horseDetail.vaccinationStatus')}</p><div class="mt-2">${Badge(bundle.horse.vaccinationStatus)}</div></div><div><p class="text-sm text-slate-400">${t('horseDetail.insurance')}</p><p class="mt-1 text-slate-700">${escapeHtml(bundle.horse.insurance)}</p></div><div><p class="text-sm text-slate-400">${t('horseDetail.allergies')}</p><p class="mt-1 text-slate-700">${escapeHtml(bundle.horse.allergies || t('horseDetail.noneNoted'))}</p></div><div><p class="text-sm text-slate-400">${t('horseDetail.medicalNotes')}</p><p class="mt-1 text-slate-700">${escapeHtml(bundle.horse.medicalNotes || t('horseDetail.noMedicalNotes'))}</p></div></div></div>` : activeTab === 'medical' ? `<div class="space-y-4">${bundle.medicalRecords.map((record) => `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><p class="min-w-0 break-words font-medium text-slate-900">${record.type}</p>${Badge(record.type)}</div><p class="mt-2 text-sm text-slate-500">${record.notes}</p><p class="mt-3 text-sm text-slate-500">${formatDate(record.date)} · ${t('horseDetail.nextDue')} ${formatDate(record.nextDueDate)} · ${record.vet}</p></div>`).join('')}</div>` : activeTab === 'feeding' ? `<div class="grid gap-4 md:grid-cols-3">${['morning', 'lunch', 'evening'].map((period) => `<div class="rounded-2xl bg-slate-50 p-4"><h3 class="font-semibold text-slate-900">${t(`horseDetail.${period}`)}</h3><p class="mt-3 text-sm text-slate-500">${t('horseDetail.hay')}: ${bundle.feedingPlan?.[period]?.hay || '—'}</p><p class="text-sm text-slate-500">${t('horseDetail.grain')}: ${bundle.feedingPlan?.[period]?.grain || '—'}</p><p class="text-sm text-slate-500">${t('horseDetail.supplements')}: ${bundle.feedingPlan?.[period]?.supplements || '—'}</p></div>`).join('')}<div class="md:col-span-3 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">${bundle.feedingPlan?.specialInstructions || t('horseDetail.noSpecialFeeding')}</div></div>` : activeTab === 'documents' ? `<div class="space-y-3">${documents.map((doc) => `<div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-4 py-3"><div class="min-w-0"><p class="break-words font-medium text-slate-900">${doc.label}</p><p class="text-sm text-slate-500">${doc.detail}</p></div><span class="shrink-0 text-sm text-slate-400">${t('horseDetail.storedLocally')}</span></div>`).join('')}</div>` : activeTab === 'schedule' ? `<div class="space-y-3">${bundle.events.length ? bundle.events.map((event) => `<div class="rounded-2xl bg-slate-50 px-4 py-3"><div class="flex flex-wrap items-center justify-between gap-2"><p class="min-w-0 break-words font-medium text-slate-900">${event.title}</p>${Badge(event.type)}</div><p class="mt-2 text-sm text-slate-500">${formatDate(event.date)} at ${event.time}</p><p class="mt-1 text-sm text-slate-500">${event.notes}</p></div>`).join('') : `<p class="text-sm text-slate-500">${t('horseDetail.noAppointments')}</p>`}</div>` : `<div class="space-y-4"><div class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">${bundle.horse.notes || t('horseDetail.noFreeformNotes')}</div><p class="text-sm text-slate-500">${t('horseDetail.editTip')}</p></div>`}</div>
      </div>`
    container.querySelectorAll('[data-tab]').forEach((button) =>
      button.addEventListener('click', () => {
        activeTab = button.getAttribute('data-tab')
        draw()
      }),
    )
    container
      .querySelector('[data-edit]')
      .addEventListener('click', () => navigate(`/horses/${bundle.horse.id}/edit`))
    container.querySelector('[data-delete]').addEventListener('click', async () => {
      if (
        !(await confirmDialog({
          title: t('horseDetail.deleteConfirmTitle'),
          message: t('horseDetail.deleteConfirmMessage', { name: bundle.horse.name }),
          confirmText: t('horseDetail.deleteConfirmButton'),
        }))
      )
        return
      deleteHorseCascade(bundle.horse.id)
      notify(t('horseDetail.removedToast', { name: bundle.horse.name }), 'success')
      navigate('/horses')
    })
  }
  draw()
}
