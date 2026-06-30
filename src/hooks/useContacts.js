import { useState, useMemo, useCallback } from 'react'
import { contacts as staticContacts } from '../data/contacts'

const CUSTOM_KEY = 'ftss-custom-contacts'
const OVERRIDES_KEY = 'ftss-contact-overrides'

function loadCustom() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]') } catch { return [] }
}

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}') } catch { return {} }
}

export function useContacts() {
  const [customContacts, setCustomContacts] = useState(loadCustom)
  const [overrides, setOverrides] = useState(loadOverrides)

  const allContacts = useMemo(() => {
    const merged = [...staticContacts, ...customContacts].map(c => ({
      ...c,
      ...(overrides[c.id] || {}),
    }))
    return merged
  }, [customContacts, overrides])

  const ftssContacts = useMemo(() => allContacts.filter(c => c.name.toUpperCase().startsWith('FTSS')), [allContacts])

  const addContact = (contact) => {
    const updated = [...customContacts, contact]
    setCustomContacts(updated)
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated))
  }

  const editContact = useCallback((id, updates) => {
    setOverrides(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...updates } }
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deleteContact = useCallback((id) => {
    // If it's a custom contact, remove it
    setCustomContacts(prev => {
      const found = prev.find(c => c.id === id)
      if (found) {
        const updated = prev.filter(c => c.id !== id)
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated))
        return updated
      }
      return prev
    })
    // Mark static contact as deleted via override
    setOverrides(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), _deleted: true } }
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { allContacts, ftssContacts, addContact, editContact, deleteContact, customContacts, overrides }
}
