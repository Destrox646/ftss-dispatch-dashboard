import { useMemo, useState } from 'react'
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react'
import { useScheduleEntries } from '../hooks/useFirestore'
import { useContacts } from '../hooks/useContacts'
import { useAuth } from '../contexts/AuthContext'

export default function Financials() {
  const [chartMode, setChartMode] = useState('cost') // 'cost' or 'shifts'
  const [selectedBar, setSelectedBar] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const { data: entries } = useScheduleEntries()
  const { allContacts } = useContacts()
  const { user } = useAuth()
  const isManager = user?.role === 'manager'

  const contactMap = useMemo(() => {
    const map = {}
    for (const c of allContacts) {
      map[c.id] = c
      // Also index by name for schedule entries that may not have contactId
      map[c.name.toLowerCase()] = c
    }
    return map
  }, [allContacts])

  const financialData = useMemo(() => {
    // Count schedule appearances per contact
    const counts = {}
    for (const entry of entries) {
      const key = entry.contactId || entry.contactName?.toLowerCase()
      if (!key) continue
      if (!counts[key]) counts[key] = { count: 0, contactName: entry.contactName || 'Unknown', contactId: entry.contactId }
      counts[key].count++
    }

    // Ensure these contacts always show minimum 1 shift/week
    const alwaysOne = ['charles wagner', 'james tontillo']
    for (const name of alwaysOne) {
      const found = Object.values(counts).find(c => c.contactName?.toLowerCase().includes(name))
      if (found) {
        found.count = Math.max(found.count, 1)
      } else {
        counts[name] = { count: 1, contactName: name.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), contactId: null }
      }
    }

    // Build rows with rate-of-pay
    const rows = []
    for (const key of Object.keys(counts)) {
      const info = counts[key]
      const contact = contactMap[info.contactId] || contactMap[info.contactName?.toLowerCase()]
      const rate = parseFloat(contact?.organization) || 0
      rows.push({
        id: info.contactId || key,
        name: info.contactName || 'Unknown',
        count: info.count,
        rate,
        totalCost: rate * info.count,
      })
    }

    // Sort by total cost descending
    rows.sort((a, b) => b.totalCost - a.totalCost)
    return rows
  }, [entries, contactMap])

  const totalShifts = financialData.reduce((s, r) => s + r.count, 0)
  const totalCost = financialData.reduce((s, r) => s + r.totalCost, 0)
  const contactsScheduled = financialData.filter(r => r.count > 0).length
  const maxCost = financialData.length > 0 ? financialData[0].totalCost : 0

  const formatCurrency = (v) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
  }

  const chartData = financialData.filter(r => r.totalCost > 0).slice(0, 20)

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Financials</h2>
            <p>Schedule costs based on rate-of-pay x shifts worked</p>
          </div>
        </div>
      </div>
      <div className="page-body">

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cost</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isManager ? `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Shifts</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalShifts}</div>
            </div>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} style={{ color: '#a855f7' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scheduled</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{contactsScheduled}</div>
            </div>
          </div>
        </div>

        {/* Ranked Earners List */}
        {chartData.length > 0 && (
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Highest to Lowest Earners
                </h3>
              </div>
              {isManager && (
                <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '2px' }}>
                  <button
                    onClick={() => setChartMode('cost')}
                    style={{
                      padding: '5px 12px', fontSize: '12px', fontWeight: 500, border: 'none', borderRadius: '4px', cursor: 'pointer',
                      background: chartMode === 'cost' ? 'var(--accent)' : 'transparent',
                      color: chartMode === 'cost' ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                    }}
                  >Cost</button>
                  <button
                    onClick={() => setChartMode('shifts')}
                    style={{
                      padding: '5px 12px', fontSize: '12px', fontWeight: 500, border: 'none', borderRadius: '4px', cursor: 'pointer',
                      background: chartMode === 'shifts' ? 'var(--accent)' : 'transparent',
                      color: chartMode === 'shifts' ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                    }}
                  >Shifts</button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
              {tooltip && (
                <div
                  style={{
                    position: 'absolute',
                    left: tooltip.x,
                    top: tooltip.y - 8,
                    transform: 'translate(-50%, -100%)',
                    background: 'var(--bg-primary, #1a1a2e)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    zIndex: 100,
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    minWidth: '160px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{tooltip.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {tooltip.shifts} shift{tooltip.shifts !== 1 ? 's' : ''} × ${tooltip.rate.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>
                    ${tooltip.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
              {chartData.map((row, i) => {
                const isSelected = selectedBar === row.id
                const value = chartMode === 'cost' ? row.totalCost : row.count
                const maxValue = chartMode === 'cost' ? maxCost : Math.max(...chartData.map(r => r.count))
                const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
                const rankColor = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--text-muted)'
                return (
                  <div
                    key={row.id}
                    onClick={() => setSelectedBar(isSelected ? null : row.id)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const parentRect = e.currentTarget.parentElement.getBoundingClientRect()
                      setTooltip({
                        x: rect.left - parentRect.left + rect.width / 2,
                        y: rect.top - parentRect.top,
                        name: row.name.replace(/^FTSS\s*/i, ''),
                        shifts: row.count,
                        rate: row.rate,
                        totalCost: row.totalCost,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(59, 130, 246, 0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {/* Rank number */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700,
                      background: i < 3 ? `${rankColor}18` : 'var(--bg-tertiary)',
                      color: rankColor,
                    }}>
                      {i + 1}
                    </div>

                    {/* Name */}
                    <div style={{ width: '150px', fontSize: '13px', color: isSelected ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isSelected ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 0.2s ease' }}>
                      {row.name.replace(/^FTSS\s*/i, '')}
                    </div>

                    {/* Bar */}
                    <div style={{ flex: 1, height: '22px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: i === 0
                          ? 'linear-gradient(90deg, var(--accent), #60a5fa)'
                          : `var(--accent)${Math.round(85 - (i * 2.5)).toString().padStart(2, '0')}`,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                        minWidth: value > 0 ? '2px' : '0',
                      }} />
                    </div>

                    {/* Value */}
                    <div style={{ width: '80px', fontSize: '13px', color: isSelected ? 'var(--accent)' : 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 600, flexShrink: 0, textAlign: 'right', transition: 'color 0.2s ease' }}>
                      {chartMode === 'cost' ? `$${row.totalCost.toLocaleString()}` : `${row.count} shifts`}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Detailed Table */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Shifts</th>
                  {isManager && <th>Rate-of-Pay</th>}
                  {isManager && <th>Total Cost</th>}
                </tr>
              </thead>
              <tbody>
                {financialData.map(row => (
                  <tr key={row.id}>
                    <td>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {row.name.replace(/^FTSS\s*/i, '')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{row.count}</span>
                    </td>
                    {isManager && (
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                          {row.rate > 0 ? `$${row.rate.toFixed(2)}` : '—'}
                        </span>
                      </td>
                    )}
                    {isManager && (
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: row.totalCost > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {row.totalCost > 0 ? `$${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
                {financialData.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 4 : 2} className="table-empty">No schedule data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
