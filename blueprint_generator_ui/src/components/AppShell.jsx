import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const projectId = params.id
  const onProjectDetail = Boolean(projectId) && location.pathname.startsWith(`/projects/${projectId}`)

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-mark">
            <img className="sidebar-logo" src="/logo.png" alt="" />
          </div>
          <div>
            <div className="sidebar-title">Blueprint Generator</div>
          </div>
        </div>

        <div className="sidebar-section">Menu</div>
        <nav className="sidebar-nav">
          <NavLink to="/projects" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink
            to="/projects/new"
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
          >
            New Project
          </NavLink>
        </nav>

        <div className="sidebar-section">
          Project views <span className="sidebar-hint">(select a project)</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to={onProjectDetail ? `/projects/${projectId}?view=dna` : '#'}
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''} ${onProjectDetail ? '' : 'disabled'}`}
            onClick={(e) => {
              if (!onProjectDetail) e.preventDefault()
            }}
          >
            Project DNA
          </NavLink>
          <NavLink
            to={onProjectDetail ? `/projects/${projectId}?view=architecture` : '#'}
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''} ${onProjectDetail ? '' : 'disabled'}`}
            onClick={(e) => {
              if (!onProjectDetail) e.preventDefault()
            }}
          >
            Architecture
          </NavLink>
          <NavLink
            to={onProjectDetail ? `/projects/${projectId}?view=database` : '#'}
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''} ${onProjectDetail ? '' : 'disabled'}`}
            onClick={(e) => {
              if (!onProjectDetail) e.preventDefault()
            }}
          >
            Database Schema
          </NavLink>
          <NavLink
            to={onProjectDetail ? `/projects/${projectId}?view=planning` : '#'}
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''} ${onProjectDetail ? '' : 'disabled'}`}
            onClick={(e) => {
              if (!onProjectDetail) e.preventDefault()
            }}
          >
            Planning
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user?.name ?? 'User'}</div>
            <div className="sidebar-user-email muted">{user?.email}</div>
          </div>
          <button type="button" className="secondary-btn sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="shell-content">
        <Outlet />
      </section>
    </div>
  )
}
