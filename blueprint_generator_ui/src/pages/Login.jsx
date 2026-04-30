import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })

  const navigate = useNavigate()
  const location = useLocation()
  const from = useMemo(() => location.state?.from ?? '/', [location.state])

  const fieldErrors = useMemo(() => {
    const errors = {}
    if (!email.trim()) errors.email = 'Email is required'
    else if (!isValidEmail(email.trim())) errors.email = 'Enter a valid email address'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    return errors
  }, [email, password])

  const isFormValid = Object.keys(fieldErrors).length === 0

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setTouched({ email: true, password: true })
    if (!isFormValid) return
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password, remember })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-subtitle">Please enter your details</div>
        <div className="auth-title">Welcome back</div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div>
            <label className="sr-only" htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
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
            <label className="sr-only" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
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

          <div className="auth-actions">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Forgot password
            </a>
          </div>

          {error ? <div className="error" role="alert">{error}</div> : null}

          <button type="submit" disabled={submitting || !isFormValid}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* <div className="divider">or</div>
        <button type="button" className="secondary-btn" disabled>
          Sign in with Google (next)
        </button> */}

        <div className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </div>
      </div>
    </div>
  )
}
