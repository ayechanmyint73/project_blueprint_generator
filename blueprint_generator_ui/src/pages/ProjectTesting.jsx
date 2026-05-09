import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProject } from '../api/projects'
import {
  getTestingStrategies,
  generateAndSaveTestingStrategies,
  createTestingStrategy,
  updateTestingStrategy,
  deleteTestingStrategy,
} from '../api/blueprints'
import { HiOutlineArrowLeft, HiOutlineClipboardCheck, HiOutlineSparkles, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import LoadingSpinner from '../components/LoadingSpinner'

function normalizeTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseBlueprintContent(content) {
  if (!content) return []
  const sections = []
  const lines = content.split('\n')
  let currentSection = null
  let currentContent = []

  function flush() {
    if (!currentSection) return
    sections.push({
      title: currentSection,
      content: currentContent.join('\n').replace(/\s+$/g, ''),
    })
  }

  for (const line of lines) {
    const mdHeaderMatch = line.match(/^#{1,6}\s*(.+)$/)
    const numberedHeaderMatch = line.trim().match(/^(\d+)[.)]\s+(.+)$/)
    if (mdHeaderMatch || numberedHeaderMatch) {
      flush()
      currentSection = (mdHeaderMatch?.[1] ?? numberedHeaderMatch?.[2] ?? '').trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  flush()
  return sections
}

function parseTableRow(row) {
  const raw = String(row ?? '').trim()
  const trimmed = raw.startsWith('|') ? raw.slice(1) : raw
  const cleaned = trimmed.endsWith('|') ? trimmed.slice(0, -1) : trimmed
  return cleaned
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c !== '')
}

function renderTestingContent(content) {
  if (!content) return null
  const lines = content.split('\n').filter((line) => line.trim())
  const tableRows = lines.filter((line) => line.includes('|'))

  if (tableRows.length >= 2) {
    const header = parseTableRow(tableRows[0])
    const rows = tableRows
      .slice(1)
      .filter((line) => !/^[\s|:-]+$/.test(line))
      .map(parseTableRow)
      .filter((r) => r.length > 0)

    if (header.length > 0 && rows.length > 0) {
      return (
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                {header.map((h, idx) => (
                  <th key={idx} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ridx) => (
                <tr key={ridx}>
                  {r.map((c, cidx) => (
                    <td key={cidx}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }

  return <div className="doc-paragraph">{content}</div>
}

export default function ProjectTesting() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [strategyContent, setStrategyContent] = useState('')
  const [testCases, setTestCases] = useState([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [form, setForm] = useState({ test_case: '', test_type: 'unit', description: '', priority: 'medium' })
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setLoading(true)
      try {
        const projectData = await getProject(id)
        if (!cancelled) setProject(projectData)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load project')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    let loadCancelled = false
    async function loadCases() {
      try {
        const res = await getTestingStrategies(id)
        if (!loadCancelled) setTestCases(res?.data ?? [])
      } catch {
        // ignore silently
      }
    }
    loadCases()
    return () => {
      cancelled = true
      loadCancelled = true
    }
  }, [id])

  const testingSection = useMemo(() => {
    if (testCases && testCases.length) return { title: 'Testing Strategy', content: '' }
    const sections = parseBlueprintContent(strategyContent)
    return sections.find((s) => {
      const title = normalizeTitle(s?.title)
      return title.includes('testing strategy') || title.includes('test strategy')
    }) ?? (strategyContent ? { title: 'Testing Strategy', content: strategyContent } : null)
  }, [strategyContent, testCases])

  const testingMeta = useMemo(() => {
    const count = testCases?.length ?? 0
    return { total: count, source: count > 0 ? 'AI' : 'Not generated' }
  }, [testCases])

  async function refreshCases() {
    const res = await getTestingStrategies(id)
    setTestCases(res?.data ?? [])
  }

  async function onGenerate() {
    setError('')
    setGenerating(true)
    try {
      const data = await generateAndSaveTestingStrategies(id)
      setTestCases(data?.data ?? [])
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to generate testing strategy')
    } finally {
      setGenerating(false)
    }
  }

  async function onToggleChecked(item, checked) {
    try {
      setTestCases((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_checked: checked } : row)))
      await updateTestingStrategy(id, item.id, { is_checked: checked })
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to update checklist')
      await refreshCases()
    }
  }

  async function onSaveCase() {
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await updateTestingStrategy(id, editingId, form)
      } else {
        await createTestingStrategy(id, form)
      }
      setCaseModalOpen(false)
      setEditingId(null)
      setForm({ test_case: '', test_type: 'unit', description: '', priority: 'medium' })
      await refreshCases()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to save test case')
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteCase(testCaseId) {
    if (!window.confirm('Delete this test case?')) return
    try {
      await deleteTestingStrategy(id, testCaseId)
      await refreshCases()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to delete test case')
    }
  }

  function sanitizeFilename(name) {
    return String(name || 'project').replace(/[^a-z0-9-_]/gi, '_')
  }

  function exportCsv() {
    if (!testCases || !testCases.length) return
    const rows = []
    const header = ['Test Case', 'Test Type', 'Description', 'Priority']
    rows.push(header)
    for (const t of testCases) {
      rows.push([t.test_case ?? '', t.test_type ?? '', t.description ?? '', t.priority ?? ''])
    }

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(project?.project_name)}-test-cases.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page project-page">
      <div className="project-hero">
        <div className="project-hero-left">
          <Link className="project-back" to={`/projects/${id}?view=overview`} aria-label="Back to project">
            <HiOutlineArrowLeft size={18} />
          </Link>
          <div className="project-hero-text">
            <div className="project-hero-title">Testing Strategy</div>
            <div className="muted project-hero-subtitle">{project?.project_name ?? 'Project'}</div>
            <div className="project-hero-meta">
              <span className="muted">Total Cases: {testingMeta.total}</span>
              <span className="meta-status">
                <span className="status-dot" aria-hidden="true" />
                {testingMeta.source}
              </span>
            </div>
          </div>
        </div>
        <div className="project-hero-actions">
          <button type="button" className="primary-btn" onClick={onGenerate} disabled={generating || loading}>
            <HiOutlineSparkles size={18} />
            {generating ? 'Generating…' : 'Generate Testing Strategy'}
          </button>
          <button type="button" className="secondary-btn" onClick={() => exportCsv()} disabled={!testCases || testCases.length === 0} style={{ marginLeft: 8 }}>
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="error" role="alert" style={{ marginTop: 18 }}>{error}</div>
      ) : !testingSection ? (
        <div className="blueprint-empty">
          <div className="blueprint-empty-icon">
            <HiOutlineClipboardCheck size={48} />
          </div>
          <h3>No Testing Strategy Yet</h3>
          <p className="muted">Click “Generate Testing Strategy” to create one for this project.</p>
        </div>
      ) : (
        <div className="doc-wrap" aria-label="Testing strategy document">
          <div className="doc-body">
            <div className="doc-section" role="region" aria-label={testingSection.title}>
              <div className="doc-section-summary">
                <span className="doc-section-title">{testingSection.title}</span>
              </div>
              <div className="doc-section-body">
                {testCases && testCases.length ? (
                  <div className="doc-table-wrap">
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Done</th>
                          <th>Test Case</th>
                          <th>Test Type</th>
                          <th>Description</th>
                          <th>Priority</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testCases.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <input type="checkbox" checked={!!t.is_checked} onChange={(e) => onToggleChecked(t, e.target.checked)} />
                            </td>
                            <td style={{ textDecoration: t.is_checked ? 'line-through' : 'none', opacity: t.is_checked ? 0.65 : 1 }}>{t.test_case}</td>
                            <td style={{ textDecoration: t.is_checked ? 'line-through' : 'none', opacity: t.is_checked ? 0.65 : 1 }}>{t.test_type}</td>
                            <td style={{ textDecoration: t.is_checked ? 'line-through' : 'none', opacity: t.is_checked ? 0.65 : 1 }}>{t.description}</td>
                            <td style={{ textDecoration: t.is_checked ? 'line-through' : 'none', opacity: t.is_checked ? 0.65 : 1 }}>{t.priority}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => {
                                    setEditingId(t.id)
                                    setForm({
                                      test_case: t.test_case ?? '',
                                      test_type: t.test_type ?? 'unit',
                                      description: t.description ?? '',
                                      priority: t.priority ?? 'medium',
                                    })
                                    setCaseModalOpen(true)
                                  }}
                                >
                                  <HiOutlinePencil size={15} />
                                </button>
                                <button type="button" className="icon-btn danger" onClick={() => onDeleteCase(t.id)}>
                                  <HiOutlineTrash size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  renderTestingContent(testingSection.content)
                )}

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      setEditingId(null)
                      setForm({ test_case: '', test_type: 'unit', description: '', priority: 'medium' })
                      setCaseModalOpen(true)
                    }}
                  >
                    Add New Test Case
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {caseModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Test case form">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">{editingId ? 'Edit Test Case' : 'Add New Test Case'}</h3>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 10 }}>
                <input
                  className="projects-search-input"
                  placeholder="Test case title"
                  value={form.test_case}
                  onChange={(e) => setForm((prev) => ({ ...prev, test_case: e.target.value }))}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    className="projects-search-input"
                    placeholder="Test type (api/ui/security...)"
                    value={form.test_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, test_type: e.target.value }))}
                  />
                  <select className="projects-status" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <textarea
                  className="projects-search-input"
                  rows={3}
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setCaseModalOpen(false)
                    setEditingId(null)
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="primary-btn" onClick={onSaveCase} disabled={saving || !form.test_case.trim() || !form.test_type.trim()}>
                  {saving ? 'Saving…' : editingId ? 'Update Test Case' : 'Add Test Case'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
