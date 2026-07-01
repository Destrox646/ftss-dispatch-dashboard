import { useState, useMemo, useRef } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { useScheduleEntries, addScheduleEntry, deleteScheduleEntry, deleteScheduleEntriesForDates } from '../hooks/useFirestore'
import { useContacts } from '../hooks/useContacts'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_LABELS = [
  'RXO Minooka 1',
  'JB Hunt Milwaukee 1', 'JB Hunt Milwaukee 2',
  'JB Hunt Appleton 1', 'JB Hunt Appleton 2', 'JB Hunt Appleton 3', 'JB Hunt Appleton 4',
  'JB Hunt Detroit 1', 'RXO Grand Rapids 1',
  'JB Hunt Des Moines 1', 'JB Hunt Des Moines 2',
  'Request offs 1', 'Request offs 2',
  'Notes 1', 'Notes 2',
]

export default function Schedule() {
  const { data: entries, loading: entriesLoading } = useScheduleEntries()
  const { ftssContacts } = useContacts()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [modalCell, setModalCell] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [rowLabels] = useState(DEFAULT_LABELS)
  const fileInputRef = useRef(null)

  const weekDates = useMemo(() =>
    DAYS.map((_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return ftssContacts.slice(0, 30)
    const q = search.toLowerCase()
    return ftssContacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phones.some(p => p.number.includes(q))
    ).slice(0, 30)
  }, [search, ftssContacts])

  const entryMap = useMemo(() => {
    const map = {}
    for (const entry of entries) {
      const key = `${entry.date}-${entry.row}-${entry.role || 'driver'}`
      if (!map[key]) map[key] = []
      map[key].push(entry)
    }
    return map
  }, [entries])

  const getEntries = (dayIdx, rowIdx, role) => {
    const dateStr = format(weekDates[dayIdx], 'yyyy-MM-dd')
    return entryMap[`${dateStr}-${rowIdx}-${role}`] || []
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedContact || !modalCell) return
    const dateStr = format(weekDates[modalCell.dayIdx], 'yyyy-MM-dd')
    addScheduleEntry({
      date: dateStr,
      row: modalCell.rowIdx,
      role: modalCell.role,
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      phone: selectedContact.phones[0]?.number || '',
    })
    setModalCell(null)
    setSelectedContact(null)
    setSearch('')
  }

  const getInitials = (name) => {
    const parts = name.replace(/^FTSS\s*/i, '').split(' ')
    if (parts.length >= 2) return `${(parts[0][0] || '').toUpperCase()}${(parts[1][0] || '').toUpperCase()}`
    return (parts[0] || '').substring(0, 2).toUpperCase()
  }

  const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']
  const getAvatarColor = (name) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
    return avatarColors[Math.abs(hash) % avatarColors.length]
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
      if (rows.length < 3) return

      // Parse dates from header row: "Schedule,Monday 6/29,Tuesday 6/30,..."
      const headerRow = rows[0]
      const csvDates = []
      for (let c = 1; c < headerRow.length && csvDates.length < 7; c++) {
        const header = headerRow[c] || ''
        // Extract date from "Monday 6/29" format
        const match = header.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
        if (match) {
          const m = match[1].padStart(2, '0')
          const d = match[2].padStart(2, '0')
          const y = match[3] ? (match[3].length === 2 ? '20' + match[3] : match[3]) : new Date().getFullYear()
          csvDates.push(`${y}-${m}-${d}`)
        }
      }

      if (csvDates.length === 0) return

      // Set weekStart to match CSV
      const [y, m, d] = csvDates[0].split('-').map(Number)
      setWeekStart(new Date(y, m - 1, d))

      // Clear existing entries for this week
      deleteScheduleEntriesForDates(csvDates)

      // Parse data rows - interleaved format: even=driver, odd=helper
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r]
        const isFirstOfPair = (r - 1) % 2 === 0
        const role = isFirstOfPair ? 'driver' : 'helper'

        // Determine row index from first cell or position
        let rawLabel = (cells[0] || '').toLowerCase().trim()
        // Strip " driver" or " helper" suffix
        rawLabel = rawLabel.replace(/\s+(driver|helper)$/i, '').trim()

        let rowIdx = -1
        if (rawLabel) {
          rowIdx = rowLabels.findIndex(l => l.toLowerCase().trim() === rawLabel)
          if (rowIdx === -1) rowIdx = rowLabels.findIndex(l => rawLabel.includes(l.toLowerCase()) || l.toLowerCase().includes(rawLabel))
        } else {
          // Empty label - belongs to previous pair's row
          rowIdx = Math.floor((r - 1) / 2)
        }

        if (rowIdx === -1 || rowIdx >= rowLabels.length) continue

        // Parse Monday's name and duplicate across all 7 days
        const name = (cells[1] || '').trim()
        if (!name) continue

        // Match against FTSS contacts
        const lower = name.toLowerCase()
        let contact = ftssContacts.find(c => c.name.toLowerCase() === lower)
        if (!contact) contact = ftssContacts.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase().replace(/^ftss\s*/i, '')))
        if (!contact) continue

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
          addScheduleEntry({
            date: csvDates[dayIdx],
            row: rowIdx,
            role,
            contactId: contact.id,
            contactName: contact.name,
            phone: contact.phones[0]?.number || '',
          })
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
            <h2>Schedule</h2>
            <p>Click a cell to assign a driver or helper</p>
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
            <button
              className="btn btn-primary"
              style={{ marginLeft: '8px', fontSize: '12px' }}
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Today
            </button>
            <button className="btn btn-ghost" style={{ marginLeft: '4px' }} onClick={() => fileInputRef.current?.click()} title="Import schedule from CSV">
              <Upload size={16} /> Import CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={importCSV} />
          </div>
        </div>
      </div>
      <div className="page-body" style={{ overflowX: 'auto', padding: '20px 16px' }}>
        {entriesLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px', gap: '8px' }}>
            Loading schedule...
          </div>
        )}
        <div style={{ minWidth: '900px', opacity: entriesLoading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '158px repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
            <div style={{ padding: '10px 8px' }} />
            {DAYS.map((day, i) => {
              const d = weekDates[i]
              const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={day} style={{
                  padding: '10px 12px', textAlign: 'center',
                  background: isToday ? 'rgba(59, 130, 246, 0.10)' : 'var(--bg-tertiary)',
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

          {/* Schedule rows */}
          {rowLabels.map((label, rowIdx) => (
            <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '158px repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '6px 8px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', lineHeight: '1.3' }}>
                  {label}
                </div>
              </div>
              {DAYS.map((_, dayIdx) => {
                const driverEntries = getEntries(dayIdx, rowIdx, 'driver')
                const helperEntries = getEntries(dayIdx, rowIdx, 'helper')
                const isToday = format(weekDates[dayIdx], 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                const cellBg = isToday ? 'rgba(59, 130, 246, 0.10)' : 'var(--bg-secondary)'

                const renderEntry = (entry, role) => (
                  <div key={entry.id} style={{
                    background: role === 'driver' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                    border: `1px solid ${role === 'driver' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                    borderRadius: '4px', padding: '2px 5px',
                    fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                  }} onClick={e => e.stopPropagation()}>
                    <div className={`avatar ${getAvatarColor(entry.contactName)}`} style={{ width: '16px', height: '16px', fontSize: '6px', flexShrink: 0 }}>
                      {getInitials(entry.contactName)}
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {entry.contactName.replace(/^FTSS\s*/i, '')}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteScheduleEntry(entry.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 1px', fontSize: '12px', lineHeight: 1, flexShrink: 0 }}
                    >&times;</button>
                  </div>
                )

                return (
                  <div key={dayIdx} style={{
                    background: cellBg, border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    {/* Driver half */}
                    <div
                      onClick={() => setModalCell({ dayIdx, rowIdx, role: 'driver' })}
                      style={{
                        flex: 1, minHeight: '28px', padding: '3px 4px', display: 'flex', flexWrap: 'wrap', gap: '2px', alignContent: 'flex-start',
                        cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {driverEntries.length === 0 && (
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                      {driverEntries.map(e => renderEntry(e, 'driver'))}
                    </div>
                    {/* Helper half */}
                    <div
                      onClick={() => setModalCell({ dayIdx, rowIdx, role: 'helper' })}
                      style={{
                        flex: 1, minHeight: '28px', padding: '3px 4px', display: 'flex', flexWrap: 'wrap', gap: '2px', alignContent: 'flex-start',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {helperEntries.length === 0 && (
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                      {helperEntries.map(e => renderEntry(e, 'helper'))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Modal */}
      {modalCell && (
        <div className="modal-overlay" onClick={() => { setModalCell(null); setSelectedContact(null); setSearch(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>
                Assign {modalCell.role === 'driver' ? 'Driver' : 'Helper'} — {DAYS[modalCell.dayIdx]}, {format(weekDates[modalCell.dayIdx], 'MMM d')} at {rowLabels[modalCell.rowIdx]}
              </h3>
              <button className="modal-close" onClick={() => { setModalCell(null); setSelectedContact(null); setSearch(''); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!selectedContact ? (
                  <div className="form-group">
                    <label>Search FTSS Contacts</label>
                    <input
                      type="text"
                      placeholder="Search by name or phone..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      autoFocus
                    />
                    <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}>
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
                          <div className={`avatar ${getAvatarColor(c.name)}`} style={{ width: '30px', height: '30px', fontSize: '10px' }}>
                            {getInitials(c.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{c.name.replace(/^FTSS\s*/i, '')}</div>
                            {c.phones[0] && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.phones[0].number}</div>}
                          </div>
                        </div>
                      ))}
                      {filteredContacts.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No contacts found</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)', marginBottom: '16px',
                    }}>
                      <div className={`avatar ${getAvatarColor(selectedContact.name)}`} style={{ width: '36px', height: '36px', fontSize: '12px' }}>
                        {getInitials(selectedContact.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {selectedContact.name.replace(/^FTSS\s*/i, '')}
                        </div>
                        {selectedContact.phones[0] && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedContact.phones[0].number}</div>}
                      </div>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setSelectedContact(null); setSearch(''); }}>Change</button>
                    </div>
                  </>
                )}
              </div>
              {selectedContact && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => { setModalCell(null); setSelectedContact(null); setSearch(''); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Assign</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}
