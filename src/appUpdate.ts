/*
 * A page opened before a deploy keeps running the old build, whose lazily loaded modules (PDF reader, OCR) may be
 * gone from the server or the service worker cache. Loading one then fails with "Importing a module script failed"
 * (Safari) or "Failed to fetch dynamically imported module" (Chrome). The page reloads into the new build once, and
 * the app then asks to pick the file again.
 */
const RELOADED_KEY = 'ling-reloaded-for-update'
const NOTICE_KEY = 'ling-update-notice-shown'

function storage(): Storage | null {
  try {
    return sessionStorage
  } catch {
    return null
  }
}

export function reloadOnStaleModules() {
  window.addEventListener('vite:preloadError', (event) => {
    const store = storage()
    // Reloading again within a minute would loop if the module is missing from the new build as well.
    const last = Number(store?.getItem(RELOADED_KEY) ?? 0)
    if (!store || Date.now() - last < 60_000) return
    store.setItem(RELOADED_KEY, String(Date.now()))
    event.preventDefault()
    window.location.reload()
  })
}

/** True once after the page reloaded into a new build. */
export function takeReloadedForUpdate(): boolean {
  const store = storage()
  const reloaded = store?.getItem(RELOADED_KEY)
  if (!store || !reloaded || Date.now() - Number(reloaded) > 60_000 || store.getItem(NOTICE_KEY) === reloaded) return false
  store.setItem(NOTICE_KEY, reloaded)
  return true
}
