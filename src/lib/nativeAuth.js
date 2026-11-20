/**
 * Android app: finish Google sign-in when the system browser returns via chartmasters://auth?code=...
 * Web builds never use this.
 */
import { isNativeApp, NATIVE_AUTH_REDIRECT, userAuth } from './supabase'

let handling = false

async function handleAuthUrl(url) {
  if (!url || !url.startsWith(NATIVE_AUTH_REDIRECT) || handling) return
  handling = true
  try {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.close()
    } catch { /* the Custom Tab may already be closed */ }

    const parsed = new URL(url.replace(NATIVE_AUTH_REDIRECT, 'https://app.invalid/auth'))
    const params = parsed.searchParams
    const authError = params.get('error_description') || params.get('error')
    if (authError) {
      window.location.replace('/login?error_description=' + encodeURIComponent(authError))
      return
    }
    const code = params.get('code')
    if (!code) return
    await userAuth.completeGoogleSignIn(code)
    window.location.replace(userAuth.consumeNext() || '/dashboard')
  } catch (error) {
    window.location.replace('/login?error_description=' + encodeURIComponent(error.message || 'ورود با گوگل انجام نشد.'))
  } finally {
    handling = false
  }
}

/** Register the deep-link listener once at app start. Returns a cleanup function. */
export async function initNativeAuthListener() {
  if (!isNativeApp()) return () => {}
  const { App } = await import('@capacitor/app')
  const launch = await App.getLaunchUrl().catch(() => null)
  if (launch?.url) handleAuthUrl(launch.url)
  const handle = await App.addListener('appUrlOpen', (event) => handleAuthUrl(event.url))
  return () => handle.remove()
}
