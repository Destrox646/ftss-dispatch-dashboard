import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, ChevronLeft, ChevronRight, Search, Users, Download, Upload } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { useScheduleEntries, useScheduleLabels, addScheduleEntry, deleteScheduleEntry } from '../hooks/useFirestore'
import { useAuth } from '../contexts/AuthContext'
import { useContacts } from '../hooks/useContacts'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const defaultLabels = [
  'RXO Minooka 1',
  'JB Hunt Milwaukee 1', 'JB Hunt Milwaukee 2',
  'JB Hunt Lowes Appleton 1', 'JB Hunt Lowes Appleton 2', 'JB Hunt Lowes Appleton 3', 'JB Hunt Lowes Appleton 4',
  'JB Hunt Detroit 1', 'RXO Grand Rapids 1', 'JB Hunt Des Moines 1',
  'RXO Milwaukee 1', 'RXO Milwaukee 2',
  'JB Hunt Appleton 1', 'JB Hunt Appleton 2', 'JB Hunt Appleton 3', 'JB Hunt Appleton 4',
  'JB Hunt Waukesha 1', 'JB Hunt Waukesha 2',
  'JB Hunt Detroit 2', 'RXO Grand Rapids 2',
  'Request offs 1', 'Request offs 2',
  'Notes 1', 'Notes 2',
]

function hashName(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export default function Schedule() {
  const { data: entries, loading: entriesLoading } = useScheduleEntries()
  const { labels: savedLabels, loading: labelsLoading, saveLabels } = useScheduleLabels()
  const { user } = useAuth()
  const { allContacts, ftssContacts } = useContacts()
  const canEdit = user?.role === 'manager' || user?.role === 'supervisor'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [modalCell, setModalCell] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [note, setNote] = useState('')
  const [showAllContacts, setShowAllContacts] = useState(false)
  const [rowLabels, setRowLabels] = useState(savedLabels || defaultLabels)
  const [assignRole, setAssignRole] = useState('driver')
  const [hoverCell, setHoverCell] = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)
  const hoverTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Sync labels from Firestore
  useEffect(() => {
    if (savedLabels) setRowLabels(savedLabels)
  }, [savedLabels])

  const weekDates = useMemo(() =>
    DAYS.map((_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const filteredContacts = useMemo(() => {
    const pool = showAllContacts ? allContacts : ftssContacts
    if (!search.trim()) return pool.slice(0, 30)
    const q = search.toLowerCase()
    return pool.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phones.some(p => p.number.includes(q))
    ).slice(0, 30)
  }, [search, showAllContacts, allContacts, ftssContacts])

  const getEntries = (dayIdx, rowIdx, role) => {
    const dateStr = format(weekDates[dayIdx], 'yyyy-MM-dd')
    return entries.filter(e => e.date === dateStr && e.row === rowIdx && (role ? (e.role || 'driver') === role : true))
  }

  const handleCellClick = (dayIdx, rowIdx, role) => {
    setModalCell({ dayIdx, rowIdx })
    setAssignRole(role || 'driver')
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
      role: assignRole,
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
    const next = [...rowLabels]
    next[rowIdx] = value
    setRowLabels(next)
    saveLabels(next)
  }

  const getInitials = (name) => {
    const parts = name.split(' ')
    if (parts.length >= 2) return `${(parts[0][0] || '').toUpperCase()}${(parts[1][0] || '').toUpperCase()}`
    return (parts[0] || '').substring(0, 2).toUpperCase()
  }

  const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']
  const getAvatarColor = (name) => avatarColors[hashName(name) % avatarColors.length]

  const downloadCSV = () => {
    const header = ['Schedule', ...DAYS.map((day, i) => `${day} ${format(weekDates[i], 'M/d')}`)]
    const rows = []
    rowLabels.forEach((label, rowIdx) => {
      rows.push([`${label} Driver`, ...DAYS.map((_, dayIdx) => {
        return getEntries(dayIdx, rowIdx, 'driver').map(e => e.contactName).join(', ')
      })])
      rows.push([`${label} Helper`, ...DAYS.map((_, dayIdx) => {
        return getEntries(dayIdx, rowIdx, 'helper').map(e => e.contactName).join(', ')
      })])
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
      if (rows.length < 3) return
      const currentLabels = rowLabels.map(l => l.toLowerCase().trim())

      // Detect interleaved format: row 2 has Driver/Helper alternating
      const headerRow = rows[2] || []
      const isInterleaved = headerRow[1]?.toLowerCase() === 'driver' && headerRow[2]?.toLowerCase() === 'helper'

      if (isInterleaved) {
        // Parse dates from row 0: e.g. "6/29/2026",,"6/30/2026",...
        const csvDates = []
        for (let c = 1; c < rows[0].length && csvDates.length < 7; c += 2) {
          const dateStr = (rows[0][c] || '').trim()
          if (!dateStr) continue
          const parts = dateStr.split('/')
          if (parts.length === 3) {
            const m = parts[0].padStart(2, '0')
            const d = parts[1].padStart(2, '0')
            const y = parts[2]
            csvDates.push(`${y}-${m}-${d}`)
          }
        }

        // Set weekStart to match the CSV week
        if (csvDates.length > 0) {
          const [y, m, d] = csvDates[0].split('-').map(Number)
          setWeekStart(new Date(y, m - 1, d))
        }

        // Parse data rows (row 3+)
        for (let r = 3; r < rows.length; r++) {
          const cells = rows[r]
          const label = (cells[0] || '').toLowerCase().trim()
          const rowIdx = currentLabels.indexOf(label)
          if (rowIdx === -1) continue

          for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const dateStr = csvDates[dayIdx]
            if (!dateStr) continue
            const driverCell = (cells[1 + dayIdx * 2] || '').trim()
            const helperCell = (cells[2 + dayIdx * 2] || '').trim()

            for (const [role, cell] of [['driver', driverCell], ['helper', helperCell]]) {
              if (!cell) continue
              const names = cell.split(',').map(n => n.trim()).filter(Boolean)
              for (const name of names) {
                const lower = name.toLowerCase()
                let contact = ftssContacts.find(c => c.name.toLowerCase() === ('ftss ' + lower))
                if (!contact) contact = ftssContacts.find(c => c.name.toLowerCase().includes(lower))
                if (!contact) contact = ftssContacts.find(c => c.name.toLowerCase().replace(/^ftss\s*/i, '') === lower)
                if (!contact) continue
                addScheduleEntry({
                  date: dateStr,
                  row: rowIdx,
                  role,
                  contactId: contact.id,
                  contactName: contact.name,
                  phone: contact.phones[0]?.number || '',
                  note: '',
                })
              }
            }
          }
        }
      } else {
        // Original format: one row per role per route
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
        {(entriesLoading || labelsLoading) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px', gap: '8px' }}>
            <div className="spinner" /> Loading schedule...
          </div>
        )}
        <div style={{ minWidth: '900px', opacity: (entriesLoading || labelsLoading) ? 0.4 : 1, transition: 'opacity 0.2s' }}>
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

          {/* Time rows */}
          {rowLabels.map((_, rowIdx) => (
            <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '158px repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
              }}>
                <input
                  type="text"
                  value={rowLabels[rowIdx]}
                  onChange={e => canEdit && handleLabelChange(rowIdx, e.target.value)}
                  readOnly={!canEdit}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    padding: '8px 10px 2px', fontSize: '13px', fontWeight: 500,
                    color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'center',
                    cursor: canEdit ? 'text' : 'default',
                  }}
                />
                <div style={{ display: 'flex', borderTop: '1px solid var(--border)', flex: 1 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', fontSize: '9px', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
                    D
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
                    H
                  </div>
                </div>
              </div>
              {DAYS.map((_, dayIdx) => {
                const driverEntries = getEntries(dayIdx, rowIdx, 'driver')
                const helperEntries = getEntries(dayIdx, rowIdx, 'helper')
                const isToday = format(weekDates[dayIdx], 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                const cellBg = isToday ? 'rgba(59, 130, 246, 0.10)' : 'var(--bg-secondary)'
                const renderEntry = (entry, role) => {
                  const isDriver = role === 'driver'
                  return (
                    <div key={entry.id} style={{
                      background: isDriver ? 'rgba(59, 130, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                      border: `1px solid ${isDriver ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                      borderRadius: '4px', padding: '2px 5px',
                      fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                    }} onClick={e => e.stopPropagation()}>
                      <div className={`avatar ${getAvatarColor(entry.contactName)}`} style={{ width: '16px', height: '16px', fontSize: '6px', flexShrink: 0 }}>
                        {getInitials(entry.contactName)}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {entry.contactName}
                      </span>
                      {canEdit && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 1px', fontSize: '12px', lineHeight: 1, flexShrink: 0 }}
                        >&times;</button>
                      )}
                    </div>
                  )
                }
                return (
                  <div key={dayIdx} style={{
                    background: cellBg, border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', position: 'relative',
                  }}
                    onMouseEnter={e => {
                      clearTimeout(hoverTimerRef.current)
                      const rect = e.currentTarget.getBoundingClientRect()
                      hoverTimerRef.current = setTimeout(() => {
                        setHoverCell({ dayIdx, rowIdx })
                        setTooltipPos({ top: rect.top, left: rect.left + rect.width / 2 })
                      }, 200)
                    }}
                    onMouseLeave={() => {
                      clearTimeout(hoverTimerRef.current)
                      setHoverCell(null)
                      setTooltipPos(null)
                    }}
                  >
                    {/* Driver half */}
                    <div
                      onClick={() => canEdit && handleCellClick(dayIdx, rowIdx, 'driver')}
                      style={{
                        flex: 1, minHeight: '28px', padding: '3px 4px', display: 'flex', flexWrap: 'wrap', gap: '2px', alignContent: 'flex-start',
                        cursor: canEdit ? 'pointer' : 'default', borderBottom: '1px solid var(--border)',
                        position: 'relative',
                      }}
                      onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {driverEntries.length === 0 && canEdit && (
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 }} className="slot-hover-plus">
                          <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                      {driverEntries.length === 0 && !canEdit && (
                        <span style={{ width: '100%', textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', opacity: 0.4, paddingTop: '4px' }}>D</span>
                      )}
                      {driverEntries.map(e => renderEntry(e, 'driver'))}
                    </div>
                    {/* Helper half */}
                    <div
                      onClick={() => canEdit && handleCellClick(dayIdx, rowIdx, 'helper')}
                      style={{
                        flex: 1, minHeight: '28px', padding: '3px 4px', display: 'flex', flexWrap: 'wrap', gap: '2px', alignContent: 'flex-start',
                        cursor: canEdit ? 'pointer' : 'default',
                        position: 'relative',
                      }}
                      onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {helperEntries.length === 0 && canEdit && (
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 }} className="slot-hover-plus">
                          <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                      {helperEntries.length === 0 && !canEdit && (
                        <span style={{ width: '100%', textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', opacity: 0.4, paddingTop: '4px' }}>H</span>
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

      {/* Hover Ring via Portal */}
      {hoverCell && tooltipPos && (() => {
        const driverEntries = getEntries(hoverCell.dayIdx, hoverCell.rowIdx, 'driver')
        const helperEntries = getEntries(hoverCell.dayIdx, hoverCell.rowIdx, 'helper')
        const allEntries = [
          ...driverEntries.map(e => ({ ...e, role: 'driver' })),
          ...helperEntries.map(e => ({ ...e, role: 'helper' })),
        ]
        if (allEntries.length === 0) return null
        const ringRadius = 70 + allEntries.length * 8
        return createPortal(
          <div style={{
            position: 'fixed', top: tooltipPos.top, left: tooltipPos.left,
            width: 0, height: 0, zIndex: 9999, pointerEvents: 'none',
          }}>
            {/* Center cell glow */}
            <div style={{
              position: 'absolute', top: '-20px', left: '-20px', width: '40px', height: '40px',
              borderRadius: '50%', background: 'var(--accent)', opacity: 0.12,
            }} />
            {allEntries.map((entry, i) => {
              const angle = (2 * Math.PI * i) / allEntries.length - Math.PI / 2
              const x = Math.cos(angle) * ringRadius
              const y = Math.sin(angle) * ringRadius
              const colorClass = entry.role === 'driver' ? 'avatar-blue' : 'avatar-green'
              return (
                <div key={entry.id} style={{
                  position: 'absolute',
                  top: y, left: x,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                }}>
                  <div className={`avatar ${colorClass}`} style={{
                    width: '38px', height: '38px', fontSize: '12px',
                    border: '2px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}>
                    {getInitials(entry.contactName)}
                  </div>
                  <div style={{
                    fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)',
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    borderRadius: '6px', padding: '2px 6px', whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis',
                    textAlign: 'center',
                  }}>
                    {entry.contactName}
                  </div>
                </div>
              )
            })}
          </div>,
          document.body
        )
      })()}

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
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <button type="button"
                    className={`btn btn-sm ${assignRole === 'driver' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setAssignRole('driver')}
                    style={{ fontSize: '12px', flex: 1 }}
                  >Driver</button>
                  <button type="button"
                    className={`btn btn-sm ${assignRole === 'helper' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setAssignRole('helper')}
                    style={{ fontSize: '12px', flex: 1 }}
                  >Helper</button>
                </div>
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
                          <div className={`avatar ${getAvatarColor(c.name)}`} style={{ width: '30px', height: '30px', fontSize: '10px' }}>
                            {getInitials(c.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {c.name}
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
                      <div className={`avatar ${getAvatarColor(selectedContact.name)}`} style={{ width: '36px', height: '36px', fontSize: '12px' }}>
                        {getInitials(selectedContact.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {selectedContact.name}
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

      <style>{`.slot-hover-plus { opacity: 1 !important; }`}</style>
    </>
  )
}
