import { http } from './http'

export async function listProjects() {
  const res = await http.get('/api/projects')
  return res.data
}

export async function getProject(id) {
  const res = await http.get(`/api/projects/${id}`)
  return res.data
}

export async function createProject(payload) {
  const res = await http.post('/api/projects', payload)
  return res.data
}

