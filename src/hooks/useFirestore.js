import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore'
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

