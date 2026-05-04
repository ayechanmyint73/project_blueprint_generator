const TOKEN_KEY = 'bg_token'
const USER_KEY = 'bg_user'
const GUEST_TOKEN_KEY = 'bg_guest_token'
const IS_GUEST_KEY = 'bg_is_guest'

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

export function getGuestToken() {
  return localStorage.getItem(GUEST_TOKEN_KEY) ?? sessionStorage.getItem(GUEST_TOKEN_KEY)
}

export function isGuestSession() {
  return (localStorage.getItem(IS_GUEST_KEY) ?? sessionStorage.getItem(IS_GUEST_KEY)) === 'true'
}

export function setAuthSession({ token, user, remember = true }) {
  const storage = remember ? localStorage : sessionStorage

  // Only clear when switching tokens/session type.
  // This prevents wiping the token when we only want to refresh stored user data.
  if (token) {
    clearAuthSession()
    storage.setItem(TOKEN_KEY, token)
  }

  if (user) storage.setItem(USER_KEY, JSON.stringify(user))
}

export function setGuestSession({ guestToken, remember = true }) {
  const storage = remember ? localStorage : sessionStorage
  clearAuthSession()
  if (guestToken) storage.setItem(GUEST_TOKEN_KEY, guestToken)
  storage.setItem(IS_GUEST_KEY, 'true')
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(GUEST_TOKEN_KEY)
  localStorage.removeItem(IS_GUEST_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(GUEST_TOKEN_KEY)
  sessionStorage.removeItem(IS_GUEST_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
