import axios from 'axios'

/**
 * API routes are mounted at `/api` on the backend.
 * Collapse accidental `.../api/api` and ensure a single `/api` suffix when using an absolute base.
 */
function normalizeAbsoluteBase(raw) {
  let u = raw.replace(/\/+$/, '')
  if (!u.toLowerCase().endsWith('/api')) {
    u = `${u}/api`
  }
  while (u.includes('/api/api')) {
    u = u.replace('/api/api', '/api')
  }
  return u
}

function resolveApiBaseURL() {
  // Local `vite` dev: always same-origin `/api` so the dev proxy forwards to the backend.
  // A bad VITE_API_URL (wrong host, double /api, etc.) is a common cause of 404 on profile save.
  if (import.meta.env.DEV) {
    const force = import.meta.env.VITE_FORCE_API_URL?.trim()
    if (force) {
      return normalizeAbsoluteBase(force)
    }
    return '/api'
  }

  const raw = import.meta.env.VITE_API_URL?.trim()
  if (raw) {
    if (raw.startsWith('/')) {
      if (typeof window !== 'undefined') {
        return normalizeAbsoluteBase(`${window.location.origin}${raw}`)
      }
      return normalizeAbsoluteBase(raw)
    }
    return normalizeAbsoluteBase(raw)
  }
  return 'http://localhost:5000/api'
}

const baseURL = resolveApiBaseURL()

const api = axios.create({
  baseURL,
  withCredentials: true,
})

export default api
export { baseURL as resolvedApiBaseURL }
