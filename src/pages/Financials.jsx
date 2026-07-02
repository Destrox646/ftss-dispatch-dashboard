import { useMemo } from 'react'
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react'
import { useScheduleEntries } from '../hooks/useFirestore'
import { useContacts } from '../hooks/useContacts'
import { useAuth } from '../contexts/AuthContext'

export default function Financials() {
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

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Top Earners by Total Cost
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {chartData.map((row, i) => (
                <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '140px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                    {row.name.replace(/^FTSS\s*/i, '')}
                  </div>
                  <div style={{ flex: 1, height: '22px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%',
                      width: maxCost > 0 ? `${(row.totalCost / maxCost) * 100}%` : '0%',
                      background: i === 0 ? 'var(--accent)' : `var(--accent)${Math.round(85 - (i * 2.5)).toString().padStart(2, '0')}`,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                      minWidth: row.totalCost > 0 ? '2px' : '0',
                    }} />
                  </div>
                  <div style={{ width: '70px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', flexShrink: 0 }}>
                    {isManager ? `$${row.totalCost.toLocaleString()}` : `${row.count} shifts`}
                  </div>
                </div>
              ))}
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
