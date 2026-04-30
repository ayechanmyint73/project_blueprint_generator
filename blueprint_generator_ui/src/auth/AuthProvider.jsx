import { useCallback, useEffect, useMemo, useState } from 'react'
import { http } from '../api/http'
import { clearAuthSession, getAuthToken, getStoredUser, setAuthSession } from './session'
import { AuthContext } from './context'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken())
  const [user, setUser] = useState(() => getStoredUser())
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const res = await http.get('/api/profile')
    setUser(res.data)
    setAuthSession({ user: res.data })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        if (!getAuthToken()) return
        await refreshProfile()
      } catch {
        clearAuthSession()
        setToken(null)
        setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [refreshProfile])

  const login = useCallback(async ({ email, password, remember }) => {
    const res = await http.post('/api/login', { email, password })
    setAuthSession({ token: res.data?.token, user: res.data?.user, remember })
    setToken(res.data?.token ?? null)
    setUser(res.data?.user ?? null)
    return res.data
  }, [])

  const register = useCallback(async ({ name, email, password, remember }) => {
    const res = await http.post('/api/register', { name, email, password })
    setAuthSession({ token: res.data?.token, user: res.data?.user, remember })
    setToken(res.data?.token ?? null)
    setUser(res.data?.user ?? null)
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await http.post('/api/logout')
    } finally {
      clearAuthSession()
      setToken(null)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, refreshProfile }),
    [token, user, loading, login, register, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
