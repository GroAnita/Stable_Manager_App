import './styles/main.css'
import { initApp } from './layouts/AppLayout.js'
import { renderAuth } from './views/Auth.js'
import { renderOnboarding } from './views/Onboarding.js'
import { renderOwnerDashboard } from './views/OwnerDashboard.js'
import { getSession, getMyProfile } from './services/authService.js'
import { loadStableContext } from './services/stableContext.js'
import { initData } from './services/dataService.js'

/**
 * Initializes the application and determines which interface to display.
 *
 * The bootstrap sequence:
 * 1. Retrieves the current authentication session.
 * 2. Displays the authentication view when no session exists.
 * 3. Retrieves the authenticated user's profile.
 * 4. Displays onboarding when the user is not connected to a stable.
 * 5. Loads the active stable context, then initializes either the full
 *    admin app (staff) or the single-page horse-owner dashboard, based on
 *    the profile's role.
 *
 * Authentication and onboarding can call this function again after their
 * respective processes complete.
 *
 * @async
 * @returns {Promise<void>} Resolves after the appropriate view is rendered.
 */
async function bootstrap() {
  //bootstrap is just a function name that is often used in programming to refer to the process of initializing or starting up an application or system. In this context, it is used to initialize the application by checking the user's authentication status and rendering the appropriate views based on that status.
  const app = document.getElementById('app')
  const session = await getSession()

  if (!session) {
    renderAuth(app, { onAuthenticated: bootstrap })
    return
  }

  const profile = await getMyProfile()

  if (!profile?.stable_id) {
    renderOnboarding(app, { onStableCreated: bootstrap })
    return
  }

  await loadStableContext()

  if (profile.role === 'horse_owner') {
    // Horse owners get a single, self-contained dashboard page rather than
    // the full admin shell (sidebar, router, every section) — RLS already
    // scopes everything initData() pulls down to just their own data.
    await initData()
    renderOwnerDashboard(app)
    return
  }

  await initApp()
}

bootstrap()
