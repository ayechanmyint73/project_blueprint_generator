import { useState, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getApiError(err, fallback) {
  const status = err?.response?.status
  const data = err?.response?.data
  if (data?.message) return status ? `${data.message} (HTTP ${status})` : data.message
  if (data?.errors) {
    const flat = Object.values(data.errors).flat().join('\n')
    return status ? `${flat} (HTTP ${status})` : flat
  }
  if (typeof data === 'string' && data.trim()) {
    const snippet = data.trim().slice(0, 220)
    return status ? `${snippet} (HTTP ${status})` : snippet
  }
  if (status) return `${fallback} (HTTP ${status})`
  return fallback
}

export default function Register() {
  const { register} = useAuth()
  const location = useLocation()
  const from = useMemo(() => location.state?.from ?? '/projects', [location.state])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  })

  const navigate = useNavigate()

  const fieldErrors = (() => {
    const errors = {}
    if (!name.trim()) errors.name = 'Name is required'
    else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters'

    if (!email.trim()) errors.email = 'Email is required'
    else if (!isValidEmail(email.trim())) errors.email = 'Enter a valid email address'

    if (!password) errors.password = 'Password is required'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters'

    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password'
    else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'

    return errors
  })()

  const isFormValid = Object.keys(fieldErrors).length === 0

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    })
    if (!isFormValid) return
    setSubmitting(true)
    try {
      await register({ name: name.trim(), email: email.trim(), password, remember })
      navigate('/projects', { replace: true })
    } catch (err) {
      setError(getApiError(err, 'Registration failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="landing-page" style={{ height: '100svh', overflow: 'hidden' }}>
      <header className="landing-header">
        <button className="landing-brand" type="button" onClick={() => navigate('/')}>
          <img className="landing-logo" src="/logo.png" alt="" />
          <span className="landing-brand-name">Blueprint Generator</span>
        </button>
      </header>

      <main className="landing-main" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', height: 'calc(100svh - 70px)', paddingTop: '32px', overflow: 'auto' }}>
      <div className="auth-card">
        <div className="auth-subtitle">Please enter your details</div>
        <div className="auth-title">Create Your Account</div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div>
            <label className="sr-only" htmlFor="register-name">
              Name
            </label>
            <input
              id="register-name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={touched.name && Boolean(fieldErrors.name)}
              required
            />
            {touched.name && fieldErrors.name ? (
              <div className="field-error">{fieldErrors.name}</div>
            ) : null}
          </div>

          <div>
            <label className="sr-only" htmlFor="register-email">
              Email address
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={touched.email && Boolean(fieldErrors.email)}
              required
            />
            {touched.email && fieldErrors.email ? (
              <div className="field-error">{fieldErrors.email}</div>
            ) : null}
          </div>

          <div>
            <label className="sr-only" htmlFor="register-password">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              aria-invalid={touched.password && Boolean(fieldErrors.password)}
              required
            />
            {touched.password && fieldErrors.password ? (
              <div className="field-error">{fieldErrors.password}</div>
            ) : null}
          </div>

          <div>
            <label className="sr-only" htmlFor="register-confirm">
              Confirm password
            </label>
            <input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
              aria-invalid={touched.confirmPassword && Boolean(fieldErrors.confirmPassword)}
              required
            />
            {touched.confirmPassword && fieldErrors.confirmPassword ? (
              <div className="field-error">{fieldErrors.confirmPassword}</div>
            ) : null}
          </div>

          <div className="auth-actions">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
          </div>

          {error ? (
            <pre className="error" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
              {error}
            </pre>
          ) : null}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        
        {/* <div className="divider">or</div>
        
        <button 
          type="button" 
          className="secondary-btn" 
          style={{ 
            width: '100%', 
            justifyContent: 'center',
            marginBottom: '8px'
          }}
          onClick={async () => {
            setSubmitting(true)
            setError('')
            try {
              await guestLogin({ remember })
              navigate(from, { replace: true })
            } catch (err) {
              setError(getApiError(err, 'Guest login failed'))
            } finally {
              setSubmitting(false)
            }
          }}
        >
          Continue as Guest
        </button> */}

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
  </main>
</div>
  )
}
