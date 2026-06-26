import { useState, useMemo } from 'react'
import { contacts as staticContacts } from '../data/contacts'

const CUSTOM_KEY = 'ftss-custom-contacts'

function loadCustom() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]') } catch { return [] }
}

export function useContacts() {
  const [customContacts, setCustomContacts] = useState(loadCustom)

  const allContacts = useMemo(() => [...staticContacts, ...customContacts], [customContacts])
  const ftssContacts = useMemo(() => allContacts.filter(c => c.name.toUpperCase().startsWith('FTSS')), [allContacts])

  const addContact = (contact) => {
    const updated = [...customContacts, contact]
    setCustomContacts(updated)
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated))
  }

  return { allContacts, ftssContacts, addContact, customContacts }
}
