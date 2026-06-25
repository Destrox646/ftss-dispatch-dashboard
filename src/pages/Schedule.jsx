import { useState, useMemo, useRef } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Search, Users, Download, Upload } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { contacts } from '../data/contacts'
import { useScheduleEntries, useScheduleLabels, addScheduleEntry, deleteScheduleEntry } from '../hooks/useFirestore'
import { useSettings } from '../contexts/SettingsContext'

const ftssContacts = contacts.filter(c => c.name.toUpperCase().startsWith('FTSS'))
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const defaultLabels = [
  'RXO Milwaukee 1', 'RXO Milwaukee 2', 'JB Hunt Appleton 1', 'JB Hunt Appleton 2', 'JB Hunt Appleton 3', 'JB Hunt Appleton 4', 'JB Hunt Waukesha 1',
  'JB Hunt Waukesha 2', 'JB Hunt Detroit 1', 'RXO Grand Rapids 1', 'JB Hunt Des Moines 1', 'Request offs 1', 'Request offs 2', 'Notes 1', 'Notes 2',
]

export default function Schedule() {
  const { data: entries } = useScheduleEntries()
  const { labels: savedLabels, saveLabels } = useScheduleLabels()
  const { settings } = useSettings()
  const canEdit = settings.scheduleEditEnabled
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [modalCell, setModalCell] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [note, setNote] = useState('')
  const [showAllContacts, setShowAllContacts] = useState(false)
  const [rowLabels, setRowLabels] = useState(savedLabels || defaultLabels)
  const fileInputRef = useRef(null)

  // Sync labels from Firestore
  useMemo(() => {
    if (savedLabels) setRowLabels(savedLabels)
  }, [savedLabels])

  const weekDates = useMemo(() =>
    DAYS.map((_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const filteredContacts = useMemo(() => {
    const pool = showAllContacts ? contacts : ftssContacts
    if (!search.trim()) return pool.slice(0, 30)
    const q = search.toLowerCase()
    return pool.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phones.some(p => p.number.includes(q))
    ).slice(0, 30)
  }, [search, showAllContacts])

  const getEntries = (dayIdx, rowIdx) => {
    const dateStr = format(weekDates[dayIdx], 'yyyy-MM-dd')
    return entries.filter(e => e.date === dateStr && e.row === rowIdx)
  }

  const handleCellClick = (dayIdx, rowIdx) => {
    setModalCell({ dayIdx, rowIdx })
    setSearch('')
    setSelectedContact(null)
    setNote('')
    setShowAllContacts(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedContact) return

    const dateStr = format(weekDates[modalCell.dayIdx], 'yyyy-MM-dd')
    addScheduleEntry({
      date: dateStr,
      row: modalCell.rowIdx,
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      phone: selectedContact.phones[0]?.number || '',
      note,
    })
    setModalCell(null)
  }

  const handleDelete = (entryId) => {
    deleteScheduleEntry(entryId)
  }

  const handleLabelChange = (rowIdx, value) => {
    const next = [...(savedLabels || defaultLabels)]
    next[rowIdx] = value
    setRowLabels(next)
    saveLabels(next)
  }

  const getInitials = (name) => {
    const parts = name.replace(/^FTSS\s*/i, '').split(' ')
    if (parts.length >= 2) return `${(parts[0][0] || '').toUpperCase()}${(parts[1][0] || '').toUpperCase()}`
    return (parts[0] || '').substring(0, 2).toUpperCase()
  }

  const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']

  const downloadCSV = () => {
    const header = ['Schedule', ...DAYS.map((day, i) => `${day} ${format(weekDates[i], 'M/d')}`)]
    const rows = rowLabels.map((label, rowIdx) => {
      return [label, ...DAYS.map((_, dayIdx) => {
        return getEntries(dayIdx, rowIdx).map(e => e.contactName.replace(/^FTSS\s*/i, '')).join(', ')
      })]
    })
    const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schedule-${format(weekStart, 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCSV = (text) => {
    const rows = []
    let row = []
    let cell = ''
    let inQuotes = false
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
        else if (ch === '"') inQuotes = false
        else cell += ch
      } else {
        if (ch === '"') inQuotes = true
        else if (ch === ',') { row.push(cell.trim()); cell = '' }
        else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && text[i + 1] === '\n') i++
          row.push(cell.trim()); rows.push(row); row = []; cell = ''
        } else cell += ch
      }
    }
    row.push(cell.trim())
    if (row.some(c => c)) rows.push(row)
    return rows
  }

  const importCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCSV(reader.result)
      if (rows.length < 2) return
      const currentLabels = rowLabels.map(l => l.toLowerCase().trim())
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r]
        const label = (cells[0] || '').toLowerCase().trim()
        const rowIdx = currentLabels.indexOf(label)
        if (rowIdx === -1) continue
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
          const cell = (cells[dayIdx + 1] || '').trim()
          if (!cell) continue
          const names = cell.split(',').map(n => n.trim()).filter(Boolean)
          for (const name of names) {
            const lower = name.toLowerCase()
            // Try exact match first, then partial
            let contact = ftssContacts.find(c => c.name.toLowerCase() === ('ftss ' + lower))
            if (!contact) contact = ftssContacts.find(c => c.name.toLowerCase().includes(lower))
            if (!contact) continue
            const dateStr = format(weekDates[dayIdx], 'yyyy-MM-dd')
            addScheduleEntry({
              date: dateStr,
              row: rowIdx,
              contactId: contact.id,
              contactName: contact.name,
              phone: contact.phones[0]?.number || '',
              note: '',
            })
          }
        }
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Weekly Schedule</h2>
            <p>Click a time slot to assign an FTSS contact</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => setWeekStart(d => subWeeks(d, 1))}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '200px', textAlign: 'center' }}>
              {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
            <button className="btn btn-ghost" onClick={() => setWeekStart(d => addWeeks(d, 1))}>
              <ChevronRight size={16} />
            </button>
            <button className="btn btn-ghost" style={{ marginLeft: '8px' }} onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Today
            </button>
            <button className="btn btn-ghost" style={{ marginLeft: '4px' }} onClick={downloadCSV} title="Download schedule as CSV">
              <Download size={16} />
            </button>
            <button className="btn btn-ghost" style={{ marginLeft: '4px' }} onClick={() => fileInputRef.current?.click()} title="Import schedule from CSV">
              <Upload size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={importCSV} />
          </div>
        </div>
      </div>
      <div className="page-body" style={{ overflowX: 'auto', padding: '20px 16px' }}>
        <div style={{ minWidth: '900px' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '158px repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
            <div style={{ padding: '10px 8px' }} />
            {DAYS.map((day, i) => {
              const d = weekDates[i]
              const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={day} style={{
                  padding: '10px 12px', textAlign: 'center',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                  borderBottom: 'none',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: isToday ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {day.substring(0, 3)}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {format(d, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time rows */}
          {defaultLabels.map((_, rowIdx) => (
            <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '158px repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center',
              }}>
                <input
                  type="text"
                  value={rowLabels[rowIdx]}
                  onChange={e => canEdit && handleLabelChange(rowIdx, e.target.value)}
                  readOnly={!canEdit}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    padding: '8px 10px', fontSize: '13px', fontWeight: 500,
                    color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'center',
                    cursor: canEdit ? 'text' : 'default',
                  }}
                />
              </div>
              {DAYS.map((_, dayIdx) => {
                const cellEntries = getEntries(dayIdx, rowIdx)
                const isToday = format(weekDates[dayIdx], 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                return (
                  <div
                    key={dayIdx}
                    onClick={() => canEdit && handleCellClick(dayIdx, rowIdx)}
                    style={{
                      minHeight: '44px', padding: '4px 6px',
                      background: isToday ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-secondary)',
                      border: '1px solid var(--border)', cursor: canEdit ? 'pointer' : 'default',
                      transition: 'background 0.1s', position: 'relative',
                    }}
                    onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => e.currentTarget.style.background = isToday ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-secondary)'}
                  >
                    {cellEntries.length === 0 && (
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                      }} className="slot-hover-plus">
                        <Plus size={16} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    {cellEntries.map(entry => (
                      <div key={entry.id} style={{
                        background: 'var(--accent-light)', border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '4px', padding: '4px 6px', marginBottom: '2px',
                        fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                      }} onClick={e => e.stopPropagation()}>
                        <div className={`avatar ${avatarColors[entry.contactName.charCodeAt(4) % avatarColors.length]}`} style={{ width: '18px', height: '18px', fontSize: '7px', flexShrink: 0 }}>
                          {getInitials(entry.contactName)}
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {entry.contactName.replace(/^FTSS\s*/i, '')}
                        </span>
                        {canEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                            style={{
                              background: 'none', border: 'none', color: 'var(--text-muted)',
                              cursor: 'pointer', padding: '0 2px', fontSize: '12px', lineHeight: 1, flexShrink: 0,
                            }}
                          >&times;</button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Modal */}
      {modalCell && (
        <div className="modal-overlay" onClick={() => setModalCell(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>
                Assign — {DAYS[modalCell.dayIdx]}, {format(weekDates[modalCell.dayIdx], 'MMM d')} at {rowLabels[modalCell.rowIdx]}
              </h3>
              <button className="modal-close" onClick={() => setModalCell(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!selectedContact ? (
                  <>
                    <div className="form-group">
                      <label>Search Contacts</label>
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
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${!showAllContacts ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setShowAllContacts(false); setSearch(''); }}
                        style={{ fontSize: '12px' }}
                      >
                        <Users size={13} /> FTSS ({ftssContacts.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${showAllContacts ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setShowAllContacts(true); setSearch(''); }}
                        style={{ fontSize: '12px' }}
                      >
                        All Contacts
                      </button>
                    </div>
                    <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      {filteredContacts.map(c => (
                        <div
                          key={c.id}
                          onClick={() => { setSelectedContact(c); setSearch(''); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', cursor: 'pointer',
                            borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div className={`avatar ${avatarColors[c.name.charCodeAt(4) % avatarColors.length]}`} style={{ width: '30px', height: '30px', fontSize: '10px' }}>
                            {getInitials(c.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {showAllContacts ? c.name : c.name.replace(/^FTSS\s*/i, '')}
                            </div>
                            {c.phones[0] && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.phones[0].number}</div>}
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
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)', marginBottom: '16px',
                    }}>
                      <div className={`avatar ${avatarColors[selectedContact.name.charCodeAt(4) % avatarColors.length]}`} style={{ width: '36px', height: '36px', fontSize: '12px' }}>
                        {getInitials(selectedContact.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {showAllContacts ? selectedContact.name : selectedContact.name.replace(/^FTSS\s*/i, '')}
                        </div>
                        {selectedContact.phones[0] && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedContact.phones[0].number}</div>}
                      </div>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedContact(null)}>Change</button>
                    </div>
                    <div className="form-group">
                      <label>Note (optional)</label>
                      <textarea
                        placeholder="Add a note..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>
              {selectedContact && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setModalCell(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Assign</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <style>{`.slot-hover-plus { } div:hover > .slot-hover-plus { opacity: 1 !important; }`}</style>
    </>
  )
}
