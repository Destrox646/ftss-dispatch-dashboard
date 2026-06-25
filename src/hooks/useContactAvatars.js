import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ftss-contact-avatars'

function loadAvatars() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export function useContactAvatars() {
  const [avatars, setAvatars] = useState(loadAvatars)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(avatars))
  }, [avatars])

  const setAvatar = (contactId, dataUrl) => {
    setAvatars(prev => ({ ...prev, [contactId]: dataUrl }))
  }

  const removeAvatar = (contactId) => {
    setAvatars(prev => {
      const next = { ...prev }
      delete next[contactId]
      return next
    })
  }

  return { avatars, setAvatar, removeAvatar }
}
