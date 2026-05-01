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
  { id: 'project', label: 'Project project' },
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
  const view = searchParams.get('view') ?? 'project'
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
      setSearchParams({ view: 'project' }, { replace: true })
    }
  }, [view, setSearchParams])

  const content = useMemo(() => {
    if (!project) return null
    if (view === 'project') {
      return (
        <>
          <div className="project-section">
            <div className="project-section-title">Problem Statement</div>
            <div className="project-section-body">{project.description}</div>
          </div>

          <div className="project-section">
            <div className="project-section-title">Target users</div>
            <div className="project-section-body muted">{project.target_users}</div>
          </div>

          <div className="project-section">
            <div className="project-section-title">Feature list</div>
            <div className="project-section-body muted">
              Hook this to your AI blueprint endpoint and render sections here.
            </div>
            <div className="project-feature-grid">
              {[
                'Interactive dashboard — centralized workspace',
                'AI-generated requirements — functional & non-functional',
                'Export — PDF/Docx/Markdown',
                'Versioning — compare blueprint iterations',
              ].map((text) => (
                <div key={text} className="project-feature">
                  <div className="project-bullet" />
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
          <div className="project-section">
            <div className="project-section-title">Architecture</div>
            <div className="project-section-body muted">
              Describe frontend, backend, AI integration, and external services.
            </div>
          </div>
          <div className="project-section">
            <div className="project-section-title">Suggested components</div>
            <div className="project-section-body">
              <ul className="project-list">
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
          <div className="project-section">
            <div className="project-section-title">Database schema</div>
            <div className="project-section-body muted">
              Document tables for blueprint outputs (requirements, sections, versions).
            </div>
          </div>
          <div className="project-section">
            <div className="project-section-title">Current tables</div>
            <div className="project-section-body">
              <ul className="project-list">
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
          <div className="project-section">
            <div className="project-section-title">Planning</div>
            <div className="project-section-body muted">Add milestones, sprints, and delivery plan.</div>
            <ul className="project-list">
              <li>Week 1: Requirements + scope</li>
              <li>Week 2: Blueprint generation MVP</li>
              <li>Week 3: Export + polish</li>
            </ul>
          </div>

          <div className="project-section">
            <div className="project-section-title">Notes</div>
            <div className="project-section-body muted">Saved locally in this browser (per project).</div>
            <textarea
              className="project-notes"
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
    <div className="page project-page">
      <div className="project-head">
        <div className="project-head-left">
          <Link className="project-back" to="/projects">
            ←
          </Link>
          <div className="project-title-wrap">
            <div className="project-project-title">{project?.project_name ?? 'Project'}</div>
            <div className="muted project-project-sub">
              {project ? `Created ${formatDate(project.created_at)}` : ''}
            </div>
          </div>
        </div>

        <div className="project-actions">
          <button type="button" className="secondary-btn" disabled>
            Regenerate AI
          </button>
          <button type="button" className="secondary-btn" disabled>
            Export PDF
          </button>
        </div>
      </div>

      <div className="project-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`project-tab ${view === v.id ? 'active' : ''}`}
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
        <div className="project-content">{content}</div>
      )}
    </div>
  )
}
