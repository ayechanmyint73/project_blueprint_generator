import { useState } from 'react'
import { useAuth } from '../auth/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const [description, setDescription] = useState('')

  return (
    <div className="page">
      <h1>Project Blueprint Generator</h1>
      <p className="muted">
        Signed in as <strong>{user?.name ?? user?.email}</strong>
      </p>

      <div className="card">
        <label className="stack">
          Project description
          <textarea
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the project you want to build…"
          />
        </label>
        <button type="button" disabled>
          Generate blueprint (next)
        </button>
        <p className="muted" style={{ marginTop: 8 }}>
          Hook this button to your existing blueprint-generation API endpoint.
        </p>
      </div>
    </div>
  )
}
