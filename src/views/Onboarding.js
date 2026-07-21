import { createStable, signOut } from '../services/authService.js'

export function renderOnboarding(container, { onStableCreated }) {
  let submitting = false
  let errorMessage = ''

  const draw = () => {
    container.innerHTML = `
      <div class="flex min-h-screen items-center justify-center bg-cream px-4">
        <div class="w-full max-w-lg">
          <div class="mb-8 text-center">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Stable Manager</p>
            <h1 class="mt-2 text-3xl font-semibold text-forest">Set up your stable</h1>
            <p class="mt-2 text-sm text-slate-500">Tell us about your stable to get started. You can update this later in Settings.</p>
          </div>
          <form id="onboarding-form" class="panel space-y-4 p-6">
            <label><span class="field-label">Stable name</span><input class="field" name="name" type="text" required /></label>
            <label><span class="field-label">Address</span><input class="field" name="address" type="text" /></label>
            <div class="grid grid-cols-2 gap-4">
              <label><span class="field-label">City</span><input class="field" name="city" type="text" /></label>
              <label><span class="field-label">Postal code</span><input class="field" name="postalCode" type="text" /></label>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <label><span class="field-label">Phone</span><input class="field" name="phone" type="tel" /></label>
              <label><span class="field-label">Email</span><input class="field" name="email" type="email" /></label>
            </div>
            ${errorMessage ? `<p class="text-sm text-red-600">${errorMessage}</p>` : ''}
            <button type="submit" class="btn-primary w-full" ${submitting ? 'disabled' : ''}>${submitting ? 'Creating…' : 'Create stable'}</button>
          </form>
          <p class="mt-4 text-center text-sm text-slate-500">
            Wrong account? <button type="button" class="font-medium text-forest hover:underline" data-sign-out>Sign out</button>
          </p>
        </div>
      </div>`

    container.querySelector('[data-sign-out]').addEventListener('click', async () => {
      await signOut()
      window.location.reload()
    })

    container.querySelector('#onboarding-form').addEventListener('submit', async (event) => {
      event.preventDefault()
      const payload = Object.fromEntries(new FormData(event.target).entries())
      submitting = true
      errorMessage = ''
      draw()
      try {
        await createStable(payload)
        onStableCreated()
      } catch (error) {
        submitting = false
        errorMessage = error.message || 'Something went wrong. Please try again.'
        draw()
      }
    })
  }

  draw()
}
