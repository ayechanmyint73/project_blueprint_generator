import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProjects } from '../api/projects'

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

function getTags(project) {
  const raw = String(project?.target_users ?? '')
  const tags = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3)
  return tags
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
          <div className="dash-kicker">Blueprint Generator</div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle muted">Manage your Project DNA documents</p>
        </div>
        <Link className="btn-link dash-cta" to="/projects/new">
          + New Project
        </Link>
      </div>

      <div className="dash-controls">
        <input
          className="control"
          placeholder="Search projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
            <div key={p.id} className="dna-card">
              <div className="dna-card-top">
                <span className={`pill pill-${p.status ?? 'draft'}`}>{p.status ?? 'draft'}</span>
              </div>

              <div className="dna-card-title">{p.project_name}</div>
              <div className="dna-card-desc muted">
                {(p.description ?? '').slice(0, 120)}
                {(p.description ?? '').length > 120 ? '…' : ''}
              </div>

              <div className="dna-card-meta">
                <div className="muted">{formatDate(p.created_at)}</div>
                <div className="tags">
                  {getTags(p).map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="dna-card-actions">
                <Link className="dna-link" to={`/projects/${p.id}?view=dna`}>
                  View DNA →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
