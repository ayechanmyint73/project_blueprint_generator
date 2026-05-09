import { http } from './http'

export async function generateBlueprint(projectId) {
  const res = await http.post(`/api/projects/${projectId}/generate`)
  return res.data
}

export async function getBlueprint(projectId) {
  const res = await http.get(`/api/projects/${projectId}/blueprint`)
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
