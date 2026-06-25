import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

const guestUser = {
  uid: 'guest',
  email: 'dispatch@ftssservices.com',
}

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ user: guestUser, loading: false, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
