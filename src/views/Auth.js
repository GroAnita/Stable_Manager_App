import { signIn, signUp } from '../services/authService.js'

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
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Stable Manager</p>
            <h1 class="mt-2 text-3xl font-semibold text-forest">${mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
            <p class="mt-2 text-sm text-slate-500">${mode === 'login' ? 'Sign in to manage your stable.' : 'Set up your account to get started.'}</p>
          </div>
          <form id="auth-form" class="panel space-y-4 p-6">
            ${mode === 'signup' ? '<label><span class="field-label">Full name</span><input class="field" name="fullName" type="text" required /></label>' : ''}
            <label><span class="field-label">Email</span><input class="field" name="email" type="email" required /></label>
            <label><span class="field-label">Password</span><input class="field" name="password" type="password" minlength="6" required /></label>
            ${infoMessage ? `<p class="text-sm text-emerald-700">${infoMessage}</p>` : ''}
            ${errorMessage ? `<p class="text-sm text-red-600">${errorMessage}</p>` : ''}
            <button type="submit" class="btn-primary w-full" ${submitting ? 'disabled' : ''}>${submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}</button>
          </form>
          <p class="mt-4 text-center text-sm text-slate-500">
            ${mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" class="font-medium text-forest hover:underline" data-toggle-mode>${mode === 'login' ? 'Sign up' : 'Sign in'}</button>
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
            infoMessage = 'Check your email to confirm your account, then sign in.'
            mode = 'login'
            draw()
          }
        }
      } catch (error) {
        submitting = false
        errorMessage = error.message || 'Something went wrong. Please try again.'
        draw()
      }
    })
  }

  draw()
}
