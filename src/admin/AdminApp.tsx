import { useState } from 'react'
import { useFirebaseAuth } from './hooks/useFirebaseAuth'
import { AdminLogin } from './components/AdminLogin'
import { CourseEditor } from './components/CourseEditor'
import { RequirementsEditor } from './components/RequirementsEditor'
import { OfferingsEditor } from './components/OfferingsEditor'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { FrequencyTracker } from './components/FrequencyTracker'
import { Button } from '@/components/ui/button'
import { LogOut, BarChart3, BookOpen, Settings, Calendar, Clock } from 'lucide-react'

type AdminTab = 'analytics' | 'courses' | 'requirements' | 'offerings' | 'frequency'

const TABS: { key: AdminTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'courses', label: 'Courses', icon: BookOpen },
  { key: 'requirements', label: 'Requirements', icon: Settings },
  { key: 'offerings', label: 'Offerings', icon: Calendar },
  { key: 'frequency', label: 'Frequency', icon: Clock },
]

export default function AdminApp() {
  const { user, loading, error, signOut } = useFirebaseAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AdminLogin error={error} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">DCDA Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80 hidden sm:inline">{user.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b bg-card">
        <div className="max-w-6xl mx-auto flex">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'courses' && <CourseEditor />}
        {activeTab === 'requirements' && <RequirementsEditor />}
        {activeTab === 'offerings' && <OfferingsEditor />}
        {activeTab === 'frequency' && <FrequencyTracker />}
      </main>
    </div>
  )
}
