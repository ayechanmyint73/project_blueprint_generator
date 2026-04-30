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
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearAuthSession()
    }
    return Promise.reject(err)
  },
)

