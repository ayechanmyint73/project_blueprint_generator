import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlinePlus,
} from 'react-icons/hi'
import { listProjects } from '../api/projects'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

function inferIndustry(textRaw) {
  const text = String(textRaw ?? '').toLowerCase()
  if (!text.trim()) return 'Other'

  const rules = [
    { label: 'Fintech', re: /\b(fintech|finance|bank|loan|credit|investment|wallet|crypto|payment)\b/i },
    { label: 'E-commerce', re: /\b(e-?commerce|shop|store|cart|checkout|inventory|product|order)\b/i },
    { label: 'Education', re: /\b(education|student|course|learning|lms|school|university|tutor)\b/i },
    { label: 'Health', re: /\b(health|fitness|clinic|hospital|patient|medical|wellness|nutrition)\b/i },
    { label: 'Productivity', re: /\b(productivity|task|todo|project management|workflow|calendar|notes)\b/i },
    { label: 'Social', re: /\b(social|community|chat|messaging|forum|friends)\b/i },
  ]

  const hit = rules.find((r) => r.re.test(text))
  return hit?.label ?? 'Other'
}

function inferComplexity(textRaw) {
  const text = String(textRaw ?? '')
  const n = text.trim().length
  if (n === 0) return 'Simple'
  if (n < 180) return 'Simple'
  if (n < 420) return 'Medium'
  return 'Complex'
}

function matchesStatus(projectStatusRaw, filter) {
  if (filter === 'all') return true
  const s = String(projectStatusRaw ?? '').toLowerCase()

  if (filter === 'draft') return s === 'draft'

  // "Completed" in the UI includes "generated" and "completed" backend states.
  if (filter === 'completed') return s === 'generated' || s === 'completed' || s === 'complete'

  // Anything not draft/completed is treated as "In Progress" for filtering.
  if (filter === 'in-progress') return s !== 'draft' && !(s === 'generated' || s === 'completed' || s === 'complete')

  return true
}

function getStatusMeta(projectStatusRaw) {
  const s = String(projectStatusRaw ?? '').toLowerCase()
  if (s === 'draft') {
    return { classKey: 'draft', label: 'Draft', Icon: HiOutlineDocumentText }
  }
  if (s === 'generated' || s === 'completed' || s === 'complete' || s === 'success') {
    return { classKey: 'completed', label: 'Completed', Icon: HiOutlineCheckCircle }
  }
  if (s === 'in progress' || s === 'in-progress' || s === 'progress' || s === 'active') {
    return { classKey: 'in-progress', label: 'In Progress', Icon: HiOutlineClock }
  }
  return { classKey: 'in-progress', label: 'In Progress', Icon: HiOutlineClock }
}

export default function ProjectsList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [industry, setIndustry] = useState('all')
  const [complexity, setComplexity] = useState('all')
  const [page, setPage] = useState(1)

  const pageSize = 9

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
      if (!matchesStatus(p?.status, status)) return false

      if (industry !== 'all') {
        const inferred = inferIndustry([p?.project_name, p?.description].filter(Boolean).join(' '))
        if (inferred !== industry) return false
      }

      if (complexity !== 'all') {
        const inferred = inferComplexity(p?.description)
        if (inferred !== complexity) return false
      }

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
  }, [sorted, query, status, industry, complexity])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / pageSize))
  }, [filtered.length])

  const safePage = useMemo(() => {
    return Math.min(Math.max(1, page), totalPages)
  }, [page, totalPages])

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage])

  return (
    <div className="page">
      <div className="projects-head">
        <div>
          <h1 className="projects-title">Projects</h1>
          <div className="projects-subtitle muted">Search, filter, and manage your project blueprints</div>
        </div>

        <div className="projects-topbar-actions">
          <div className="projects-search" role="search">
            <HiOutlineSearch className="projects-search-icon" size={18} />
            <input
              className="projects-search-input"
              placeholder="Search projects…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              aria-label="Search projects"
            />
            {query.trim() ? (
              <button
                type="button"
                className="projects-search-clear"
                onClick={() => {
                  setQuery('')
                  setPage(1)
                }}
                aria-label="Clear search"
                title="Clear"
              >
                <HiOutlineX size={16} />
              </button>
            ) : null}
          </div>

          <Link className="primary-btn projects-generate" to="/projects/new">
            <HiOutlinePlus size={18} />
            Create New Project
          </Link>
        </div>
      </div>

      <div className="projects-toolbar">
        <select
          className="projects-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        projects.length === 0 ? (
          <div className="projects-empty">
            <div className="projects-empty-ill" aria-hidden="true">
              <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M52 36c0-10 8-18 18-18h92c10 0 18 8 18 18v92c0 10-8 18-18 18H96c-4 0-8 1-11 3l-24 15c-4 3-9 0-9-5V36Z"
                  stroke="currentColor"
                  strokeWidth="8"
                  opacity="0.25"
                />
                <path
                  d="M82 58h86M82 78h68M82 98h76"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.35"
                />
                <path
                  d="M156 126c14 0 26 12 26 26s-12 26-26 26-26-12-26-26 12-26 26-26Z"
                  stroke="currentColor"
                  strokeWidth="8"
                  opacity="0.25"
                />
                <path
                  d="M156 142v20M146 152h20"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.45"
                />
              </svg>
            </div>
            <div className="projects-empty-title">No projects yet</div>
            <div className="projects-empty-sub muted">
              Start by creating your first project, then generate a blueprint in seconds.
            </div>
            <Link className="primary-btn projects-empty-cta" to="/projects/new">
              Start Your First Project
            </Link>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 18 }}>
            <p style={{ marginBottom: 10 }}>No projects match your filters.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="pager-btn"
                onClick={() => {
                  setQuery('')
                  setStatus('all')
                  setIndustry('all')
                  setComplexity('all')
                  setPage(1)
                }}
              >
                Clear filters
              </button>
              <Link className="btn-link secondary-btn" to="/projects/new">
                <HiOutlinePlus size={18} />
                Create New Project
              </Link>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="dash-grid">
            {paged.map((p) => (
            <div key={p.id} className="project-card">
              <div className="project-card-top">
                {(() => {
                  const meta = getStatusMeta(p?.status)
                  return (
                    <span className={`pill pill-${meta.classKey}`}>
                      <meta.Icon size={16} />
                      {meta.label}
                    </span>
                  )
                })()}
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

          {filtered.length > pageSize ? (
            <div className="pager">
              <button
                type="button"
                className="pager-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                Prev
              </button>
              <div className="pager-meta muted">
                Page {safePage} of {totalPages}
              </div>
              <button
                type="button"
                className="pager-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
