import { http } from './http'

export async function generateBlueprint(projectId, regenerateMode = 'overwrite') {
  const res = await http.post(`/api/projects/${projectId}/generate`, {
    regenerate_mode: regenerateMode,
  })
  return res.data
}

export async function getBlueprint(projectId, version = null) {
  const res = await http.get(`/api/projects/${projectId}/blueprint`, {
    params: version ? { version } : undefined,
  })
  return res.data
}

export async function listBlueprintVersions(projectId) {
  const res = await http.get(`/api/projects/${projectId}/blueprints`)
  return res.data
}

export async function updateBlueprintSection(projectId, sectionId, content) {
  const res = await http.put(`/api/projects/${projectId}/blueprint/sections/${sectionId}`, {
    content,
  })
  return res.data
}

export async function exportBlueprintPdf(projectId) {
  const res = await http.get(`/api/projects/${projectId}/export-pdf`, {
    responseType: 'blob',
  })
  return res
}

export async function generateTestingStrategy(projectId) {
  const res = await http.post(`/api/projects/${projectId}/generate-testing-strategy`)
  return res.data
}

export async function getTestingStrategies(projectId) {
  const res = await http.get(`/api/projects/${projectId}/testing-strategies`)
  return res.data
}

export async function generateAndSaveTestingStrategies(projectId) {
  const res = await http.post(`/api/projects/${projectId}/testing-strategies/generate`)
  return res.data
}

export async function createTestingStrategy(projectId, payload) {
  const res = await http.post(`/api/projects/${projectId}/testing-strategies`, payload)
  return res.data
}

export async function updateTestingStrategy(projectId, testCaseId, payload) {
  const res = await http.put(`/api/projects/${projectId}/testing-strategies/${testCaseId}`, payload)
  return res.data
}

export async function deleteTestingStrategy(projectId, testCaseId) {
  const res = await http.delete(`/api/projects/${projectId}/testing-strategies/${testCaseId}`)
  return res.data
}
