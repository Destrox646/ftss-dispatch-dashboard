import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'

const ROWS = 12
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Schedule() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [cells, setCells] = useState({})

  const weekDates = useMemo(() =>
    DAYS.map((_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const getCellKey = (row, dayIdx) => {
    const dateStr = format(weekDates[dayIdx], 'yyyy-MM-dd')
    return `${dateStr}-${row}`
  }

  const handleChange = (row, dayIdx, value) => {
    const key = getCellKey(row, dayIdx)
    setCells(prev => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Weekly Schedule</h2>
            <p>Click any cell to type directly into it</p>
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
          </div>
        </div>
      </div>
      <div className="page-body" style={{ overflowX: 'auto', padding: '20px 16px' }}>
        <div style={{ minWidth: '900px' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
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

          {/* Editable rows */}
          {Array.from({ length: ROWS }, (_, rowIdx) => (
            <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
              <div style={{
                padding: '8px', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '12px', background: 'var(--bg-tertiary)',
              }}>
                Row {rowIdx + 1}
              </div>
              {DAYS.map((_, dayIdx) => {
                const key = getCellKey(rowIdx, dayIdx)
                const isToday = format(weekDates[dayIdx], 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                return (
                  <div key={dayIdx} style={{
                    background: isToday ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                  }}>
                    <textarea
                      value={cells[key] || ''}
                      onChange={e => handleChange(rowIdx, dayIdx, e.target.value)}
                      placeholder=""
                      style={{
                        width: '100%', height: '100%', minHeight: '44px',
                        padding: '8px 10px', background: 'transparent',
                        border: 'none', outline: 'none', resize: 'vertical',
                        fontSize: '13px', fontFamily: 'inherit',
                        color: 'var(--text-primary)', lineHeight: '1.4',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
