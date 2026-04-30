import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getProject } from '../api/projects'

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

const VIEWS = [
  { id: 'dna', label: 'Project DNA' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'database', label: 'Database Schema' },
  { id: 'planning', label: 'Planning' },
]

export default function ProjectDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const view = searchParams.get('view') ?? 'dna'
  const notesKey = useMemo(() => `bg_project_notes_${id}`, [id])
  const [notesByKey, setNotesByKey] = useState(() => ({}))
  const notes = notesByKey[notesKey] ?? localStorage.getItem(notesKey) ?? ''

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setLoading(true)
      try {
        const data = await getProject(id)
        if (!cancelled) setProject(data)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load project')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    localStorage.setItem(notesKey, notes)
  }, [notesKey, notes])

  useEffect(() => {
    if (!VIEWS.some((v) => v.id === view)) {
      setSearchParams({ view: 'dna' }, { replace: true })
    }
  }, [view, setSearchParams])

  const content = useMemo(() => {
    if (!project) return null
    if (view === 'dna') {
      return (
        <>
          <div className="dna-section">
            <div className="dna-section-title">Problem Statement</div>
            <div className="dna-section-body">{project.description}</div>
          </div>

          <div className="dna-section">
            <div className="dna-section-title">Target users</div>
            <div className="dna-section-body muted">{project.target_users}</div>
          </div>

          <div className="dna-section">
            <div className="dna-section-title">Feature list</div>
            <div className="dna-section-body muted">
              Hook this to your AI blueprint endpoint and render sections here.
            </div>
            <div className="dna-feature-grid">
              {[
                'Interactive dashboard — centralized workspace',
                'AI-generated requirements — functional & non-functional',
                'Export — PDF/Docx/Markdown',
                'Versioning — compare blueprint iterations',
              ].map((text) => (
                <div key={text} className="dna-feature">
                  <div className="dna-bullet" />
                  <div>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )
    }
    if (view === 'architecture') {
      return (
        <>
          <div className="dna-section">
            <div className="dna-section-title">Architecture</div>
            <div className="dna-section-body muted">
              Describe frontend, backend, AI integration, and external services.
            </div>
          </div>
          <div className="dna-section">
            <div className="dna-section-title">Suggested components</div>
            <div className="dna-section-body">
              <ul className="dna-list">
                <li>React UI (Projects + Blueprint workspace)</li>
                <li>Laravel API (Sanctum + Projects + AI endpoints)</li>
                <li>AI provider integration</li>
              </ul>
            </div>
          </div>
        </>
      )
    }
    if (view === 'database') {
      return (
        <>
          <div className="dna-section">
            <div className="dna-section-title">Database schema</div>
            <div className="dna-section-body muted">
              Document tables for blueprint outputs (requirements, sections, versions).
            </div>
          </div>
          <div className="dna-section">
            <div className="dna-section-title">Current tables</div>
            <div className="dna-section-body">
              <ul className="dna-list">
                <li>`users` (role)</li>
                <li>`projects` (project_name, description, target_users, status)</li>
              </ul>
            </div>
          </div>
        </>
      )
    }
    if (view === 'planning') {
      return (
        <>
          <div className="dna-section">
            <div className="dna-section-title">Planning</div>
            <div className="dna-section-body muted">Add milestones, sprints, and delivery plan.</div>
            <ul className="dna-list">
              <li>Week 1: Requirements + scope</li>
              <li>Week 2: Blueprint generation MVP</li>
              <li>Week 3: Export + polish</li>
            </ul>
          </div>

          <div className="dna-section">
            <div className="dna-section-title">Notes</div>
            <div className="dna-section-body muted">Saved locally in this browser (per project).</div>
            <textarea
              className="dna-notes"
              rows={10}
              placeholder="Write notes, ideas, and decisions…"
              value={notes}
              onChange={(e) =>
                setNotesByKey((prev) => ({
                  ...prev,
                  [notesKey]: e.target.value,
                }))
              }
            />
          </div>
        </>
      )
    }
    return null
  }, [project, view, notes, notesKey])

  return (
    <div className="page dna-page">
      <div className="dna-head">
        <div className="dna-head-left">
          <Link className="dna-back" to="/projects">
            ←
          </Link>
          <div className="dna-title-wrap">
            <div className="dna-project-title">{project?.project_name ?? 'Project'}</div>
            <div className="muted dna-project-sub">
              {project ? `Created ${formatDate(project.created_at)}` : ''}
            </div>
          </div>
        </div>

        <div className="dna-actions">
          <button type="button" className="secondary-btn" disabled>
            Regenerate AI
          </button>
          <button type="button" className="secondary-btn" disabled>
            Export PDF
          </button>
        </div>
      </div>

      <div className="dna-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`dna-tab ${view === v.id ? 'active' : ''}`}
            onClick={() => setSearchParams({ view: v.id })}
          >
            {v.label}
          </button>
        ))}
        {project ? (
          <span className={`pill pill-${project.status ?? 'draft'}`} style={{ marginLeft: 'auto' }}>
            {project.status ?? 'draft'}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="muted" style={{ marginTop: 18 }}>
          Loading…
        </div>
      ) : error ? (
        <div className="error" role="alert" style={{ marginTop: 18 }}>
          {error}
        </div>
      ) : (
        <div className="dna-content">{content}</div>
      )}
    </div>
  )
}
