import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, UserPlus } from 'lucide-react'

export default function Login() {
  const { login, signup } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignup) {
        await signup(email, password)
      } else {
        await login(email, password)
      }
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' ? 'Invalid email or password'
        : err.code === 'auth/email-already-in-use' ? 'Email already registered'
        : err.code === 'auth/weak-password' ? 'Password must be at least 6 characters'
        : err.message
      setError(msg)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', padding: '40px',
        background: 'var(--bg-secondary)', borderRadius: '12px',
        border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 16px',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 800, color: 'white',
          }}>FT</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            FTSS Services LLC
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Dispatch Dashboard</p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: '16px', borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', fontSize: '13px',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email" required autoFocus
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password" required
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '8px' }}>
            {isSignup ? <><UserPlus size={16} /> Create Account</> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <button
          onClick={() => { setIsSignup(!isSignup); setError('') }}
          style={{
            display: 'block', width: '100%', marginTop: '16px', padding: '10px',
            background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
            color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  )
}
