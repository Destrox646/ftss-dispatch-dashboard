import { useState, useMemo, useRef } from 'react'
import { Search, Phone, Mail, Building2, Camera, Plus, X, Pencil, Trash2 } from 'lucide-react'
import { useContactAvatars } from '../hooks/useContactAvatars'
import { useContacts } from '../hooks/useContacts'
import { useAuth } from '../contexts/AuthContext'

const ADMIN_PHONE = '+12623272419'

export default function Contacts() {
  const [search, setSearch] = useState('')
  const { avatars, setAvatar } = useContactAvatars()
  const { ftssContacts, addContact, editContact, deleteContact } = useContacts()
  const { user } = useAuth()
  const isAdmin = user?.phone === ADMIN_PHONE
  const avatarInputRef = useRef(null)
  const [editingContactId, setEditingContactId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editOrg, setEditOrg] = useState('')

  const filtered = useMemo(() => {
    const visible = ftssContacts.filter(c => !c._deleted)
    if (!search.trim()) return visible.slice(0, 50)
    const q = search.toLowerCase()
    return visible.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.organization.toLowerCase().includes(q) ||
      c.phones.some(p => p.number.includes(q))
    ).slice(0, 100)
  }, [search, ftssContacts])

  const getInitials = (first, last) => {
    return `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}` || '?'
  }

  const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']

  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '')
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
  }

  const handleAddContact = (e) => {
    e.preventDefault()
    const raw = addName.trim()
    if (!raw) return
    const name = raw.toUpperCase().startsWith('FTSS') ? raw : 'FTSS ' + raw
    const digits = addPhone.replace(/\D/g, '')
    addContact({
      id: 'custom-' + Date.now(),
      firstName: name,
      lastName: '',
      name,
      email: addEmail.trim(),
      phones: digits.length >= 10 ? [{ label: 'Mobile', number: formatPhone(digits) }] : [],
      organization: '',
    })
    setAddName('')
    setAddPhone('')
    setAddEmail('')
    setShowAdd(false)
  }

  const openEdit = (c) => {
    setEditModal(c)
    setEditName(c.name || '')
    setEditPhone(c.phones?.[0]?.number || '')
    setEditEmail(c.email || '')
    setEditOrg(c.organization || '')
  }

  const handleEditContact = (e) => {
    e.preventDefault()
    if (!editModal) return
    const digits = editPhone.replace(/\D/g, '')
    editContact(editModal.id, {
      name: editName.trim(),
      firstName: editName.trim(),
      lastName: '',
      email: editEmail.trim(),
      phones: digits.length >= 10 ? [{ label: 'Mobile', number: formatPhone(digits) }] : editModal.phones || [],
      organization: editOrg.trim(),
    })
    setEditModal(null)
  }

  const handleDeleteContact = (c) => {
    if (!confirm(`Delete ${c.name}?`)) return
    deleteContact(c.id)
  }

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file || !editingContactId) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setAvatar(editingContactId, ev.target.result)
      setEditingContactId(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Contacts</h2>
            <p>{ftssContacts.length.toLocaleString()} FTSS contacts</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ gap: '6px', display: 'flex', alignItems: 'center' }}>
            <Plus size={16} /> Add Contact
          </button>
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
                  {isAdmin && <th style={{ width: '80px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className={`avatar ${avatarColors[c.name.charCodeAt(0) % avatarColors.length]}`}
                          style={{ width: '32px', height: '32px', fontSize: '10px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                          title="Click to upload photo"
                          onClick={() => { setEditingContactId(c.id); avatarInputRef.current?.click() }}
                        >
                          {avatars[c.id] ? (
                            <img src={avatars[c.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            getInitials(c.firstName || '?', c.lastName || '?')
                          )}
                          <div style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.15s',
                          }}
                            className="avatar-overlay"
                          >
                            <Camera size={12} color="white" />
                          </div>
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
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteContact(c)} title="Delete" style={{ color: 'var(--danger, #ef4444)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="4" className="table-empty">No contacts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png"
          onChange={handleAvatarFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Add Contact Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Add FTSS Contact</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddContact}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(FTSS prefix auto-added)</span></label>
                  <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="A Tontillo" autoFocus />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={addPhone} onChange={e => setAddPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" maxLength={14} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="optional" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Edit Contact</h3>
              <button className="modal-close" onClick={() => setEditModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditContact}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={editPhone} onChange={e => setEditPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" maxLength={14} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Organization</label>
                  <input type="text" value={editOrg} onChange={e => setEditOrg(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .avatar:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>
    </>
  )
}
