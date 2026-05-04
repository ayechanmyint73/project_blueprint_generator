import { useCallback, useEffect, useMemo, useState } from 'react'
import { http } from '../api/http'
import {
  clearAuthSession,
  getAuthToken,
  getStoredUser,
  setAuthSession,
} from './session'
import { AuthContext } from './context'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken())
  const [user, setUser] = useState(() => getStoredUser())
  const [isGuest, setIsGuest] = useState(() => (getStoredUser()?.role ?? null) === 'guest')
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const currentToken = getAuthToken()
    if (!currentToken) throw new Error('Missing auth token')
    const res = await http.get('/api/profile')
    setUser(res.data)
    setAuthSession({ token: currentToken, user: res.data })
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
        setIsGuest(false)
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
    setIsGuest((res.data?.user?.role ?? null) === 'guest')
    return res.data
  }, [])

  const guestLogin = useCallback(async ({ remember = true } = {}) => {
    const res = await http.post('/api/guest/login', {})
    const tokenValue = res.data?.token ?? null
    if (!tokenValue) throw new Error('Guest login failed: missing token')
    setAuthSession({ token: tokenValue, user: res.data?.user ?? null, remember })
    setToken(tokenValue)
    setUser(res.data?.user ?? null)
    setIsGuest(true)
    return res.data
  }, [])

  const register = useCallback(async ({ name, email, password, remember }) => {
    const res = await http.post('/api/register', { name, email, password })
    setAuthSession({ token: res.data?.token, user: res.data?.user, remember })
    setToken(res.data?.token ?? null)
    setUser(res.data?.user ?? null)
    setIsGuest((res.data?.user?.role ?? null) === 'guest')
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await http.post('/api/logout')
    } finally {
      clearAuthSession()
      setToken(null)
      setIsGuest(false)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      token,
      isGuest,
      user,
      loading,
      login,
      guestLogin,
      register,
      logout,
      refreshProfile,
    }),
    [token, isGuest, user, loading, login, guestLogin, register, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
