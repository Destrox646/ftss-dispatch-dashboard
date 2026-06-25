import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

// Generic hook for real-time collection sync
function useCollection(collectionName, orderField = null) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const collRef = collection(db, collectionName)
    const q = orderField ? query(collRef, orderBy(orderField)) : collRef
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [collectionName, orderField])

  return { data, loading }
}

// Schedule entries — shared across all users
export function useScheduleEntries() {
  return useCollection('scheduleEntries')
}

export function useScheduleLabels() {
  const [labels, setLabels] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'scheduleLabels'), (snap) => {
      setLabels(snap.exists() ? snap.data().labels : null)
      setLoading(false)
    })
    return unsub
  }, [])

  const saveLabels = async (newLabels) => {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, 'settings', 'scheduleLabels'), { labels: newLabels })
  }

  return { labels, loading, saveLabels }
}

// Chat messages
export function useChatMessages() {
  return useCollection('messages', 'timestamp')
}

export async function sendMessage(msg) {
  await addDoc(collection(db, 'messages'), {
    ...msg,
    timestamp: serverTimestamp(),
  })
}

// Time off requests
export function useTimeOffRequests() {
  return useCollection('timeOffRequests', 'submittedAt')
}

export async function addTimeOffRequest(req) {
  await addDoc(collection(db, 'timeOffRequests'), {
    ...req,
    submittedAt: new Date().toISOString().split('T')[0],
  })
}

export async function updateTimeOffStatus(id, status) {
  await updateDoc(doc(db, 'timeOffRequests', id), { status })
}

// Schedule entries CRUD
export async function addScheduleEntry(entry) {
  await addDoc(collection(db, 'scheduleEntries'), entry)
}

export async function deleteScheduleEntry(id) {
  await deleteDoc(doc(db, 'scheduleEntries', id))
}
