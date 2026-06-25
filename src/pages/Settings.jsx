import { useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { Save, Building2, User } from 'lucide-react'

export default function Settings() {
  const { settings, updateSettings } = useSettings()
  const [companyName, setCompanyName] = useState(settings.companyName)
  const [logoInitials, setLogoInitials] = useState(settings.logoInitials)
  const [dispatcherName, setDispatcherName] = useState(settings.dispatcherName)
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    updateSettings({
      companyName: companyName.trim() || 'FTSS Services LLC',
      logoInitials: logoInitials.trim().toUpperCase().slice(0, 2) || 'FT',
      dispatcherName: dispatcherName.trim() || 'Dispatcher',
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
            <div className="card-header"><h3>Company</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Company Name</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="FTSS Services LLC"
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
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
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><h3>Dispatcher</h3></div>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Display Name</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={dispatcherName}
                    onChange={e => setDispatcherName(e.target.value)}
                    placeholder="Dispatcher"
                  />
                </div>
              </div>
            </div>
          </div>

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
