import { signIn, signUp } from '../services/authService.js'
import { t } from '../i18n/index.js'

export function renderAuth(container, { onAuthenticated }) {
  let mode = 'login'
  let submitting = false
  let errorMessage = ''
  let infoMessage = ''

  const draw = () => {
    container.innerHTML = `
      <div class="flex min-h-screen items-center justify-center bg-cream px-4">
        <div class="w-full max-w-md">
          <div class="mb-8 text-center">
            <div class="flex items-center justify-center gap-2"><img src="${import.meta.env.BASE_URL}ND-Iconedited.png" alt="" class="h-6 w-6 rounded-md" /><p class="text-xs uppercase tracking-[0.3em] text-slate-400">${t('auth.tagline')}</p></div>
            <h1 class="mt-2 text-3xl font-semibold text-forest">${mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}</h1>
            <p class="mt-2 text-sm text-slate-500">${mode === 'login' ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}</p>
          </div>
          <form id="auth-form" class="panel space-y-4 p-6">
            ${mode === 'signup' ? `<label><span class="field-label">${t('auth.fullName')}</span><input class="field" name="fullName" type="text" required /></label>` : ''}
            <label><span class="field-label">${t('auth.email')}</span><input class="field" name="email" type="email" required /></label>
            <label><span class="field-label">${t('auth.password')}</span><input class="field" name="password" type="password" minlength="6" required /></label>
            ${infoMessage ? `<p class="text-sm text-emerald-700">${infoMessage}</p>` : ''}
            ${errorMessage ? `<p class="text-sm text-red-600">${errorMessage}</p>` : ''}
            <button type="submit" class="btn-primary w-full" ${submitting ? 'disabled' : ''}>${submitting ? t('auth.pleaseWait') : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}</button>
          </form>
          <p class="mt-4 text-center text-sm text-slate-500">
            ${mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}
            <button type="button" class="font-medium text-forest hover:underline" data-toggle-mode>${mode === 'login' ? t('auth.signUp') : t('auth.signIn')}</button>
          </p>
        </div>
      </div>`

    container.querySelector('[data-toggle-mode]').addEventListener('click', () => {
      mode = mode === 'login' ? 'signup' : 'login'
      errorMessage = ''
      infoMessage = ''
      draw()
    })

    container.querySelector('#auth-form').addEventListener('submit', async (event) => {
      event.preventDefault()
      const payload = Object.fromEntries(new FormData(event.target).entries())
      submitting = true
      errorMessage = ''
      infoMessage = ''
      draw()
      try {
        if (mode === 'login') {
          await signIn({ email: payload.email, password: payload.password })
          onAuthenticated()
        } else {
          const result = await signUp({
            email: payload.email,
            password: payload.password,
            fullName: payload.fullName,
          })
          if (result.session) {
            onAuthenticated()
          } else {
            submitting = false
            infoMessage = t('auth.confirmEmail')
            mode = 'login'
            draw()
          }
        }
      } catch (error) {
        submitting = false
        errorMessage = error.message || t('auth.genericError')
        draw()
      }
    })
  }

  draw()
}
