import { useState, useEffect } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { MessageSquare, ClipboardList, Calendar, LayoutDashboard, Users, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { useSettings } from './contexts/SettingsContext'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Schedule from './pages/Schedule'
import TimeOff from './pages/TimeOff'
import Contacts from './pages/Contacts'
import Settings from './pages/Settings'
import Login from './pages/Login'

function App() {
  const { user, loading, login, logout } = useAuth()
  const { settings } = useSettings()

  const accentRgba = (alpha) => {
    const hex = settings.accentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '14px',
      }}>
        Checking credentials...
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={login} />
  }

  return (
    <>
      <style>{`
        :root {
          --accent: ${settings.accentColor};
          --accent-hover: ${settings.accentColor}dd;
          --accent-light: ${accentRgba(0.15)};
        }
      `}</style>
      <aside className="sidebar">
        <div className="sidebar-logo">
          {settings.logoImage ? (
            <img src={settings.logoImage} alt="Logo" className="sidebar-logo-icon" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="sidebar-logo-icon">{settings.logoInitials}</div>
          )}
          <div>
            <h1>{settings.companyName}</h1>
            <span>{settings.dashboardSubtitle}</span>
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
          <div className="avatar avatar-blue">{(user.name || 'U')[0].toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || 'User'}</div>
            <div className="sidebar-user-role">{user.phone || 'Dispatcher'}</div>
          </div>
          <button onClick={logout} title="Sign out" style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '4px', marginLeft: 'auto', display: 'flex',
          }}>
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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </>
  )
}

export default App
