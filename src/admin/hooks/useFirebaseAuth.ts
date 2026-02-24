import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { auth } from '@/services/firebase'

// Same whitelist used in addran-advisor-chat Cloud Functions
const ADMIN_EMAILS = ['c.rode@tcu.edu', '0expatriate0@gmail.com']

interface UseFirebaseAuthReturn {
  user: User | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
}

export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (
        firebaseUser &&
        (!firebaseUser.email ||
          !ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase()))
      ) {
        // Reject accounts not on the whitelist
        firebaseSignOut(auth)
        setUser(null)
        setError('Access restricted to authorized admin accounts')
      } else {
        setUser(firebaseUser)
        setError(null)
      }
      setLoading(false)
    })
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  return { user, loading, error, signOut }
}
