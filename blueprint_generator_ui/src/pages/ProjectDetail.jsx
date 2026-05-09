import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getProject } from '../api/projects'
import { exportBlueprintPdf, generateBlueprint, getBlueprint } from '../api/blueprints'
import LoadingSpinner from '../components/LoadingSpinner'
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
  HiOutlineCode,
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
  { id: 'usecase', label: 'Use-Case Diagram', icon: HiOutlineCode },
  { id: 'techdata', label: 'Tech & Data', icon: HiOutlineCube },
  { id: 'flowchart', label: 'Flow Chart', icon: HiOutlineCode },
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
  if (t.includes('use case diagram') || t.includes('use-case diagram') || t.includes('use case')) return 'usecase'
  if (
    t.includes('recommended tech stack') ||
    t.includes('tech stack') ||
    t.includes('relationship') ||
    t.includes('relationships') ||
    t.includes('database schema') ||
    t.includes('tables') ||
    t.includes('table') ||
    t.includes('database') ||
    t.includes('api modules') ||
    t.includes('api module') ||
    t.includes('api outline') ||
    t.includes('development roadmap') ||
    t.includes('roadmap') ||
    t.includes('development plan')
  ) {
    return 'techdata'
  }
  if (t.includes('flow chart') || t.includes('flowchart') || t.includes('process flow')) return 'flowchart'
  if (t.includes('testing strategy') || t.includes('test strategy')) return 'techdata'
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

  function getLooseHeaderTitle(line) {
    const raw = String(line ?? '')
    const trimmed = raw.trim()
    if (!trimmed) return null

    // Markdown headers: allow optional space after # (e.g. "##Title")
    const md = trimmed.match(/^#{1,6}\s*(.+)$/)
    if (md?.[1]) return md[1].trim()

    // Bold-only header line: **Key Features** or **5. Key Features**
    const bold = trimmed.match(/^\*\*(.+)\*\*$/)
    if (bold?.[1]) return bold[1].trim()

    // Short label style: "Key Features:" / "5. Key Features:"
    const label = trimmed.match(/^(.+):$/)
    if (label?.[1] && label[1].trim().length <= 72) {
      const candidate = label[1].trim()
      // avoid capturing long requirement statements ending with colon
      if (!candidate.toLowerCase().startsWith('the system')) return candidate
    }

    return null
  }

  for (const line of lines) {
    // Check for section headers (markdown/bold/label/numbered sections)
    const looseTitle = getLooseHeaderTitle(line)
    const numberedHeaderMatch = isNumberedHeader(line) ? line.trim().match(/^(\d+)[.)]\s+(.+)$/) : null
    
    if (looseTitle || numberedHeaderMatch) {
      flush()
      currentSection = (looseTitle ?? numberedHeaderMatch?.[2] ?? '').trim()
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

function renderInline(text) {
  const value = String(text ?? '')
  const parts = []
  let i = 0
  let key = 0

  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let m
  while ((m = re.exec(value)) !== null) {
    const before = value.slice(i, m.index)
    if (before) parts.push(<span key={`t_${key++}`}>{before}</span>)

    const token = m[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={`b_${key++}`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      parts.push(<code key={`c_${key++}`} className="doc-inline-code">{token.slice(1, -1)}</code>)
    }

    i = m.index + token.length
  }
  const rest = value.slice(i)
  if (rest) parts.push(<span key={`t_${key++}`}>{rest}</span>)

  return parts
}

function splitTableRows(line) {
  // Some models output table rows on one line using "||" between rows.
  // Keep single "|" as cell separators.
  return String(line ?? '')
    .split('||')
    .map((s) => s.trim())
    .filter(Boolean)
}

function looksLikeTableRow(line) {
  const t = String(line ?? '').trim()
  if (!t.includes('|')) return false
  // Require at least 2 pipes to look like a row with 2+ columns
  const pipeCount = (t.match(/\|/g) ?? []).length
  return pipeCount >= 2
}

function looksLikeSeparatorRow(line) {
  const t = String(line ?? '').trim()
  // Typical markdown separator: | --- | --- |
  return /^[\s|:-]+$/.test(t) && t.includes('-')
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

function parseTableBlock(lines, startIndex) {
  let i = startIndex
  const rows = []

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) break
    if (!looksLikeTableRow(line)) break

    for (const row of splitTableRows(line)) {
      // Skip pure separator rows in accumulation (we handle header detection separately)
      rows.push(row)
    }
    i += 1
  }

  if (rows.length < 2) return null

  // If the second row is a separator row, treat first row as header
  let header = null
  let bodyStart = 0
  if (rows.length >= 2 && looksLikeSeparatorRow(rows[1])) {
    header = parseTableRow(rows[0])
    bodyStart = 2
  }

  const bodyRows = rows.slice(bodyStart).map(parseTableRow).filter((r) => r.length > 0)
  if ((!header || header.length === 0) && bodyRows.length === 0) return null

  const colCount = Math.max(header?.length ?? 0, ...bodyRows.map((r) => r.length))
  const normalizedHeader = header ? [...header, ...Array(Math.max(0, colCount - header.length)).fill('')] : null
  const normalizedBody = bodyRows.map((r) => [...r, ...Array(Math.max(0, colCount - r.length)).fill('')])

  return {
    nextIndex: i,
    header: normalizedHeader,
    rows: normalizedBody,
  }
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

    // Markdown-like tables
    if (looksLikeTableRow(line)) {
      const table = parseTableBlock(lines, i)
      if (table && (table.header || table.rows.length)) {
        nodes.push(
          <div key={`tbl_${key++}`} className="doc-table-wrap">
            <table className="doc-table">
              {table.header ? (
                <thead>
                  <tr>
                    {table.header.map((h, idx) => (
                      <th key={idx} scope="col">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {table.rows.map((r, ridx) => (
                  <tr key={ridx}>
                    {r.map((c, cidx) => (
                      <td key={cidx}>{renderInline(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
        i = table.nextIndex
        continue
      }
    }

    const trimmed = line.trim()
    const isShortLabel = trimmed.endsWith(':') && trimmed.length <= 48 && !isBulletLine(trimmed)
    if (isShortLabel) {
      nodes.push(
        <div key={`h_${key++}`} className="doc-subhead">
          {renderInline(trimmed.slice(0, -1))}
        </div>,
      )
      i += 1
      continue
    }

    if (isBulletLine(line)) {
      const items = []
      while (i < lines.length && isBulletLine(lines[i])) {
        items.push(getBulletText(lines[i]))
        i += 1
      }

      // Always display all lists as ordered numbered format
      nodes.push(
        <ol key={`o_${key++}`} className="doc-olist doc-olist-clean">
          {items.map((t, idx) => (
            <li key={idx}>{renderInline(t)}</li>
          ))}
        </ol>
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
            <li key={idx}>{renderInline(t)}</li>
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
        {renderInline(paraLines.join(' '))}
      </p>
    )
  }

  return nodes
}

function extractMermaidCode(content) {
  const text = String(content ?? '')

  // 1) Fenced code block detection (preferred)
  const fenced = text.match(/```mermaid\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()

  // 2) Find a mermaid directive line and collect until a likely section boundary.
  const lines = text.split('\n')
  const directiveRe = /^\s*(flowchart|graph|sequenceDiagram|gantt|classDiagram|stateDiagram)\b/i
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (directiveRe.test(lines[i])) {
      start = i
      break
    }
  }

  if (start === -1) return ''

  const endBoundaryRe = /^(#{1,6}\s)|^(\d+[.)]\s)|^\s*```|^\s*\*\*/
  const collected = []
  for (let i = start; i < lines.length; i++) {
    const l = lines[i]
    // stop if we see a clear markdown section boundary (header, numbered header, fenced code start/close, bold header)
    if (i > start && endBoundaryRe.test(l)) break
    collected.push(l)
  }

  return collected.join('\n').trim()
}

function MermaidChart({ code }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function run() {
      if (!code) {
        setSvg('')
        setError('No flowchart content found.')
        return
      }

      try {
        let mod = null
        try {
          mod = await import('mermaid')
        } catch (e1) {
          try {
            mod = await import('mermaid/dist/mermaid.esm.min.mjs')
          } catch (e2) {
            try {
              mod = await import('mermaid/dist/mermaid.esm.mjs')
            } catch (e3) {
              console.error('Mermaid import failed', e1, e2, e3)
              throw e3
            }
          }
        }

        const mermaid = mod?.default ?? mod

        mermaid.initialize?.({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        })

        const id = `flowchart-${Math.random().toString(36).slice(2)}`
        const rendered = await mermaid.render?.(id, code) ?? (await (mermaid.mermaidAPI?.render?.(id, code)))

        // mermaid.render may return { svg } or a string containing the svg
        const renderedSvg = rendered?.svg ?? (typeof rendered === 'string' ? rendered : '')
        if (!renderedSvg) throw new Error('Empty render result')

        if (active) {
          setSvg(renderedSvg)
          setError('')
        }
      } catch (err) {
        if (active) {
          setSvg('')
          console.error('Mermaid render error:', err)
          setError('Unable to render flowchart. See console for details.')
        }
      }
    }

    run()
    return () => {
      active = false
    }
  }, [code])

  if (error) {
    return <div className="error">{error}</div>
  }

  if (!svg) {
    return <div className="muted">Rendering flowchart…</div>
  }

  async function downloadSvg() {
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'flowchart.svg'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      // ignore
    }
  }

  async function downloadPng() {
    try {
      const svgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          // try to infer size from svg, fallback to 800x600
          const parser = new DOMParser()
          const doc = parser.parseFromString(svg, 'image/svg+xml')
          const svgEl = doc.documentElement
          const widthAttr = svgEl.getAttribute('width')
          const heightAttr = svgEl.getAttribute('height')
          const viewBox = svgEl.getAttribute('viewBox')
          let w = 800
          let h = 600
          if (widthAttr && heightAttr) {
            w = parseInt(widthAttr, 10) || w
            h = parseInt(heightAttr, 10) || h
          } else if (viewBox) {
            const parts = viewBox.split(/\s+/)
            if (parts.length === 4) {
              w = parseInt(parts[2], 10) || w
              h = parseInt(parts[3], 10) || h
            }
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Could not create PNG'))
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'flowchart.png'
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            resolve()
          }, 'image/png')
        }
        img.onerror = (err) => reject(err)
        img.src = svgData
      })
    } catch (e) {
      // ignore
    }
  }

  return (
    <div>
      <div
        className="mermaid-actions"
        style={{
            paddingTop: 10,
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <button type="button" className="secondary-btn" onClick={downloadSvg}>
          Download SVG
        </button>
        <button type="button" className="secondary-btn" onClick={downloadPng}>
          Download PNG
        </button>
      </div>
      <div className="mermaid-wrap" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
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
  const [exportingPdf, setExportingPdf] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenModalOpen, setRegenModalOpen] = useState(false)
  const [error, setError] = useState('')
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

  async function handleRegenerate(mode = 'overwrite') {
    if (!id) return

    setError('')
    setRegenerating(true)
    try {
      await generateBlueprint(id, mode)
      const [projectData, blueprintData] = await Promise.all([getProject(id), getBlueprint(id)])
      setProject(projectData)
      setBlueprint(blueprintData?.data ?? null)
      setRegenModalOpen(false)
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to regenerate blueprint'
      setError(msg)
    } finally {
      setRegenerating(false)
    }
  }

  const blueprintSections = useMemo(() => {
    if (Array.isArray(blueprint?.sections) && blueprint.sections.length > 0) {
      return blueprint.sections
        .slice()
        .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
        .map((section) => ({
          title: section?.title ?? '',
          content: section?.content ?? '',
        }))
    }
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
    const pinned = blueprintSections.filter((s) => allowed.has(normalizeTitle(s?.title)))
    const others = blueprintSections.filter(
      (s) => getSectionCategory(s?.title) === 'overview' && !allowed.has(normalizeTitle(s?.title)),
    )
    return [...pinned, ...others]
  }, [blueprintSections])

  const content = (() => {
    if (!project) return null

    const sectionsForView = blueprintSectionsByCategory[view] ?? []

    return (
      <>
        {!blueprint ? (
          <div className="blueprint-empty">
            <div className="blueprint-empty-icon">
              <HiOutlineDocumentText size={48} />
            </div>
            <h3>No Blueprint Generated Yet</h3>
            <p className="muted">
              Blueprints are generated automatically right after you submit the Create Project form.
              If you just created this project, please refresh in a moment.
            </p>
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
                const mermaidCode = view === 'flowchart' || view === 'usecase' ? extractMermaidCode(section.content) : ''
                return (
                  <div key={k} className="doc-section" role="region" aria-label={section.title}>
                    <div className="doc-section-summary">
                      <span className="doc-section-title">{section.title}</span>
                    </div>
                    <div className="doc-section-body">
                      {view === 'flowchart' || view === 'usecase' ? <MermaidChart code={mermaidCode} /> : renderDocContent(section.content)}
                    </div>
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
            <>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setRegenModalOpen(true)}
                disabled={regenerating}
              >
                <HiOutlineRefresh size={18} />
                {regenerating ? 'Regenerating…' : 'Regenerate'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleExportPdf}
                disabled={exportingPdf || regenerating}
              >
                <HiOutlineDocumentText size={18} />
                {exportingPdf ? 'Exporting…' : 'Export PDF'}
              </button>
            </>
          ) : null}
          {/* Generation happens from the Create Project flow */}
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
        <LoadingSpinner />
      ) : error ? (
        <div className="error" role="alert" style={{ marginTop: 18 }}>
          {error}
        </div>
      ) : (
        <div className="project-content">{content}</div>
      )}

      {regenModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Regenerate blueprint">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">Regenerate blueprint</h3>
                <div className="modal-subtitle muted">
                  Choose how to save the regenerated result.
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleRegenerate('overwrite')}
                  disabled={regenerating}
                >
                  {regenerating ? 'Regenerating…' : 'Overwrite'}
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleRegenerate('version')}
                  disabled={regenerating}
                >
                  {regenerating ? 'Regenerating…' : `Keep as version ${(Number(blueprint?.version) || 1) + 1}`}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setRegenModalOpen(false)}
                  disabled={regenerating}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
