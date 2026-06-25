import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [rememberIP, setRememberIP] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '')
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const digits = phone.replace(/\D/g, '')
      if (digits.length !== 10) {
        setError('Enter a valid 10-digit phone number')
        setLoading(false)
        return
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters')
        setLoading(false)
        return
      }

      const formatted = `+1${digits}`

      if (mode === 'register') {
        const register = httpsCallable(functions, 'registerUser')
        await register({ phone: formatted, password, name })
      }

      const login = httpsCallable(functions, 'loginUser')
      const result = await login({ phone: formatted, password })
      const { token, userId, name: userName, phone: userPhone } = result.data

      localStorage.setItem('ftss-auth-token', token)

      if (rememberIP) {
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json')
          const { ip } = await ipRes.json()
          const trustIP = httpsCallable(functions, 'trustIP')
          await trustIP({ token, ip })
        } catch { /* non-critical */ }
      }

      onLogin({ userId, name: userName, phone: userPhone, token })
    } catch (err) {
      setError(err.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'var(--bg-card, #1a1d23)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '12px',
            background: 'var(--accent)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: '700', color: 'white',
            marginBottom: '12px',
          }}>FT</div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            FTSS Dispatcher
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Your Name
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Phone Number
            </label>
            <input type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" maxLength={14}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Password
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px',
            cursor: 'pointer',
          }}>
            <input type="checkbox" checked={rememberIP} onChange={e => setRememberIP(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }} />
            Remember this device
          </label>

          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: '8px', marginBottom: '14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: '13px',
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '10px', fontSize: '14px',
              background: 'var(--accent)', color: 'white', border: 'none',
              borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Register & Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer' }}>
            {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
