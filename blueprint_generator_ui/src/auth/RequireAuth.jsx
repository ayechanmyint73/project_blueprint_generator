import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import LoadingSpinner from '../components/LoadingSpinner'

export default function RequireAuth() {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner />

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
