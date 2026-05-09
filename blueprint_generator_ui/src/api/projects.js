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

export async function uploadProjectFile(file) {
  const form = new FormData()
  form.append('file', file)

  const res = await http.post('/api/projects/upload', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return res.data
}

export async function getDashboardStats() {
  const res = await http.get('/api/projects/dashboard/stats')
  return res.data
}
