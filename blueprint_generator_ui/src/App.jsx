import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import ProjectsList from './pages/ProjectsList'
import ProjectCreate from './pages/ProjectCreate'
import ProjectDetail from './pages/ProjectDetail'
import ProjectPlanning from './pages/ProjectPlanning'
import Settings from './pages/Settings'
import AppShell from './components/AppShell'

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/new" element={<ProjectCreate />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/planning" element={<ProjectPlanning />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
