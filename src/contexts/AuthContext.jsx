import { createContext, useContext, useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // 1. Check stored session token
      const token = localStorage.getItem('ftss-auth-token')
      if (token) {
        try {
          const validate = httpsCallable(functions, 'validateSession')
          const result = await validate({ token })
          if (result.data.valid) {
            setUser({ userId: result.data.userId, name: result.data.name, phone: result.data.phone, token })
            setLoading(false)
            return
          }
        } catch { /* invalid */ }
        localStorage.removeItem('ftss-auth-token')
      }

      // 2. Check trusted IP
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const { ip } = await ipRes.json()
        const checkIP = httpsCallable(functions, 'checkIP')
        const result = await checkIP({ ip })
        if (result.data.trusted) {
          localStorage.setItem('ftss-auth-token', result.data.token)
          setUser({ userId: result.data.userId, name: result.data.name, phone: result.data.phone, token: result.data.token })
          setLoading(false)
          return
        }
      } catch { /* IP check failed */ }

      setLoading(false)
    }
    init()
  }, [])

  const login = (userData) => {
    setUser(userData)
  }

  const logout = async () => {
    const token = localStorage.getItem('ftss-auth-token')
    if (token) {
      try {
        const logoutFn = httpsCallable(functions, 'logoutUser')
        await logoutFn({ token })
      } catch { /* ignore */ }
    }
    localStorage.removeItem('ftss-auth-token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
