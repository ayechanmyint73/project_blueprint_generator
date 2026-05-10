import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlineSparkles,
  HiOutlinePlus,
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineExclamation,
} from 'react-icons/hi'
import { getProject } from '../api/projects'
import {
  generateDevelopmentPlanWithOptions,
  getDevelopmentPlan,
  getPlanProgress,
  saveDevelopmentPlan,
  updatePlanTask,
} from '../api/plans'
import LoadingSpinner from '../components/LoadingSpinner'

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function normalizePlan(plan) {
  if (!plan) return null
  const tasksJson = plan.tasks_json
  if (tasksJson && typeof tasksJson === 'object' && Array.isArray(tasksJson.phases)) return plan
  if (Array.isArray(tasksJson)) {
    return {
      ...plan,
      tasks_json: {
        phases: [
          { id: 'phase_1', title: 'Phase 1', tasks: tasksJson },
        ],
      },
    }
  }
  return { ...plan, tasks_json: { phases: [] } }
}

function formatMethodology(value) {
  const v = String(value ?? '').trim().toLowerCase()
  if (!v) return ''
  if (v === 'scrum') return 'Scrum'
  if (v === 'kanban') return 'Kanban'
  if (v === 'waterfall') return 'Waterfall'
  if (v === 'hybrid') return 'Hybrid'
  return value
}

function formatDisplayDate(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  const datePart = raw.includes('T') ? raw.split('T')[0] : raw
  const [y, m, d] = datePart.split('-').map((n) => Number(n))
  if (!y || !m || !d) return datePart

  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt)
}

export default function ProjectPlanning() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [plan, setPlan] = useState(null)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // const [aiMode, setAiMode] = useState('phases') // 'phases' | 'tasks_only'
  const [editingPhaseId, setEditingPhaseId] = useState(null)
  const [editingTask, setEditingTask] = useState(null) // { phaseId, taskId } | null
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [regenModalOpen, setRegenModalOpen] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [deletePhaseModalOpen, setDeletePhaseModalOpen] = useState(false)
  const [deletePhaseTargetId, setDeletePhaseTargetId] = useState(null)
  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false)
  const [deleteTaskTarget, setDeleteTaskTarget] = useState(null) // { phaseId, taskId }
  const [aiOptions, setAiOptions] = useState({
    methodology: 'scrum',
    developer_count: '',
    start_date: '',
    end_date: '',
    generation_notes: '',
  })

  const normalizedPlan = useMemo(() => normalizePlan(plan), [plan])
  const phases = useMemo(() => normalizedPlan?.tasks_json?.phases ?? [], [normalizedPlan])

  function buildSavePayload(planLike) {
    const p = normalizePlan(planLike)
    const nextPhases = p?.tasks_json?.phases ?? []
    return {
      source_type: 'manual',
      tasks_json: {
        phases: nextPhases.map((ph) => ({
          id: ph.id,
          title: String(ph.title ?? '').trim() || 'Phase',
          tasks: (ph.tasks ?? []).map((t) => ({
            id: t.id,
            title: String(t.title ?? '').trim(),
            status: t.status ?? 'pending',
            estimated_time: t.estimated_time ?? null,
            priority: t.priority ?? null,
          })),
        })),
      },
    }
  }

  const overall = useMemo(() => {
    let total = 0
    let completed = 0
    for (const p of phases) {
      const list = p?.tasks ?? []
      total += list.length
      completed += list.filter((t) => t?.status === 'completed').length
    }
    const pct = total ? Math.round((completed / total) * 100) : 0
    return { total, completed, pct }
  }, [phases])

  const displayOverallPct = useMemo(() => {
    if (typeof progress === 'number' && !Number.isNaN(progress)) return progress
    return overall.pct
  }, [overall.pct, progress])

  const hasPlanContent = useMemo(() => {
    return phases.length > 0
  }, [phases.length])

  const planningMeta = useMemo(() => {
    const items = []
    const methodologyLabel = formatMethodology(plan?.methodology)
    if (methodologyLabel) items.push(`Methodology: ${methodologyLabel}`)
    if (plan?.developer_count) items.push(`Team: ${plan.developer_count} developer${Number(plan.developer_count) > 1 ? 's' : ''}`)
    if (plan?.start_date) items.push(`Target Start Date: ${formatDisplayDate(plan.start_date)}`)
    if (plan?.end_date) items.push(`Target End Date: ${formatDisplayDate(plan.end_date)}`)
    return items
  }, [plan])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setLoading(true)
      try {
        const [p, pl, prog] = await Promise.all([
          getProject(id),
          getDevelopmentPlan(id).catch((e) => {
            if (e?.response?.status === 404) return null
            throw e
          }),
          getPlanProgress(id).catch(() => null),
        ])
        if (cancelled) return
        setProject(p)
        setPlan(pl)
        setProgress(prog?.progress ?? null)
      } catch (e) {
        if (cancelled) return
        setError(e?.response?.data?.message ?? 'Failed to load development plan')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  async function refreshProgress() {
    try {
      const prog = await getPlanProgress(id)
      setProgress(prog?.progress ?? null)
    } catch {
      // ignore
    }
  }

  async function persistPlan(planLike, opts = {}) {
    const { refresh = true, showBusy = false } = opts
    if (showBusy) setBusy(true)
    setSaving(true)
    try {
      const payload = buildSavePayload(planLike)
      const res = await saveDevelopmentPlan(id, payload)
      setPlan(res?.data ?? planLike)
      if (refresh) await refreshProgress()
      return res?.data ?? planLike
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to save plan')
      return null
    } finally {
      setSaving(false)
      if (showBusy) setBusy(false)
    }
  }

  async function onGenerateAi(options = {}) {
    setBusy(true)
    setIsGeneratingPlan(true)
    setAiModalOpen(false)
    setError('')
    try {
      const payload = {
        methodology: options.methodology || 'scrum',
        developer_count: options.developer_count ? Number(options.developer_count) : undefined,
        start_date: options.start_date || undefined,
        end_date: options.end_date || undefined,
        generation_notes: options.generation_notes || undefined,
      }
      const res = await generateDevelopmentPlanWithOptions(id, payload)
      setPlan(res?.data ?? null)
      await refreshProgress()
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to generate plan')
    } finally {
      setBusy(false)
      setIsGeneratingPlan(false)
      setIsRegenerating(false)
    }
  }

  function ensureManualPlan() {
    setPlan((prev) => {
      if (prev) return prev
      return { source_type: 'manual', content: null, tasks_json: [] }
    })
  }

  function ensurePhase() {
    ensureManualPlan()
    setPlan((prev) => {
      const next = normalizePlan(prev ?? { source_type: 'manual', content: null, tasks_json: { phases: [] } })
      const nextPhases = [...(next.tasks_json?.phases ?? [])]
      if (!nextPhases.length) {
        nextPhases.push({ id: uid(), title: 'Phase 1', tasks: [] })
      }
      return { ...next, source_type: next.source_type ?? 'manual', tasks_json: { phases: nextPhases } }
    })
  }

  function onAddPhase() {
    ensureManualPlan()
    let nextPlan = null
    setPlan((prev) => {
      const next = normalizePlan(prev ?? { source_type: 'manual', content: null, tasks_json: { phases: [] } })
      const nextPhases = [...(next.tasks_json?.phases ?? [])]
      const newPhaseId = uid()
      nextPhases.push({ id: newPhaseId, title: `Phase ${nextPhases.length + 1}`, tasks: [] })
      nextPlan = { ...next, source_type: 'manual', tasks_json: { phases: nextPhases } }
      return nextPlan
    })
    if (nextPlan) {
      const created = nextPlan.tasks_json?.phases?.[nextPlan.tasks_json.phases.length - 1]
      if (created?.id) setEditingPhaseId(created.id)
      void persistPlan(nextPlan, { refresh: false })
    }
  }

  async function onAddTask(phaseId) {
    ensurePhase()
    let nextPlan = null
    let newTaskId = null
    setPlan((prev) => {
      const next = normalizePlan(prev ?? { source_type: 'manual', content: null, tasks_json: { phases: [] } })
      const nextPhases = (next.tasks_json?.phases ?? []).map((p) => {
        if (p.id !== phaseId) return p
        const list = Array.isArray(p.tasks) ? [...p.tasks] : []
        newTaskId = uid()
        list.push({ id: newTaskId, title: '', status: 'pending' })
        return { ...p, tasks: list }
      })
      nextPlan = { ...next, source_type: 'manual', tasks_json: { phases: nextPhases } }
      return nextPlan
    })
    if (nextPlan) {
      if (newTaskId) setEditingTask({ phaseId, taskId: newTaskId })
      await persistPlan(nextPlan, { refresh: false })
    }
  }

  function onUpdatePhaseLocal(phaseId, patch) {
    const nextPlan = normalizePlan(plan ?? { source_type: 'manual', content: null, tasks_json: { phases: [] } })
    const nextPhases = (nextPlan?.tasks_json?.phases ?? []).map((p) => (p.id === phaseId ? { ...p, ...patch } : p))
    const patchedPlan = { ...nextPlan, source_type: 'manual', tasks_json: { phases: nextPhases } }
    setPlan(patchedPlan)
    return patchedPlan
  }

  function onDeletePhaseLocal(phaseId) {
    const nextPlan = normalizePlan(plan ?? { source_type: 'manual', content: null, tasks_json: { phases: [] } })
    const nextPhases = (nextPlan?.tasks_json?.phases ?? []).filter((p) => p.id !== phaseId)
    const patchedPlan = { ...nextPlan, source_type: 'manual', tasks_json: { phases: nextPhases } }
    setPlan(patchedPlan)
    return patchedPlan
  }

  function onUpdateTaskTitleLocal(phaseId, taskId, title) {
    const nextPlan = normalizePlan(plan ?? { source_type: 'manual', content: null, tasks_json: { phases: [] } })
    const nextPhases = (nextPlan?.tasks_json?.phases ?? []).map((p) => {
      if (p.id !== phaseId) return p
      const nextTasks = (p.tasks ?? []).map((t) => (t?.id === taskId ? { ...t, title } : t))
      return { ...p, tasks: nextTasks }
    })
    const patchedPlan = { ...nextPlan, source_type: 'manual', tasks_json: { phases: nextPhases } }
    setPlan(patchedPlan)
    return patchedPlan
  }

  function onDeleteTaskLocal(phaseId, taskId) {
    const nextPlan = normalizePlan(plan ?? { source_type: 'manual', content: null, tasks_json: { phases: [] } })
    const nextPhases = (nextPlan?.tasks_json?.phases ?? []).map((p) => {
      if (p.id !== phaseId) return p
      const nextTasks = (p.tasks ?? []).filter((t) => t?.id !== taskId)
      return { ...p, tasks: nextTasks }
    })
    const patchedPlan = { ...nextPlan, source_type: 'manual', tasks_json: { phases: nextPhases } }
    setPlan(patchedPlan)
    return patchedPlan
  }

  async function onSaveManual() {
    await persistPlan(plan, { refresh: true, showBusy: true })
  }

  async function onToggleTask(phaseId, taskId, checked) {
    const status = checked ? 'completed' : 'pending'
    // Optimistic local update
    const nextPlan = normalizePlan(plan ?? { source_type: 'manual', content: null, tasks_json: { phases: [] } })
    const nextPhases = (nextPlan?.tasks_json?.phases ?? []).map((p) => {
      if (p.id !== phaseId) return p
      const nextTasks = (p.tasks ?? []).map((t) => (t?.id === taskId ? { ...t, status } : t))
      return { ...p, tasks: nextTasks }
    })
    const patchedPlan = { ...nextPlan, tasks_json: { phases: nextPhases } }
    setPlan(patchedPlan)

    if (normalizedPlan?.source_type === 'ai') {
      setBusy(true)
      setError('')
      try {
        const res = await updatePlanTask(id, { task_id: taskId, status })
        setPlan(res?.data ?? patchedPlan)
        await refreshProgress()
      } catch (e) {
        setError(e?.response?.data?.message ?? 'Failed to update task')
      } finally {
        setBusy(false)
      }
      return
    }

    // Manual plan: save whole plan to persist checkbox changes
    setBusy(true)
    setError('')
    try {
      const payload = buildSavePayload(patchedPlan)
      const res = await saveDevelopmentPlan(id, payload)
      setPlan(res?.data ?? patchedPlan)
      await refreshProgress()
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to save plan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page project-page">
      <div className="project-hero">
        <div className="project-hero-left">
          <Link className="project-back" to={`/projects/${id}`} aria-label="Back to project">
            <HiOutlineArrowLeft size={18} />
          </Link>
          <div className="project-hero-text">
            <div className="project-hero-title">Development Plan</div>
            <div className="muted project-hero-subtitle">{project?.project_name ?? 'Project'}</div>
            <div className="project-hero-meta">
              <span className="muted">{progress == null ? 'Progress: —' : `Progress: ${progress}%`}</span>
              <span className="meta-status">
                <span className="status-dot" aria-hidden="true" />
                {plan?.source_type === 'ai' ? 'AI' : 'Manual'}
              </span>
              {planningMeta.map((meta, idx) => (
                <span key={`${meta}_${idx}`} className="muted">{meta}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="project-hero-actions">
          <button type="button" className="secondary-btn" onClick={onAddPhase} disabled={busy}>
            <HiOutlinePlus size={18} />
            Add phase
          </button>
          {/* <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>AI:</span>
            <select value={aiMode} onChange={(e) => setAiMode(e.target.value)} disabled={busy}>
              <option value="phases">Phases + tasks</option>
              <option value="tasks_only">Tasks only</option>
            </select>
          </label> */}
          {hasPlanContent ? (
            <button type="button" className="secondary-btn" onClick={() => setRegenModalOpen(true)} disabled={busy}>
              <HiOutlineSparkles size={18} />
              Regenerate
            </button>
          ) : (
            <button type="button" className="secondary-btn" onClick={() => { setIsRegenerating(false); setAiModalOpen(true) }} disabled={busy}>
              <HiOutlineSparkles size={18} />
              Generate with AI
            </button>
          )}
          <button type="button" className="primary-btn" onClick={onSaveManual} disabled={busy}>
            Save
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="error" role="alert" style={{ marginTop: 18 }}>
          {error}
        </div>
      ) : !hasPlanContent ? (
        <div className="blueprint-empty" style={{ marginTop: 18 }}>
          <div className="blueprint-empty-title">How would you like to start your development plan?</div>
          <div className="blueprint-empty-sub muted">
            You can create phases manually, or let AI generate an initial plan for you.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
            <button type="button" className="secondary-btn" onClick={onAddPhase} disabled={busy}>
              <HiOutlinePlus size={18} />
              Create Manually
            </button>
            <button type="button" className="primary-btn" onClick={() => { setIsRegenerating(false); setAiModalOpen(true) }} disabled={busy}>
              <HiOutlineSparkles size={18} />
              Generate with AI
            </button>
          </div>
        </div>
      ) : (
        <div className="project-content" style={{ marginTop: 18 }}>
          <div className="project-section">
            <div className="project-section-title">
              <span className="section-icon" aria-hidden="true">
                <HiOutlineCalendar size={18} />
              </span>
              <span className="section-title-text">Overall Progress</span>
              <span className="section-meta muted">{displayOverallPct}%</span>
            </div>
            <div className="section-divider" />
            <div className="project-section-body">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${displayOverallPct}%` }} />
              </div>
              <div className="muted" style={{ marginTop: 10 }}>
                {overall.completed} of {overall.total} tasks completed
              </div>
            </div>
          </div>

          <div className="project-section">
            <div className="project-section-title">
              <span className="section-icon" aria-hidden="true">
                <HiOutlineCalendar size={18} />
              </span>
              <span className="section-title-text">Development Roadmap</span>
            </div>
            <div className="section-divider" />
            <div className="project-section-body">
              {phases.length === 0 ? (
                <div className="muted">No phases yet. Add phases manually or generate with AI.</div>
              ) : (
                <div className="phase-list">
                  {phases.map((p, idx) => {
                    const list = p?.tasks ?? []
                    const done = list.filter((t) => t?.status === 'completed').length
                    const pct = list.length ? Math.round((done / list.length) * 100) : 0

                    return (
                      <details key={p.id ?? idx} className="phase-card" open>
                        <summary className="phase-head">
                          <span className="phase-badge">{idx + 1}</span>
                          <span className="phase-title">{p.title ?? `Phase ${idx + 1}`}</span>
                          <span className="phase-sub muted">{pct}% complete</span>
                          <span className="phase-bar">
                            <span className="phase-bar-fill" style={{ width: `${pct}%` }} />
                          </span>
                        </summary>

                        <div className="phase-body">
                          <div className="phase-row" style={{ marginBottom: 10 }}>
                            {editingPhaseId === p.id ? (
                              <input
                                type="text"
                                value={p.title ?? ''}
                                placeholder={`Phase ${idx + 1}`}
                                onChange={(e) => onUpdatePhaseLocal(p.id, { title: e.target.value })}
                                onBlur={(e) => {
                                  setEditingPhaseId(null)
                                  void persistPlan(onUpdatePhaseLocal(p.id, { title: e.target.value }), { refresh: false })
                                }}
                                disabled={busy}
                                className="phase-title-input"
                                autoFocus
                              />
                            ) : (
                              <div className="phase-title-display">
                                <span>{p.title ?? `Phase ${idx + 1}`}</span>
                              </div>
                            )}

                            <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setEditingPhaseId(p.id)}
                              disabled={busy || saving}
                              aria-label="Edit phase"
                              title="Edit phase"
                            >
                                <HiOutlinePencil size={18} />
                              </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => {
                                setDeletePhaseTargetId(p.id)
                                setDeletePhaseModalOpen(true)
                              }}
                              disabled={busy || saving}
                              aria-label="Delete phase"
                              title="Delete phase"
                            >
                                <HiOutlineTrash size={18} />
                              </button>
                            </div>
                          </div>
                          {list.length === 0 ? (
                            <div className="muted">No tasks in this phase.</div>
                          ) : (
                            <div className="checklist">
                              {list.map((t) => (
                                <div key={t.id} className={`check ${t.status === 'completed' ? 'done' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={t.status === 'completed'}
                                    onChange={(e) => onToggleTask(p.id, t.id, e.target.checked)}
                                    disabled={busy || saving}
                                  />
                                  {editingTask?.phaseId === p.id && editingTask?.taskId === t.id ? (
                                    <input
                                      type="text"
                                      value={t.title ?? ''}
                                      placeholder="Task title"
                                      onChange={(e) => onUpdateTaskTitleLocal(p.id, t.id, e.target.value)}
                                      onBlur={(e) => {
                                        setEditingTask(null)
                                        void persistPlan(onUpdateTaskTitleLocal(p.id, t.id, e.target.value), { refresh: false })
                                      }}
                                      disabled={busy}
                                      className="check-text"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="check-text">{t.title || 'Untitled task'}</span>
                                  )}

                                  <div className="row-actions">
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      onClick={() => setEditingTask({ phaseId: p.id, taskId: t.id })}
                                      disabled={busy || saving}
                                      aria-label="Edit task"
                                      title="Edit task"
                                    >
                                      <HiOutlinePencil size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn danger"
                                    onClick={() => {
                                      setDeleteTaskTarget({ phaseId: p.id, taskId: t.id })
                                      setDeleteTaskModalOpen(true)
                                    }}
                                      disabled={busy || saving}
                                      aria-label="Delete task"
                                      title="Delete task"
                                    >
                                      <HiOutlineTrash size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <button type="button" className="link-btn" onClick={() => onAddTask(p.id)} disabled={busy}>
                            + Add task
                          </button>
                        </div>
                      </details>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {aiModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="AI planning preferences">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">Generate Development Plan</h3>
                <div className="modal-subtitle muted">Set planning preferences for better AI alignment.</div>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 10 }}>
                <label className="muted" htmlFor="methodology">Methodology</label>
                <select
                  id="methodology"
                  className="projects-status"
                  value={aiOptions.methodology}
                  onChange={(e) => setAiOptions((prev) => ({ ...prev, methodology: e.target.value }))}
                >
                  <option value="scrum">Scrum</option>
                  <option value="kanban">Kanban</option>
                  <option value="waterfall">Waterfall</option>
                  <option value="hybrid">Hybrid</option>
                </select>

                <label className="muted" htmlFor="developer_count">Number of Developers (optional)</label>
                <input
                  id="developer_count"
                  type="number"
                  min="1"
                  className="projects-search-input"
                  value={aiOptions.developer_count}
                  onChange={(e) => setAiOptions((prev) => ({ ...prev, developer_count: e.target.value }))}
                  placeholder="e.g. 3"
                />

                <label className="muted" htmlFor="start_date">Targeted Start Date (optional)</label>
                <input
                  id="start_date"
                  type="date"
                  className="projects-search-input"
                  value={aiOptions.start_date}
                  onChange={(e) => setAiOptions((prev) => ({ ...prev, start_date: e.target.value }))}
                />

                <label className="muted" htmlFor="end_date">Targeted End Date (optional)</label>
                <input
                  id="end_date"
                  type="date"
                  className="projects-search-input"
                  value={aiOptions.end_date}
                  onChange={(e) => setAiOptions((prev) => ({ ...prev, end_date: e.target.value }))}
                />

                <label className="muted" htmlFor="generation_notes">Additional Notes (optional)</label>
                <textarea
                  id="generation_notes"
                  className="projects-search-input"
                  rows={3}
                  value={aiOptions.generation_notes}
                  onChange={(e) => setAiOptions((prev) => ({ ...prev, generation_notes: e.target.value }))}
                  placeholder="Any constraints or priorities for this plan..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setAiModalOpen(false)
                    setIsRegenerating(false)
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={busy || (aiOptions.end_date && aiOptions.start_date && aiOptions.end_date < aiOptions.start_date)}
                  onClick={() => onGenerateAi(aiOptions)}
                >
                  {busy ? 'Generating…' : 'Generate Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deletePhaseModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm delete phase">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">Delete Phase</h3>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <HiOutlineExclamation size={32} style={{ color: '#ef4444', flexShrink: 0 }} />
                <p className="muted" style={{ margin: 0 }}>Are you sure you want to delete this phase and all its tasks? This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => { setDeletePhaseModalOpen(false); setDeletePhaseTargetId(null) }} disabled={busy || saving}>
                  Cancel
                </button>
                <button type="button" className="primary-btn" style={{ backgroundColor: '#dc2626' }} onClick={() => {
                  if (!deletePhaseTargetId) return
                  const patched = onDeletePhaseLocal(deletePhaseTargetId)
                  void persistPlan(patched, { refresh: true })
                  setDeletePhaseModalOpen(false)
                  setDeletePhaseTargetId(null)
                }} disabled={busy || saving}>
                  {busy || saving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTaskModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm delete task">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">Delete Task</h3>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <HiOutlineExclamation size={32} style={{ color: '#ef4444', flexShrink: 0 }} />
                <p className="muted" style={{ margin: 0 }}>Are you sure you want to delete this task? This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => { setDeleteTaskModalOpen(false); setDeleteTaskTarget(null) }} disabled={busy || saving}>
                  Cancel
                </button>
                <button type="button" className="primary-btn" style={{ backgroundColor: '#dc2626' }} onClick={() => {
                  if (!deleteTaskTarget) return
                  const patched = onDeleteTaskLocal(deleteTaskTarget.phaseId, deleteTaskTarget.taskId)
                  void persistPlan(patched, { refresh: true })
                  setDeleteTaskModalOpen(false)
                  setDeleteTaskTarget(null)
                }} disabled={busy || saving}>
                  {busy || saving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {regenModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Regenerate development plan">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">Regenerate development plan</h3>
                <div className="modal-subtitle muted">
                  This will replace current phases and tasks with a new AI-generated plan.
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setRegenModalOpen(false)} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={busy}
                  onClick={() => {
                    setRegenModalOpen(false)
                    setIsRegenerating(true)
                    setAiModalOpen(true)
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {busy && isGeneratingPlan ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={isRegenerating ? 'Regenerating development plan' : 'Generating development plan'}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">{isRegenerating ? 'Regenerating Development Plan' : 'Generating Development Plan'}</h3>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <LoadingSpinner />
                <p className="muted" style={{ margin: 0 }}>
                  {isRegenerating
                    ? 'Please wait while we replace your current phases and tasks with a newly generated plan.'
                    : 'Please wait while we generate your development plan.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
