import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineDocumentText, HiOutlinePlus } from 'react-icons/hi'
import { listProjects } from '../api/projects'

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  // Stable YYYY-MM-DD style formatting
  return date.toLocaleDateString('en-CA')
}

function normalizeStatus(raw) {
  const status = (raw ?? '').toString().toLowerCase()
  if (status === 'draft') return { key: 'draft', label: 'Draft', icon: HiOutlineDocumentText }
  if (status === 'generated' || status === 'completed' || status === 'complete') {
    return { key: 'completed', label: 'Completed', icon: HiOutlineCheckCircle }
  }
  return { key: 'in-progress', label: 'In Progress', icon: HiOutlineClock }
}

function normalizeProject(p) {
  const status = normalizeStatus(p?.status)
  return {
    id: p?.id,
    name: p?.project_name ?? p?.name ?? 'Untitled project',
    description: p?.description ?? '',
    createdAt: formatDate(p?.created_at ?? p?.createdAt),
    updatedAt: formatDate(p?.updated_at ?? p?.updatedAt),
    status,
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    inProgress: 0,
    completed: 0,
    recent: []
  })

  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    try {
      const rawProjects = await listProjects()
      const projects = Array.isArray(rawProjects) ? rawProjects.map(normalizeProject) : []

      // Requirement: if user has more than 3 projects, redirect to Projects page.
      if (projects.length > 3) {
        navigate('/projects', { replace: true })
        return
      }

      const sortedRecent = [...projects].sort((a, b) => {
        const ad = a?.updatedAt ? new Date(a.updatedAt) : 0
        const bd = b?.updatedAt ? new Date(b.updatedAt) : 0
        return (bd?.getTime?.() ?? 0) - (ad?.getTime?.() ?? 0)
      })
      
      // Calculate dashboard stats from actual projects
      const stats = {
        total: projects.length,
        draft: projects.filter((p) => p.status.key === 'draft').length,
        inProgress: projects.filter((p) => p.status.key === 'in-progress').length,
        completed: projects.filter((p) => p.status.key === 'completed').length,
        recent: sortedRecent.slice(0, 3)
      }
      
      setStats(stats)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    // Wrap in timeout to avoid synchronous setState call in effect
    // This prevents cascading renders and satisfies React ESLint rules
    const timeoutId = setTimeout(() => {
      loadDashboardData()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [loadDashboardData])

  if (loading) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">Projects</h1>
        </div>
        <div className="ws-loading">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="muted">Transform ideas into structured development blueprints</p>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-stat-value">{stats.total}</div>
          <div className="dash-stat-label muted">Total Projects</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-value dash-stat-success">{stats.completed}</div>
          <div className="dash-stat-label muted">Completed</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-value dash-stat-brand">{stats.inProgress}</div>
          <div className="dash-stat-label muted">In Progress</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-value dash-stat-neutral">{stats.draft}</div>
          <div className="dash-stat-label muted">Drafts</div>
        </div>
      </div>

      <div className="dash-recent-head">
        <h2 className="dash-recent-title">Recent Projects</h2>
        <Link to="/projects/new" className="primary-btn">
          <HiOutlinePlus size={18} />
          Create New Project
        </Link>
      </div>

      <div className="dash-recent-list">
        {stats.recent.map((project) => {
          const Icon = project.status.icon
          return (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="dash-project"
          >
            <div>
              <div className="dash-project-title">{project.name}</div>
              <div className="dash-project-desc muted">{project.description}</div>
              <div className="dash-project-meta muted">
                <span>Created {project.createdAt}</span>
                <span>Updated {project.updatedAt}</span>
              </div>
            </div>

            <span className={`dash-status badge badge-${project.status.key}`}>
              <Icon size={14} />
              {project.status.label}
            </span>
          </Link>
        )})}

        {stats.recent.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-title">No projects yet</div>
            <div className="dash-empty-sub muted">Create your first project to generate a blueprint.</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
