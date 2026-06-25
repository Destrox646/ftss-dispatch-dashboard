import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { MessageSquare, Calendar, ClipboardList, LayoutDashboard, Users, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { useSettings } from './contexts/SettingsContext'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Schedule from './pages/Schedule'
import TimeOff from './pages/TimeOff'
import Contacts from './pages/Contacts'
import Settings from './pages/Settings'

function App() {
  const { user } = useAuth()
  const { settings } = useSettings()

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">{settings.logoInitials}</div>
          <div>
            <h1>{settings.companyName}</h1>
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
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
            <SettingsIcon />
            Settings
          </NavLink>
        </nav>
        <div className="sidebar-user">
          <div className="avatar avatar-blue">{settings.logoInitials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{settings.dispatcherName}</div>
            <div className="sidebar-user-role">Dispatcher</div>
          </div>
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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </>
  )
}

export default App
