import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProject } from '../api/projects'
import { generateBlueprint } from '../api/blueprints'
import {
  HiOutlineSparkles,
} from 'react-icons/hi'

export default function ProjectCreate() {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [targetUsers, setTargetUsers] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modal, setModal] = useState({ open: false, projectId: null, error: '' })
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({
    projectName: false,
    description: false,
    targetUsers: false,
  })

  const navigate = useNavigate()

  const fieldErrors = useMemo(() => {
    const errors = {}
    if (!projectName.trim()) errors.projectName = 'Project name is required'
    else if (projectName.trim().length > 255) errors.projectName = 'Max 255 characters'
    if (!description.trim()) errors.description = 'Description is required'
    if (!targetUsers.trim()) errors.targetUsers = 'Target users is required'
    return errors
  }, [projectName, description, targetUsers])

  const isValid = Object.keys(fieldErrors).length === 0

  async function runGeneration(projectId) {
    setModal({ open: true, projectId, error: '' })
    try {
      await generateBlueprint(projectId)
      navigate(`/projects/${projectId}?view=overview`, { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to generate blueprint'
      setModal({ open: true, projectId, error: msg })
    } finally {
      setSubmitting(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setTouched({ projectName: true, description: true, targetUsers: true })
    if (!isValid) return
    setSubmitting(true)
    try {
      const data = await createProject({
        project_name: projectName.trim(),
        description: description.trim(),
        target_users: targetUsers.trim(),
      })
      const id = data?.project?.id
      if (id) {
        // Requirement: generation happens immediately from create flow, not from ProjectDetail.
        await runGeneration(id)
      } else {
        setSubmitting(false)
        navigate('/projects', { replace: true })
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join('\n')
          : 'Failed to create project')
      setError(msg)
    } finally {
      if (!modal.open) setSubmitting(false)
    }
  }

  return (
    <div className="page form-page">
      <div className="form-head">
        <h1 className="dash-title">New Project</h1>
        <p className="dash-subtitle muted">
          Describe your project idea and let AI generate a complete Project project.
        </p>
      </div>

      <div className="form-card">
        <div className="form-card-title">
          Project Details
        </div>

        <form className="form" onSubmit={onSubmit} noValidate>
          <div>
            <label className="label" htmlFor="project-name">
              Project title
            </label>
            <input
              id="project-name"
              placeholder="e.g. Smart Inventory Management System"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, projectName: true }))}
              aria-invalid={touched.projectName && Boolean(fieldErrors.projectName)}
              required
            />
            {touched.projectName && fieldErrors.projectName ? (
              <div className="field-error">{fieldErrors.projectName}</div>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="project-description">
              Project description
            </label>
            <textarea
              id="project-description"
              rows={6}
              placeholder="Describe your project idea in detail — what it does, the problem it solves, key features…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, description: true }))}
              aria-invalid={touched.description && Boolean(fieldErrors.description)}
              required
            />
            {touched.description && fieldErrors.description ? (
              <div className="field-error">{fieldErrors.description}</div>
            ) : null}
          </div>

          <div>
              <label className="label" htmlFor="project-target-users">
                Target users
              </label>
              <input
                id="project-target-users"
                placeholder="e.g. Small business owners"
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, targetUsers: true }))}
                aria-invalid={touched.targetUsers && Boolean(fieldErrors.targetUsers)}
                required
              />
              {touched.targetUsers && fieldErrors.targetUsers ? (
                <div className="field-error">{fieldErrors.targetUsers}</div>
              ) : null}
            </div>

          {error ? (
            <pre className="error" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
              {error}
            </pre>
          ) : null}

          <div className="form-actions">
            <button type="submit" disabled={submitting || !isValid}>
              <HiOutlineSparkles size={18} />
              {submitting ? 'Generating…' : 'Generate Blueprint'}
            </button>
          </div>
        </form>
      </div>

      {modal.open ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Generating blueprint">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">
                  {modal.error ? 'Generation failed' : 'Generating your blueprint'}
                </h3>
                <div className="modal-subtitle muted">
                  {modal.error
                    ? 'You can retry generation or open the project to view/edit details.'
                    : 'This can take up to a minute. Please keep this window open.'}
                </div>
              </div>
            </div>

            <div className="modal-body">
              {!modal.error ? (
                <div className="modal-status">
                  <div className="spinner-large" aria-hidden="true" />
                  <div>
                    <div style={{ fontWeight: 750, color: 'var(--text-h)' }}>Calling AI provider…</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Creating sections, requirements, and roadmap
                    </div>
                  </div>
                </div>
              ) : (
                <div className="error" role="alert" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
                  {modal.error}
                </div>
              )}

              <div className="modal-actions">
                {modal.projectId ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => navigate(`/projects/${modal.projectId}?view=overview`, { replace: true })}
                  >
                    Open project
                  </button>
                ) : null}

                {modal.error && modal.projectId ? (
                  <button type="button" className="primary-btn" onClick={() => runGeneration(modal.projectId)}>
                    Retry generation
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
