import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProject } from '../api/projects'

export default function ProjectCreate() {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [targetUsers, setTargetUsers] = useState('')
  const [industry, setIndustry] = useState('')
  const [fileName, setFileName] = useState('')
  const [submitting, setSubmitting] = useState(false)
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
      navigate(id ? `/projects/${id}` : '/projects', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join('\n')
          : 'Failed to create project')
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page form-page">
      <div className="form-head">
        <h1 className="dash-title">New Project</h1>
        <p className="dash-subtitle muted">
          Describe your project idea and let AI generate a complete Project DNA.
        </p>
      </div>

      <div className="form-card">
        <div className="form-card-title">
          <span className="form-icon" aria-hidden="true" />
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

          <div className="form-row">
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

            <div>
              <label className="label" htmlFor="project-industry">
                Industry
              </label>
              <select
                id="project-industry"
                className="control"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Select industry</option>
                <option value="education">Education</option>
                <option value="healthcare">Healthcare</option>
                <option value="ecommerce">E-commerce</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <div className="label">Upload document (optional)</div>
            <label className="upload" htmlFor="project-upload">
              <div className="upload-title">Upload a document</div>
              <div className="muted upload-sub">PDF, DOCX, TXT, or Markdown — up to 10MB</div>
              <div className="muted upload-file">{fileName ? fileName : 'Choose file… (not sent yet)'}</div>
            </label>
            <input
              id="project-upload"
              type="file"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            />
          </div>

          {error ? (
            <pre className="error" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
              {error}
            </pre>
          ) : null}

          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={() => navigate('/projects')}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || !isValid}>
              {submitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
