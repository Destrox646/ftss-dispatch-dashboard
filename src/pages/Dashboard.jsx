import { useMemo, useState, useEffect } from 'react'
import { Users, MessageSquare, ChevronRight, CalendarDays, Droplets, Wind, Fuel } from 'lucide-react'
import { format } from 'date-fns'
import { useContacts } from '../hooks/useContacts'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useChatMessages } from '../hooks/useFirestore'
import { useTimeOffRequests } from '../hooks/useFirestore'

const QUICK_LINKS = [
  { label: 'Chat', path: '/chat', icon: MessageSquare, color: '#8b5cf6' },
  { label: 'Schedule', path: '/schedule', icon: CalendarDays, color: '#3b82f6' },
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

  const [weather, setWeather] = useState(null)
  const [dieselPrices, setDieselPrices] = useState([])
  const [dieselError, setDieselError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`
          )
          const data = await res.json()
          if (data.current) {
            setWeather({
              temp: Math.round(data.current.temperature_2m),
              humidity: data.current.relative_humidity_2m,
              wind: Math.round(data.current.wind_speed_10m),
              code: data.current.weather_code,
            })
          }
        } catch {}
      },
      () => {}
    )
  }, [])

  useEffect(() => {
    const apiKey = settings.eiaApiKey
    if (!apiKey) return
    const fetchDiesel = async () => {
      try {
        const res = await fetch(
          `https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[product][]=EMD&sort[0][column]=period&sort[0][direction]=desc&length=500`
        )
        const json = await res.json()
        const rows = json?.response?.data
        if (!rows || rows.length === 0) {
          setDieselError('No diesel data available')
          return
        }
        // Group by region name, keep most recent
        const byRegion = {}
        for (const row of rows) {
          const region = row['duoarea-name'] || row.duoarea || ''
          if (!region || region === 'U.S.' || region.includes('PADD')) continue
          if (!byRegion[region]) {
            byRegion[region] = { region, price: parseFloat(row.value), period: row.period }
          }
        }
        const regions = Object.values(byRegion)
          .filter(r => !isNaN(r.price))
          .sort((a, b) => b.price - a.price)
          .slice(0, 8)
        setDieselPrices(regions)
      } catch {
        setDieselError('Failed to load diesel prices')
      }
    }
    fetchDiesel()
  }, [settings.eiaApiKey])

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  const getWeatherInfo = (code) => {
    if (code === 0) return { label: 'Clear', icon: '☀️' }
    if (code <= 3) return { label: 'Cloudy', icon: '☁️' }
    if (code <= 49) return { label: 'Foggy', icon: '🌫️' }
    if (code <= 59) return { label: 'Drizzle', icon: '🌦️' }
    if (code <= 69) return { label: 'Rain', icon: '🌧️' }
    if (code <= 79) return { label: 'Snow', icon: '❄️' }
    if (code <= 84) return { label: 'Showers', icon: '🌧️' }
    if (code <= 94) return { label: 'Snow', icon: '❄️' }
    return { label: 'Storm', icon: '⛈️' }
  }

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
              {weather && (
                <div style={{ gridColumn: '1 / -1', padding: '12px', background: 'rgba(59,130,246,0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '36px', lineHeight: 1 }}>{getWeatherInfo(weather.code).icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{weather.temp}°F</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{getWeatherInfo(weather.code).label}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Droplets size={14} style={{ color: '#3b82f6', marginBottom: '2px' }} />
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{weather.humidity}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Wind size={14} style={{ color: '#64748b', marginBottom: '2px' }} />
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{weather.wind} mph</div>
                    </div>
                  </div>
                </div>
              )}
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

          {/* Diesel Prices */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Fuel size={18} style={{ color: '#f59e0b' }} />
                <h3>Diesel Prices by Region</h3>
              </div>
              {dieselPrices.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EIA Weekly Avg</span>
              )}
            </div>
            <div className="card-body">
              {!settings.eiaApiKey ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                  Add your free EIA API key in{' '}
                  <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Settings</a>{' '}
                  to see diesel prices.{' '}
                  <a href="https://www.eia.gov/opendata/register.php" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '12px' }}>Get key &rarr;</a>
                </p>
              ) : dieselError ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>{dieselError}</p>
              ) : dieselPrices.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Loading diesel prices...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {dieselPrices.map((r, i) => (
                    <div key={r.region} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: '8px',
                      background: i === 0 ? 'rgba(239, 68, 68, 0.08)' : i === dieselPrices.length - 1 ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-tertiary)',
                      border: i === 0 ? '1px solid rgba(239, 68, 68, 0.15)' : i === dieselPrices.length - 1 ? '1px solid rgba(34, 197, 94, 0.15)' : '1px solid transparent',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{r.region}</span>
                      <span style={{
                        fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', flexShrink: 0,
                        color: i === 0 ? '#ef4444' : i === dieselPrices.length - 1 ? '#22c55e' : 'var(--text-primary)',
                      }}>
                        ${r.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
