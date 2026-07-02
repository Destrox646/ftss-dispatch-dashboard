import { useState, useEffect, useCallback, useMemo } from 'react'
import { contacts as staticContacts } from '../data/contacts'
import { db } from '../firebase'
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore'

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

  // Listen for custom contacts from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'customContacts'), (snap) => {
      const firestoreContacts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setCustomContacts(firestoreContacts)
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(firestoreContacts))
    })
    return unsub
  }, [])

  // Listen for contact overrides from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'contactOverrides'), (snap) => {
      const firestoreOverrides = {}
      snap.docs.forEach(d => { firestoreOverrides[d.id] = d.data() })
      setOverrides(firestoreOverrides)
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(firestoreOverrides))
    })
    return unsub
  }, [])

  const allContacts = useMemo(() => {
    const seen = new Set()
    return [...staticContacts, ...customContacts].map(c => ({
      ...c,
      ...(overrides[c.id] || {}),
    })).filter(c => {
      const key = c.name?.toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [customContacts, overrides])

  const ftssContacts = useMemo(() => {
    return allContacts.filter(c => c.name.toUpperCase().startsWith('FTSS'))
  }, [allContacts])

  const addContact = async (contact) => {
    // Save to Firestore
    await setDoc(doc(db, 'customContacts', contact.id), {
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: contact.name,
      email: contact.email || '',
      phones: contact.phones || [],
      organization: contact.organization || '',
    })
    // Update local state immediately
    const updated = [...customContacts, contact]
    setCustomContacts(updated)
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated))
  }

  const editContact = useCallback(async (id, updates) => {
    // Save override to Firestore
    await setDoc(doc(db, 'contactOverrides', id), updates, { merge: true })
    // Update local state immediately
    setOverrides(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...updates } }
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deleteContact = useCallback(async (id) => {
    // Check if it's a custom contact
    const isCustom = customContacts.some(c => c.id === id)
    if (isCustom) {
      // Delete from Firestore
      await deleteDoc(doc(db, 'customContacts', id))
      setCustomContacts(prev => {
        const updated = prev.filter(c => c.id !== id)
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated))
        return updated
      })
    } else {
      // Mark static contact as deleted via override
      await setDoc(doc(db, 'contactOverrides', id), { _deleted: true }, { merge: true })
      setOverrides(prev => {
        const next = { ...prev, [id]: { ...(prev[id] || {}), _deleted: true } }
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
        return next
      })
    }
  }, [customContacts])

  return { allContacts, ftssContacts, addContact, editContact, deleteContact, customContacts, overrides }
}
