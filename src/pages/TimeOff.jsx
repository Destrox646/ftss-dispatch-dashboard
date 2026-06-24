import { useState, useMemo, useRef } from 'react'
import { Plus, X, Check, XIcon, Calendar, Search } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { contacts } from '../data/contacts'

export default function TimeOff({ requests, setRequests }) {
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' })

  const filtered = requests.filter(r => {
    if (tab === 'all') return true
    return r.status === tab
  })

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const approvedCount = requests.filter(r => r.status === 'approved').length
  const deniedCount = requests.filter(r => r.status === 'denied').length

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts.slice(0, 20)
    const q = search.toLowerCase()
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phones.some(p => p.number.includes(q))
    ).slice(0, 20)
  }, [search])

  const getInitials = (name) => {
    const parts = name.split(' ')
    return parts.length > 1
      ? `${(parts[0][0] || '').toUpperCase()}${(parts[parts.length - 1][0] || '').toUpperCase()}`
      : name.substring(0, 2).toUpperCase()
  }

  const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedContact) return

    setRequests(prev => [...prev, {
      id: `to${Date.now()}`,
      contactId: selectedContact.id,
      driverName: selectedContact.name,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      status: 'pending',
      submittedAt: format(new Date(), 'yyyy-MM-dd'),
    }])
    setShowModal(false)
    setSelectedContact(null)
    setSearch('')
    setForm({ startDate: '', endDate: '', reason: '' })
  }

  const handleSelectContact = (contact) => {
    setSelectedContact(contact)
    setSearch('')
  }

  const updateStatus = (id, status) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const getDuration = (start, end) => {
    const days = differenceInDays(new Date(end + 'T12:00:00'), new Date(start + 'T12:00:00')) + 1
    return `${days} day${days > 1 ? 's' : ''}`
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Time Off Requests</h2>
            <p>Review and manage time off</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setSelectedContact(null); setSearch(''); setForm({ startDate: '', endDate: '', reason: '' }) }}>
            <Plus />
            New Request
          </button>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--yellow-light)', color: 'var(--yellow)' }}>
              <Calendar />
            </div>
            <div className="stat-card-label">Pending</div>
            <div className="stat-card-value" style={{ color: 'var(--yellow)' }}>{pendingCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
              <Check />
            </div>
            <div className="stat-card-label">Approved</div>
            <div className="stat-card-value" style={{ color: 'var(--green)' }}>{approvedCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
              <XIcon />
            </div>
            <div className="stat-card-label">Denied</div>
            <div className="stat-card-value" style={{ color: 'var(--red)' }}>{deniedCount}</div>
          </div>
        </div>

        <div className="filter-bar">
          <div className="tabs">
            <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pending</button>
            <button className={`tab ${tab === 'approved' ? 'active' : ''}`} onClick={() => setTab('approved')}>Approved</button>
            <button className={`tab ${tab === 'denied' ? 'active' : ''}`} onClick={() => setTab('denied')}>Denied</button>
            <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All</button>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Period</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar avatar-purple" style={{ width: '32px', height: '32px', fontSize: '10px' }}>
                          {getInitials(req.driverName)}
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{req.driverName}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {format(new Date(req.startDate + 'T12:00:00'), 'MMM d')} – {format(new Date(req.endDate + 'T12:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td>{getDuration(req.startDate, req.endDate)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{req.reason}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {format(new Date(req.submittedAt + 'T12:00:00'), 'MMM d')}
                    </td>
                    <td>
                      <span className={`badge badge-${req.status}`}>
                        <span className="badge-dot"></span>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      {req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm btn-success" onClick={() => updateStatus(req.id, 'approved')}>
                            <Check size={14} /> Approve
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => updateStatus(req.id, 'denied')}>
                            <XIcon size={14} /> Deny
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="7" className="table-empty">No {tab === 'all' ? '' : tab} requests</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>New Time Off Request</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!selectedContact ? (
                  <>
                    <div className="form-group">
                      <label>Select Person</label>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                          type="text"
                          placeholder="Search by name or phone..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          autoFocus
                          style={{ paddingLeft: '34px' }}
                        />
                      </div>
                    </div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      {filteredContacts.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectContact(c)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div className={`avatar ${avatarColors[c.name.charCodeAt(0) % avatarColors.length]}`} style={{ width: '30px', height: '30px', fontSize: '10px' }}>
                            {getInitials(c.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</div>
                            {c.phones[0] && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.phones[0].number}</div>}
                          </div>
                        </div>
                      ))}
                      {filteredContacts.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No contacts found</div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '16px',
                    }}>
                      <div className={`avatar ${avatarColors[selectedContact.name.charCodeAt(0) % avatarColors.length]}`} style={{ width: '36px', height: '36px', fontSize: '12px' }}>
                        {getInitials(selectedContact.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedContact.name}</div>
                        {selectedContact.phones[0] && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedContact.phones[0].number}</div>}
                      </div>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedContact(null)}>Change</button>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Start Date</label>
                        <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>End Date</label>
                        <input type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Reason</label>
                      <textarea required placeholder="Reason for time off..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
              {selectedContact && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit Request</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}
