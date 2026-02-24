import { useState, useEffect, useCallback } from 'react'
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

// Hook for reading/writing a single Firestore document
export function useFirestoreDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const docRef = doc(db, collectionPath, docId)
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData(snapshot.data() as T)
        } else {
          setData(null)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [collectionPath, docId])

  const save = useCallback(
    async (newData: T) => {
      try {
        const docRef = doc(db, collectionPath, docId)
        await setDoc(docRef, newData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
        throw err
      }
    },
    [collectionPath, docId]
  )

  return { data, loading, error, save }
}

// Hook for reading all documents in a collection
export function useFirestoreCollection<T extends DocumentData>(
  collectionPath: string
) {
  const [data, setData] = useState<(T & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const snapshot = await getDocs(collection(db, collectionPath))
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as T),
      }))
      setData(docs)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [collectionPath])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveDoc = useCallback(
    async (docId: string, docData: T) => {
      try {
        await setDoc(doc(db, collectionPath, docId), docData)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
        throw err
      }
    },
    [collectionPath, refresh]
  )

  const deleteDocument = useCallback(
    async (docId: string) => {
      try {
        await deleteDoc(doc(db, collectionPath, docId))
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed')
        throw err
      }
    },
    [collectionPath, refresh]
  )

  return { data, loading, error, refresh, saveDoc, deleteDocument }
}
