import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { MessageSquare, Calendar, ClipboardList, LayoutDashboard, Users, LogOut } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Schedule from './pages/Schedule'
import TimeOff from './pages/TimeOff'
import Contacts from './pages/Contacts'

function App() {
  const { user, loading, logout } = useAuth()

  if (loading) return null
  if (!user) return <Login />

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">FT</div>
          <div>
            <h1>FTSS Services LLC</h1>
            <span>Dispatch Dashboard</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            <LayoutDashboard />
            Dashboard
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
            <MessageSquare />
            Chat
          </NavLink>
          <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''}>
            <Calendar />
            Schedule
          </NavLink>
          <NavLink to="/time-off" className={({ isActive }) => isActive ? 'active' : ''}>
            <ClipboardList />
            Time Off
          </NavLink>
          <NavLink to="/contacts" className={({ isActive }) => isActive ? 'active' : ''}>
            <Users />
            Contacts
          </NavLink>
        </nav>
        <div className="sidebar-user">
          <div className="avatar avatar-blue">{user.email[0].toUpperCase()}{user.email[1].toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.email}</div>
            <div className="sidebar-user-role">Dispatcher</div>
          </div>
          <button onClick={logout} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            padding: '6px', borderRadius: '6px', marginLeft: 'auto', transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/time-off" element={<TimeOff />} />
          <Route path="/contacts" element={<Contacts />} />
        </Routes>
      </main>
    </>
  )
}

export default App
