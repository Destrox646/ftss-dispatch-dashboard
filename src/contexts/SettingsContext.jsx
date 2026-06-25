import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(null)

const DEFAULTS = {
  companyName: 'FTSS Services LLC',
  logoInitials: 'FT',
  dispatcherName: 'Dispatcher',
  accentColor: '#3b82f6',
  dashboardSubtitle: 'Dispatch Dashboard',
  greetingOverride: '',
  scheduleEditEnabled: false,
  logoImage: '',
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('ftss-settings')
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    localStorage.setItem('ftss-settings', JSON.stringify(settings))
  }, [settings])

  const updateSettings = (partial) => {
    setSettings(prev => ({ ...prev, ...partial }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
