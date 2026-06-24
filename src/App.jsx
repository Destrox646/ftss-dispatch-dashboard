import { useState } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { MessageSquare, Calendar, ClipboardList, LayoutDashboard, Users } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Schedule from './pages/Schedule'
import TimeOff from './pages/TimeOff'
import Contacts from './pages/Contacts'
import { currentUser, initialMessages, initialTimeOffRequests } from './data/mockData'

function App() {
  const [user, setUser] = useState(currentUser)
  const [messages, setMessages] = useState(initialMessages)
  const [timeOffRequests, setTimeOffRequests] = useState(initialTimeOffRequests)

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
          <div className="avatar avatar-blue">{user.avatar}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{user.role}</div>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard currentUser={user} setCurrentUser={setUser} />} />
          <Route path="/chat" element={<Chat messages={messages} setMessages={setMessages} currentUser={user} />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/time-off" element={<TimeOff requests={timeOffRequests} setRequests={setTimeOffRequests} />} />
          <Route path="/contacts" element={<Contacts />} />
        </Routes>
      </main>
    </>
  )
}

export default App
