import { StrictMode, lazy, Suspense, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const AdminApp = lazy(() => import('./admin/AdminApp'))

function Root() {
  const [isAdmin, setIsAdmin] = useState(
    window.location.hash.startsWith('#/admin')
  )

  useEffect(() => {
    const handler = () => setIsAdmin(window.location.hash.startsWith('#/admin'))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  if (isAdmin) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading admin...</div>
        </div>
      }>
        <AdminApp />
      </Suspense>
    )
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
