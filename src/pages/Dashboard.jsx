import { useMemo } from 'react'
import { Users, MessageSquare, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useContacts } from '../hooks/useContacts'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useChatMessages } from '../hooks/useFirestore'
import { useTimeOffRequests } from '../hooks/useFirestore'

const QUICK_LINKS = [
  { label: 'FTSS Group Chat', path: '/chat', icon: MessageSquare, color: '#8b5cf6' },
  { label: 'Browse Contacts', path: '/contacts', icon: Users, color: '#10b981' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { ftssContacts } = useContacts()
  const { data: messages } = useChatMessages()
  const { data: requests } = useTimeOffRequests()

  const pendingRequests = requests.filter(r => r.status === 'pending').length
  const recentMessages = messages.slice(-3).reverse()

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>
      <div className="page-body" style={{ maxWidth: '960px' }}>
        {/* Welcome */}
        <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))' }}>
          <div className="card-body" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {settings.greetingOverride || greeting}, {settings.dispatcherName}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {format(now, 'EEEE, MMMM d, yyyy')} — {settings.companyName} {settings.dashboardSubtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Stats Card */}
          <div className="card">
            <div className="card-header"><h3>Today's Overview</h3></div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--yellow)' }}>{pendingRequests}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending Off</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6' }}>{messages.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Messages</div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="card">
            <div className="card-header"><h3>Quick Links</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {QUICK_LINKS.map(link => (
                <a
                  key={link.path}
                  href={link.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${link.color}18`,
                  }}>
                    <link.icon size={18} style={{ color: link.color }} />
                  </div>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{link.label}</span>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </a>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Activity</h3>
              <a href="/chat" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}>All messages &rarr;</a>
            </div>
            <div className="card-body">
              {recentMessages.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No messages yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentMessages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div className="avatar avatar-blue" style={{ width: '28px', height: '28px', fontSize: '9px', flexShrink: 0 }}>
                        {(msg.senderAvatar || '??')}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{msg.senderName}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FTSS Contacts Summary */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h3>FTSS Team</h3>
              <a href="/contacts" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}>All contacts &rarr;</a>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(59,130,246,0.12)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={24} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{ftssContacts.length}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>FTSS contacts</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ftssContacts.slice(0, 8).map(c => {
                  const initials = (c.firstName[0] || '') + (c.lastName[0] || '')
                  const colors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']
                  return (
                    <div key={c.id} title={c.name} className={`avatar ${colors[c.name.charCodeAt(4) % colors.length]}`} style={{
                      width: '30px', height: '30px', fontSize: '9px', cursor: 'default',
                    }}>{initials}</div>
                  )
                })}
                {ftssContacts.length > 8 && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)',
                  }}>+{ftssContacts.length - 8}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
