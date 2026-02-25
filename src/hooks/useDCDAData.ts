import { useState, useEffect, createContext, useContext } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { CourseOfferings } from '@/types'

export interface DCDAData {
  offerings: CourseOfferings | null
  loading: boolean
}

const defaultData: DCDAData = { offerings: null, loading: true }

export const DCDADataContext = createContext<DCDAData>(defaultData)

export function useDCDAData(): DCDAData {
  return useContext(DCDADataContext)
}

/** Subscribes to Firestore offerings doc and returns live data with static fallback */
export function useDCDADataLoader(): DCDAData {
  const [data, setData] = useState<DCDAData>(defaultData)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'dcda_config', 'offerings_fa26'),
      (snap) => {
        const offerings = snap.exists() ? (snap.data() as CourseOfferings) : null
        setData({ offerings, loading: false })
      },
      () => {
        // Firestore unavailable — keep static fallback
        setData({ offerings: null, loading: false })
      }
    )
    return unsub
  }, [])

  return data
}
