import { useState, useRef, useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { Save, Building2, User, Palette, Shield } from 'lucide-react'

const ACCENT_PRESETS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Pink', value: '#ec4899' },
]

export default function Settings() {
  const { settings, updateSettings } = useSettings()
  const { user } = useAuth()
  const isManager = user?.role === 'manager'
  const [companyName, setCompanyName] = useState(settings.companyName)
  const [logoInitials, setLogoInitials] = useState(settings.logoInitials)
  const [logoImage, setLogoImage] = useState(settings.logoImage)
  const [dispatcherName, setDispatcherName] = useState(settings.dispatcherName)
  const [accentColor, setAccentColor] = useState(settings.accentColor)
  const [dashboardSubtitle, setDashboardSubtitle] = useState(settings.dashboardSubtitle)
  const [greetingOverride, setGreetingOverride] = useState(settings.greetingOverride)
  const [saved, setSaved] = useState(false)
  const logoInputRef = useRef(null)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)

  const handleLogoImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (!isManager) { setUsersLoading(false); return }
    const loadUsers = async () => {
      try {
        const listUsers = httpsCallable(functions, 'listUsers')
        const result = await listUsers({ token: user.token })
        setUsers(result.data.users || [])
      } catch { /* ignore */ }
      setUsersLoading(false)
    }
    loadUsers()
  }, [isManager, user?.token])

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      const setUserRole = httpsCallable(functions, 'setUserRole')
      await setUserRole({ targetUserId, role: newRole, token: user.token })
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u))
    } catch (err) {
      alert(err.message || 'Failed to update role')
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    updateSettings({
      companyName: companyName.trim() || 'FTSS Services LLC',
      logoInitials: logoInitials.trim().toUpperCase().slice(0, 2) || 'FT',
      logoImage,
      dispatcherName: dispatcherName.trim() || 'Dispatcher',
      accentColor,
      dashboardSubtitle: dashboardSubtitle.trim() || 'Dispatch Dashboard',
      greetingOverride: greetingOverride.trim(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
      </div>
      <div className="page-body" style={{ maxWidth: '560px' }}>
        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><h3><Building2 size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Company</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="FTSS Services LLC"
                />
              </div>
              <div className="form-group">
                <label>Dashboard Subtitle</label>
                <input
                  type="text"
                  value={dashboardSubtitle}
                  onChange={e => setDashboardSubtitle(e.target.value)}
                  placeholder="Dispatch Dashboard"
                />
              </div>
              <div className="form-group">
                <label>Logo Initials</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="sidebar-logo-icon" style={{ width: '32px', height: '32px', fontSize: '12px', flexShrink: 0 }}>
                    {logoInitials.slice(0, 2).toUpperCase() || 'FT'}
                  </div>
                  <input
                    type="text"
                    value={logoInitials}
                    onChange={e => setLogoInitials(e.target.value)}
                    placeholder="FT"
                    maxLength={2}
                    style={{ width: '80px' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>2 characters max</span>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Logo Image (optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {logoImage ? (
                    <img src={logoImage} alt="Logo preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                  ) : (
                    <div className="sidebar-logo-icon" style={{ width: '40px', height: '40px', fontSize: '14px', flexShrink: 0 }}>
                      {logoInitials.slice(0, 2).toUpperCase() || 'FT'}
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png"
                    onChange={handleLogoImageChange}
                    style={{ display: 'none' }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => logoInputRef.current?.click()}>
                    Upload PNG
                  </button>
                  {logoImage && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLogoImage('')}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><h3><User size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Dispatcher</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={dispatcherName}
                  onChange={e => setDispatcherName(e.target.value)}
                  placeholder="Dispatcher"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Custom Greeting (optional)</label>
                <input
                  type="text"
                  value={greetingOverride}
                  onChange={e => setGreetingOverride(e.target.value)}
                  placeholder="e.g. Welcome back, or leave blank for time-based greeting"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  If set, this replaces the "Good morning/afternoon/evening" greeting on the dashboard.
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><h3><Palette size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Appearance</h3></div>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Accent Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ACCENT_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setAccentColor(preset.value)}
                      style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: preset.value, border: accentColor === preset.value ? '3px solid var(--text-primary)' : '3px solid transparent',
                        cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                      title={preset.label}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                  Selected: {accentColor}
                </span>
              </div>
            </div>
          </div>

          {isManager && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header"><h3><Shield size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />User Roles</h3></div>
              <div className="card-body">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <strong>Manager</strong> — Full access: edit schedule, approve time off, manage contacts & roles<br />
                  <strong>Supervisor</strong> — Edit schedule, approve time off, send messages<br />
                  <strong>Worker</strong> — View schedule, submit time off requests, send messages
                </div>
                {usersLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading users...</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 500 }}>{u.name || '—'}</td>
                            <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{u.phone}</td>
                            <td>
                              <select
                                value={u.role || 'worker'}
                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                style={{
                                  padding: '6px 10px', borderRadius: '6px',
                                  border: '1px solid var(--border)', background: 'var(--bg-primary)',
                                  color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
                                }}
                              >
                                <option value="worker">Worker</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="manager">Manager</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr><td colSpan="3" className="table-empty">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Settings
            </button>
            {saved && (
              <span style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 500 }}>Saved!</span>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
