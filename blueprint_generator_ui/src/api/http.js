import axios from 'axios'
import { getAuthToken, clearAuthSession } from '../auth/session'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const http = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers = config.headers ?? {}
    const value = `Bearer ${token}`
    // Axios v1 may use AxiosHeaders; prefer .set when available.
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', value)
    } else {
      config.headers.Authorization = value
    }
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const msg = err?.response?.data?.message
      // Only clear local auth when Laravel Sanctum rejects the token/session.
      // Do not clear for other 401s (e.g., upstream provider errors).
      if (getAuthToken() && (msg === 'Unauthenticated.' || msg === 'Unauthenticated')) {
        clearAuthSession()
      }
    }
    return Promise.reject(err)
  },
)
