import { useState, useEffect } from 'react'
import { useAuth } from '../auth/useAuth'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  })
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Track last user ID to detect when user data actually changes
  const lastUserId = user?.id
  useEffect(() => {
    if (user) {
      // Queue state update after browser paint to avoid cascading render
      requestIdleCallback(() => {
        setProfileData(prev => {
          if (prev.name !== user.name || prev.email !== user.email) {
            return {
              name: user.name || '',
              email: user.email || ''
            }
          }
          return prev
        })
      })
    }
  }, [lastUserId, user])

  async function handleProfileUpdate(e) {
    e.preventDefault()
    setLoading(true)
    setProfileMessage('')
    
    try {
      const response = await fetch('http://localhost:8000/api/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
      })

      const data = await response.json()
      
      if (response.ok) {
        setProfileMessage('Profile updated successfully!')
        await refreshUser()
      } else {
        setProfileMessage(data.message || 'Failed to update profile')
      }
    } catch {
      setProfileMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setLoading(true)
    setPasswordMessage('')
    
    try {
      const response = await fetch('http://localhost:8000/api/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          new_password_confirmation: passwordData.new_password_confirmation
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setPasswordMessage('Password changed successfully!')
        setPasswordData({
          current_password: '',
          new_password: '',
          new_password_confirmation: ''
        })
      } else {
        setPasswordMessage(data.message || 'Failed to change password')
      }
    } catch {
      setPasswordMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="dash-subtitle">Manage your account preferences</p>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' }}>
        <div className="project-section">
          <div className="project-section-title">
            <div className="section-icon">
              <span>👤</span>
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>Profile Information</div>
              <div style={{ fontSize: '13px', color: 'var(--slate)', opacity: '0.8' }}>Update your account details</div>
            </div>
          </div>
          
          <div className="project-section-body" style={{ marginTop: '18px' }}>
            <form onSubmit={handleProfileUpdate} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-h)' }}>Full Name</label>
                <input
                  type="text"
                  className="control"
                  style={{ width: '100%', minWidth: 'unset' }}
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-h)' }}>Email Address</label>
                <input
                  type="email"
                  className="control"
                  style={{ width: '100%', minWidth: 'unset' }}
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  required
                />
              </div>

              {profileMessage && (
                <div style={{ 
                  padding: '10px 14px', 
                  borderRadius: '10px', 
                  fontSize: '13px',
                  fontWeight: '600',
                  background: profileMessage.includes('success') ? 'color-mix(in srgb, var(--success) 12%, var(--card))' : 'color-mix(in srgb, var(--danger) 12%, var(--card))',
                  border: `1px solid ${profileMessage.includes('success') ? 'color-mix(in srgb, var(--success) 40%, var(--border))' : 'color-mix(in srgb, var(--danger) 40%, var(--border))'}`,
                  color: profileMessage.includes('success') ? 'var(--success)' : 'var(--danger)'
                }}>
                  {profileMessage}
                </div>
              )}

              <button type="submit" className="btn-link" disabled={loading} style={{ justifySelf: 'start' }}>
                {loading ? 'Saving changes...' : 'Update Profile'}
              </button>
            </form>
          </div>
        </div>

        <div className="project-section">
          <div className="project-section-title">
            <div className="section-icon">
              <span>🔐</span>
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>Security</div>
              <div style={{ fontSize: '13px', color: 'var(--slate)', opacity: '0.8' }}>Change your account password</div>
            </div>
          </div>
          
          <div className="project-section-body" style={{ marginTop: '18px' }}>
            <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-h)' }}>Current Password</label>
                <input
                  type="password"
                  className="control"
                  style={{ width: '100%', minWidth: 'unset' }}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-h)' }}>New Password</label>
                <input
                  type="password"
                  className="control"
                  style={{ width: '100%', minWidth: 'unset' }}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-h)' }}>Confirm New Password</label>
                <input
                  type="password"
                  className="control"
                  style={{ width: '100%', minWidth: 'unset' }}
                  value={passwordData.new_password_confirmation}
                  onChange={(e) => setPasswordData({...passwordData, new_password_confirmation: e.target.value})}
                  required
                />
              </div>

              {passwordMessage && (
                <div style={{ 
                  padding: '10px 14px', 
                  borderRadius: '10px', 
                  fontSize: '13px',
                  fontWeight: '600',
                  background: passwordMessage.includes('success') ? 'color-mix(in srgb, var(--success) 12%, var(--card))' : 'color-mix(in srgb, var(--danger) 12%, var(--card))',
                  border: `1px solid ${passwordMessage.includes('success') ? 'color-mix(in srgb, var(--success) 40%, var(--border))' : 'color-mix(in srgb, var(--danger) 40%, var(--border))'}`,
                  color: passwordMessage.includes('success') ? 'var(--success)' : 'var(--danger)'
                }}>
                  {passwordMessage}
                </div>
              )}

              <button type="submit" className="btn-link" disabled={loading} style={{ justifySelf: 'start' }}>
                {loading ? 'Updating password...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}