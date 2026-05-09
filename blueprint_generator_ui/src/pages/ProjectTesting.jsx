import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProject } from '../api/projects'
import { getTestingStrategies, generateAndSaveTestingStrategies } from '../api/blueprints'
import { HiOutlineArrowLeft, HiOutlineClipboardCheck, HiOutlineSparkles } from 'react-icons/hi'

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

  return (
    <div className="doc-paragraph">
      {content}
    </div>
  )
}

export default function ProjectTesting() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [strategyContent, setStrategyContent] = useState('')
  const [testCases, setTestCases] = useState([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
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
    // load persisted test cases
    let loadCancelled = false
    async function loadCases() {
      try {
        const res = await getTestingStrategies(id)
        if (!loadCancelled) setTestCases(res?.data ?? [])
      } catch (e) {
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

  async function onGenerate() {
    setError('')
    setGenerating(true)
    try {
      // generate structured test cases and persist them
      const data = await generateAndSaveTestingStrategies(id)
      const created = data?.data ?? []
      setTestCases(created)
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to generate testing strategy')
    } finally {
      setGenerating(false)
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
        rows.push([
          t.test_case ?? '',
          t.test_type ?? '',
          t.description ?? '',
          t.priority ?? '',
        ])
      }

      const csv = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fname = sanitizeFilename(project?.project_name)
      a.download = `${fname}-test-cases.csv`
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
            <div className="project-hero-title">{project?.project_name ?? 'Project'} - Testing Strategy</div>
          </div>
        </div>
        <div className="project-hero-actions">
          <button type="button" className="primary-btn" onClick={onGenerate} disabled={generating || loading}>
            <HiOutlineSparkles size={18} />
            {generating ? 'Generating…' : 'Generate Testing Strategy'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => exportCsv()}
            disabled={!testCases || testCases.length === 0}
            style={{ marginLeft: 8 }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="muted" style={{ marginTop: 18 }}>Loading…</div>
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
                          <th>Test Case</th>
                          <th>Test Type</th>
                          <th>Description</th>
                          <th>Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testCases.map((t) => (
                          <tr key={t.id}>
                            <td>{t.test_case}</td>
                            <td>{t.test_type}</td>
                            <td>{t.description}</td>
                            <td>{t.priority}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  renderTestingContent(testingSection.content)
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
