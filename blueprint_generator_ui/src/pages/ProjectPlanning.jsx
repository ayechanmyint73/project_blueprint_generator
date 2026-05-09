import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlineSparkles,
  HiOutlinePlus,
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePencil,
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

  async function onGenerateAi() {
    setBusy(true)
    setError('')
    try {
      const res = await generateDevelopmentPlanWithOptions(id)
      setPlan(res?.data ?? null)
      await refreshProgress()
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to generate plan')
    } finally {
      setBusy(false)
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
          <button type="button" className="secondary-btn" onClick={onGenerateAi} disabled={busy}>
            <HiOutlineSparkles size={18} />
            Generate with AI
          </button>
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
                                if (!window.confirm('Delete this phase and all its tasks?')) return
                                const patched = onDeletePhaseLocal(p.id)
                                void persistPlan(patched, { refresh: true })
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
                                        if (!window.confirm('Delete this task?')) return
                                        const patched = onDeleteTaskLocal(p.id, t.id)
                                        void persistPlan(patched, { refresh: true })
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
    </div>
  )
}
