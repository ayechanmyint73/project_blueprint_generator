const TOKEN_KEY = 'bg_token'
const USER_KEY = 'bg_user'

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

export function setAuthSession({ token, user, remember = true }) {
  const storage = remember ? localStorage : sessionStorage
  clearAuthSession()
  if (token) storage.setItem(TOKEN_KEY, token)
  if (user) storage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
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
