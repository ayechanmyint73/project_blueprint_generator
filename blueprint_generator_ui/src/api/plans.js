import { http } from './http'

export async function generateDevelopmentPlan(projectId) {
  const res = await http.post(`/api/projects/${projectId}/generate-plan`)
  return res.data
}

export async function generateDevelopmentPlanWithOptions(projectId, options = {}) {
  const res = await http.post(`/api/projects/${projectId}/generate-plan`, options)
  return res.data
}

export async function getDevelopmentPlan(projectId) {
  const res = await http.get(`/api/projects/${projectId}/plan`)
  return res.data
}

export async function saveDevelopmentPlan(projectId, payload) {
  const res = await http.put(`/api/projects/${projectId}/plan`, payload)
  return res.data
}

export async function updatePlanTask(projectId, payload) {
  const res = await http.put(`/api/projects/${projectId}/plan/task`, payload)
  return res.data
}

export async function getPlanProgress(projectId) {
  const res = await http.get(`/api/projects/${projectId}/plan-progress`)
  return res.data
}
