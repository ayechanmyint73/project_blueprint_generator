import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProjects } from '../api/projects'

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

export default function ProjectsList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setLoading(true)
      try {
        const data = await listProjects()
        if (!cancelled) setProjects(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load projects')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      const ta = new Date(a?.created_at ?? 0).getTime()
      const tb = new Date(b?.created_at ?? 0).getTime()
      return tb - ta
    })
  }, [projects])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter((p) => {
      if (status !== 'all' && String(p?.status ?? '').toLowerCase() !== status) return false
      if (!q) return true
      const hay = [
        p?.project_name,
        p?.description,
        p?.target_users,
        p?.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [sorted, query, status])

  return (
    <div className="page">
      <div className="dash-top">
        <div>
          <h1 className="dash-title">Dashboard</h1>
        </div>
        <Link className="btn-link dash-cta" to="/projects/new">
          + New Project
        </Link>
      </div>

      <div className="dash-controls">
        <div>
          <input
            className="control"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="control" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}

      {loading ? (
        <div className="muted" style={{ marginTop: 18 }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ marginBottom: 10 }}>
            {projects.length === 0 ? 'No projects yet.' : 'No projects match your filters.'}
          </p>
          <Link className="btn-link" to="/projects/new">
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="dash-grid">
          {filtered.map((p) => (
            <div key={p.id} className="project-card">
              <div className="project-card-top">
                <span className={`pill pill-${p.status ?? 'draft'}`}>{p.status ?? 'draft'}</span>
              </div>

              <div className="project-card-title">{p.project_name}</div>
              <div className="project-card-desc muted">
                {(p.description ?? '').slice(0, 120)}
                {(p.description ?? '').length > 120 ? '…' : ''}
              </div>

              <div className="project-card-meta">
                <div className="muted">{formatDate(p.created_at)}</div>
              <div className="project-card-actions">
                <Link className="project-link" to={`/projects/${p.id}?view=project`}>
                  View project →
                </Link>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
