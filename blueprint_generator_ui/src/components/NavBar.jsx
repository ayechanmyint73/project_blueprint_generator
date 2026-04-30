import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function NavBar() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="nav">
      <Link className="brand" to="/">
        <img className="brand-logo" src="/logo.png" alt="Project Blueprint Generator" />
        <span>Project Blueprint Generator</span>
      </Link>
      <nav className="navlinks">
        {token ? (
          <>
            <NavLink
              to="/projects"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              Projects
            </NavLink>
            <NavLink
              to="/projects/new"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              New
            </NavLink>
            <button type="button" className="link" onClick={onLogout}>
              Logout
            </button>
            <span className="whoami">{user?.email}</span>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Login
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Register
            </NavLink>
          </>
        )}
      </nav>
    </header>
  )
}
