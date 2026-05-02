import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getProject } from '../api/projects'
import { exportBlueprintPdf, generateBlueprint, getBlueprint } from '../api/blueprints'
import {
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlineDocumentText,
  HiOutlineUsers,
  HiOutlineFlag,
  HiOutlineClipboardList,
  HiOutlineDatabase,
  HiOutlineCube,
  HiOutlineCalendar,
  HiOutlineLightBulb,
  HiOutlineShieldExclamation,
  HiOutlineLightningBolt,
  HiOutlineArrowLeft,
} from 'react-icons/hi'

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

const VIEWS = [
  { id: 'overview', label: 'Overview', icon: HiOutlineDocumentText },
  { id: 'features', label: 'Features', icon: HiOutlineLightningBolt },
  { id: 'requirements', label: 'Requirements', icon: HiOutlineClipboardList },
  { id: 'userstories', label: 'User Stories', icon: HiOutlineUsers },
  { id: 'techdata', label: 'Tech & Data', icon: HiOutlineCube },
  { id: 'risks', label: 'Risk Analysis', icon: HiOutlineShieldExclamation },
  { id: 'future', label: 'Future Improvements', icon: HiOutlineLightBulb },
]

function normalizeTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSectionCategory(title) {
  const t = normalizeTitle(title)

  if (
    t.includes('executive summary') ||
    t.includes('overview') ||
    t.includes('problem statement') ||
    t.includes('target users') ||
    t.includes('project title')
  ) {
    return 'overview'
  }

  if (t.includes('key features') || t === 'features' || t.includes('feature')) return 'features'
  if (
    t.includes('functional requirements') ||
    t.includes('functional requirement') ||
    t.includes('non functional requirements') ||
    t.includes('nonfunctional requirements') ||
    t.includes('requirements')
  ) {
    return 'requirements'
  }
  if (t.includes('user stories') || t.includes('user story')) return 'userstories'
  if (
    t.includes('recommended tech stack') ||
    t.includes('tech stack') ||
    t.includes('database schema') ||
    t.includes('tables') ||
    t.includes('table') ||
    t.includes('database')
  ) {
    return 'techdata'
  }
  if (t.includes('risk analysis') || t.includes('risks')) return 'risks'
  if (t.includes('future enhancements') || t.includes('future improvements') || t.includes('enhancements')) return 'future'

  return 'overview'
}

// Parse blueprint content into sections
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

  function isNumberedHeader(line) {
    const trimmed = line.trim()
    const m = trimmed.match(/^(\d+)[.)]\s+(.+)$/)
    if (!m) return false

    const rest = m[2].trim()
    // Avoid splitting on numbered requirement items like "1. The system must..."
    // Treat as header only when it looks like a short section title.
    if (rest.length > 64) return false
    if (rest.includes(':')) return false
    if (rest.startsWith('**')) return false
    if (rest.toLowerCase().startsWith('the system')) return false
    return true
  }

  for (const line of lines) {
    // Check for section headers (## or ### or numbered sections)
    const mdHeaderMatch = line.match(/^(#{1,3})\s+(.+)$/)
    const numberedHeaderMatch = isNumberedHeader(line) ? line.trim().match(/^(\d+)[.)]\s+(.+)$/) : null
    
    if (mdHeaderMatch || numberedHeaderMatch) {
      flush()
      currentSection = (mdHeaderMatch?.[2] ?? numberedHeaderMatch?.[2] ?? '').trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }
  
  // Add the last section
  flush()
  
  return sections
}

function isBulletLine(line) {
  const trimmed = line.trim()
  return trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')
}

function getBulletText(line) {
  const trimmed = line.trim()
  if (trimmed.startsWith('• ')) return trimmed.slice(2)
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return trimmed.slice(2)
  return trimmed
}

function getNumberedMatch(line) {
  return line.trim().match(/^(\d+)[.)]\s+(.+)$/)
}

function renderDocContent(content) {
  if (!content) return null
  const lines = content.split('\n')
  const nodes = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i += 1
      continue
    }

    if (isBulletLine(line)) {
      const items = []
      while (i < lines.length && isBulletLine(lines[i])) {
        items.push(getBulletText(lines[i]))
        i += 1
      }
      const asGrid = items.length >= 6
      nodes.push(
        <ul key={`u_${key++}`} className={`doc-list ${asGrid ? 'doc-list-grid' : ''}`}>
          {items.map((t, idx) => (
            <li key={idx}>{t}</li>
          ))}
        </ul>
      )
      continue
    }

    const firstNum = getNumberedMatch(line)
    if (firstNum) {
      const items = []
      while (i < lines.length) {
        const m = getNumberedMatch(lines[i])
        if (!m) break
        items.push(m[2])
        i += 1
      }
      nodes.push(
        <ol key={`o_${key++}`} className="doc-olist">
          {items.map((t, idx) => (
            <li key={idx}>{t}</li>
          ))}
        </ol>
      )
      continue
    }

    const paraLines = []
    while (i < lines.length && lines[i].trim() && !isBulletLine(lines[i]) && !getNumberedMatch(lines[i])) {
      paraLines.push(lines[i].trim())
      i += 1
    }
    nodes.push(
      <p key={`p_${key++}`} className="doc-paragraph">
        {paraLines.join(' ')}
      </p>
    )
  }

  return nodes
}

function Section({ icon, title, children, meta }) {
  const Icon = icon
  return (
    <div className="project-section">
      <div className="project-section-title">
        <span className="section-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
        <span className="section-title-text">{title}</span>
        {meta ? <span className="section-meta muted">{meta}</span> : null}
      </div>
      <div className="section-divider" />
      <div className="project-section-body">{children}</div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [project, setProject] = useState(null)
  const [blueprint, setBlueprint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [error, setError] = useState('')
  const [genError, setGenError] = useState('')
  const view = searchParams.get('view') ?? 'overview'

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

  // Load blueprint data
  useEffect(() => {
    let cancelled = false
    async function loadBlueprint() {
      try {
        const data = await getBlueprint(id)
        if (!cancelled) setBlueprint(data?.data)
      } catch (err) {
        // Blueprint not found is OK, don't show error
        if (err?.response?.status !== 404) {
          console.error('Failed to load blueprint:', err)
        }
      }
    }
    loadBlueprint()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!VIEWS.some((v) => v.id === view)) {
      setSearchParams({ view: 'overview' }, { replace: true })
    }
  }, [view, setSearchParams])

  // Handle blueprint generation
  async function handleGenerateBlueprint() {
    setGenError('')
    setGenerating(true)
    try {
      const data = await generateBlueprint(id)
      setBlueprint(data?.data)
      // Refresh project to get updated status
      const projectData = await getProject(id)
      setProject(projectData)
    } catch (err) {
      setGenError(err?.response?.data?.message ?? 'Failed to generate blueprint')
    } finally {
      setGenerating(false)
    }
  }

  function parseFilenameFromContentDisposition(value) {
    if (!value) return null
    const match = String(value).match(/filename\*?=(?:UTF-8''|"?)([^";]+)"?/i)
    if (!match) return null
    try {
      return decodeURIComponent(match[1])
    } catch {
      return match[1]
    }
  }

  async function handleExportPdf() {
    if (!id) return
    setExportingPdf(true)
    try {
      const res = await exportBlueprintPdf(id)
      const blob = res?.data
      const cd = res?.headers?.['content-disposition'] ?? res?.headers?.['Content-Disposition']
      const suggested = parseFilenameFromContentDisposition(cd) ?? `${project?.project_name ?? 'Blueprint'}.pdf`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = suggested
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      // Surface a friendly message without breaking the page
      const msg = err?.response?.data?.message ?? 'Failed to export PDF'
      setError(msg)
    } finally {
      setExportingPdf(false)
    }
  }

  const blueprintSections = useMemo(() => {
    return parseBlueprintContent(blueprint?.content)
  }, [blueprint])

  const blueprintSectionsByCategory = useMemo(() => {
    const by = Object.create(null)
    for (const s of blueprintSections) {
      const cat = getSectionCategory(s?.title)
      if (!by[cat]) by[cat] = []
      by[cat].push(s)
    }
    return by
  }, [blueprintSections])

  const overviewSections = useMemo(() => {
    const allowed = new Set(['project title', 'executive summary', 'problem statement', 'target users'])
    return blueprintSections.filter((s) => allowed.has(normalizeTitle(s?.title)))
  }, [blueprintSections])

  const content = (() => {
    if (!project) return null

    const sectionsForView = blueprintSectionsByCategory[view] ?? []

    return (
      <>
        {!blueprint && !generating ? (
          <div className="blueprint-empty">
            <div className="blueprint-empty-icon">
              <HiOutlineDocumentText size={48} />
            </div>
            <h3>No Blueprint Generated Yet</h3>
            <p className="muted">Generate an AI-powered blueprint based on your project description.</p>
            {genError ? (
              <div className="error" role="alert" style={{ marginBottom: 16 }}>
                {genError}
              </div>
            ) : null}
          </div>
        ) : generating ? (
          <div className="blueprint-generating">
            <div className="spinner-large" />
            <h3>Generating Blueprint...</h3>
            <p className="muted">Our AI is analyzing your project and creating a comprehensive blueprint.</p>
          </div>
        ) : (
          <div className="doc-wrap" aria-label="Blueprint document">
            {/* <div className="doc-head">
              <div className="doc-head-title">
                <div className="doc-title">
                  {VIEWS.find((v) => v.id === view)?.label ?? 'Blueprint'}
                </div>
              </div>
            </div> */}

            <div className="doc-body">
              {(view === 'overview' ? overviewSections : sectionsForView).length === 0 ? (
                <div className="muted" style={{ padding: '6px 2px' }}>
                  No matching content found for this tab.
                </div>
              ) : null}
              {(view === 'overview' ? overviewSections : sectionsForView).map((section, index) => {
                const k = `${view}:${id}:${index}:${section?.title ?? ''}`
                return (
                  <div key={k} className="doc-section" role="region" aria-label={section.title}>
                    <div className="doc-section-summary">
                      <span className="doc-section-title">{section.title}</span>
                    </div>
                    <div className="doc-section-body">{renderDocContent(section.content)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </>
    )
  })()

  return (
    <div className="page project-page">
      <div className="project-hero">
        <div className="project-hero-left">
          <Link className="project-back" to="/projects" aria-label="Back to projects">
            <HiOutlineArrowLeft size={18} />
          </Link>
          <div className="project-hero-text">
            <div className="project-hero-title">{project?.project_name ?? 'Project'}</div>
            {/* <div className="muted project-hero-subtitle">
              {project?.description ? project.description : 'Project blueprint workspace'}
            </div> */}
            <div className="project-hero-meta">
              <span className="muted">
                Last updated: {formatDate(blueprint?.updated_at ?? project?.updated_at ?? project?.created_at)}
              </span>
              <span className="meta-status">
                <span className="status-dot" aria-hidden="true" />
                {project?.status === 'generated' ? 'Complete' : project?.status ?? 'Draft'}
              </span>
            </div>
          </div>
        </div>

        <div className="project-hero-actions">
          {blueprint ? (
            <button
              type="button"
              className="secondary-btn"
              onClick={handleExportPdf}
              disabled={exportingPdf}
            >
              <HiOutlineDocumentText size={18} />
              {exportingPdf ? 'Exporting…' : 'Export PDF'}
            </button>
          ) : null}
          <button type="button" className="primary-btn" onClick={handleGenerateBlueprint} disabled={generating}>
            <HiOutlineSparkles size={18} />
            {blueprint ? 'Regenerate' : 'Generate Blueprint'}
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
            <span className="tab-icon" aria-hidden="true">
              <v.icon size={18} />
            </span>
            <span>{v.label}</span>
          </button>
        ))}
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
