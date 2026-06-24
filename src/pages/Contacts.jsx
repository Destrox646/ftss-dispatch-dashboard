import { useState, useMemo } from 'react'
import { Search, Phone, Mail, Building2, User } from 'lucide-react'
import { contacts } from '../data/contacts'

export default function Contacts() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts.slice(0, 50)
    const q = search.toLowerCase()
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.organization.toLowerCase().includes(q) ||
      c.phones.some(p => p.number.includes(q))
    ).slice(0, 100)
  }, [search])

  const getInitials = (first, last) => {
    return `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}` || '?'
  }

  const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Contacts</h2>
            <p>{contacts.length.toLocaleString()} contacts imported from Google</p>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Search by name, email, phone, or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {search ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : 'Showing first 50'}
          </span>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Organization</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className={`avatar ${avatarColors[c.name.charCodeAt(0) % avatarColors.length]}`} style={{ width: '32px', height: '32px', fontSize: '10px' }}>
                          {getInitials(c.firstName || '?', c.lastName || '?')}
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      {c.phones.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.phones[0].number}</span>
                          {c.phones.length > 1 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>+{c.phones.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      {c.email ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', color: 'var(--accent)' }}>{c.email}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      {c.organization ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px' }}>{c.organization}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="4" className="table-empty">No contacts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
