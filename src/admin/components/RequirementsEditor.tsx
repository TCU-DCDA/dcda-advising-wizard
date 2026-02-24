import { useState } from 'react'
import { useFirestoreDoc } from '../hooks/useFirestoreData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pencil, Plus, Trash2, Upload, Download, ChevronDown, ChevronUp } from 'lucide-react'
import type {
  Requirements,
  RequirementCategory,
  MutuallyExclusiveRule,
} from '@/types'

type DegreeTab = 'major' | 'minor'

export function RequirementsEditor() {
  const { data, loading, error, save } = useFirestoreDoc<Requirements>(
    'dcda_config',
    'requirements'
  )
  const [degreeTab, setDegreeTab] = useState<DegreeTab>('major')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<RequirementCategory | null>(null)
  const [editingSection, setEditingSection] = useState<'required' | 'electives' | null>(null)
  const [editingRule, setEditingRule] = useState<{ index: number; rule: MutuallyExclusiveRule } | null>(null)

  if (loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading requirements...</div>
  }

  if (error) {
    return <div className="text-destructive py-12 text-center">{error}</div>
  }

  if (!data) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">
          No requirements in Firestore yet. Import your existing requirements.json.
        </p>
        <Button onClick={handleImport} className="gap-2">
          <Upload className="size-4" />
          Import requirements.json
        </Button>
      </div>
    )
  }

  const degree = data[degreeTab]

  function handleExport() {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'requirements.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as Requirements
        if (!imported.major || !imported.minor) {
          alert('Invalid requirements JSON format')
          return
        }
        await save(imported)
      } catch {
        alert('Failed to parse JSON file')
      }
    }
    input.click()
  }

  async function handleSaveCategory(
    section: 'required' | 'electives',
    category: RequirementCategory
  ) {
    if (!data) return
    const updated = { ...data }
    const degreeData = { ...updated[degreeTab] }
    const sectionData = { ...degreeData[section]! }
    const cats = [...sectionData.categories]
    const idx = cats.findIndex((c) => c.id === category.id)
    if (idx >= 0) {
      cats[idx] = category
    } else {
      cats.push(category)
    }
    sectionData.categories = cats
    degreeData[section] = sectionData
    updated[degreeTab] = degreeData
    await save(updated)
    setEditingCategory(null)
    setEditingSection(null)
  }

  async function handleDeleteCategory(section: 'required' | 'electives', categoryId: string) {
    if (!data) return
    const updated = { ...data }
    const degreeData = { ...updated[degreeTab] }
    const sectionData = { ...degreeData[section]! }
    sectionData.categories = sectionData.categories.filter((c) => c.id !== categoryId)
    degreeData[section] = sectionData
    updated[degreeTab] = degreeData
    await save(updated)
  }

  async function handleSaveRule(index: number, rule: MutuallyExclusiveRule) {
    if (!data) return
    const updated = { ...data }
    const rules = [...updated.mutuallyExclusive]
    if (index >= 0 && index < rules.length) {
      rules[index] = rule
    } else {
      rules.push(rule)
    }
    updated.mutuallyExclusive = rules
    await save(updated)
    setEditingRule(null)
  }

  async function handleDeleteRule(index: number) {
    if (!data) return
    const updated = { ...data }
    updated.mutuallyExclusive = updated.mutuallyExclusive.filter((_, i) => i !== index)
    await save(updated)
  }

  const renderCategories = (section: 'required' | 'electives', categories: RequirementCategory[]) => (
    <div className="space-y-2">
      {categories.map((cat) => {
        const isExpanded = expandedCategory === cat.id
        return (
          <div key={cat.id} className="border rounded-lg">
            <button
              type="button"
              onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.hours}h</span>
                {cat.selectOne && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Select One
                  </span>
                )}
              </div>
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            {isExpanded && (
              <div className="border-t px-4 py-3 space-y-2">
                <div className="text-sm text-muted-foreground">
                  <strong>Courses:</strong>{' '}
                  {cat.courses?.join(', ') || 'None'}
                </div>
                {cat.prerequisites && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Prerequisites:</strong>{' '}
                    {cat.prerequisites.join(', ')}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setEditingCategory({ ...cat })
                      setEditingSection(section)
                    }}
                  >
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCategory(section, cat.id)}
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => {
          setEditingCategory({
            id: '',
            name: '',
            hours: 3,
            courses: [],
            selectOne: false,
          })
          setEditingSection(section)
        }}
      >
        <Plus className="size-4" />
        Add Category
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Requirements</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1">
            <Upload className="size-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Degree Type Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {(['major', 'minor'] as DegreeTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setDegreeTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              degreeTab === tab
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {data[tab].name} ({data[tab].totalHours}h)
          </button>
        ))}
      </div>

      {/* Required Categories */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">
          {degree.required.name} ({degree.required.hours}h)
        </h3>
        {renderCategories('required', degree.required.categories)}
      </section>

      {/* Elective Categories (Major only) */}
      {degree.electives && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">
            {degree.electives.name} ({degree.electives.hours}h)
          </h3>
          {renderCategories('electives', degree.electives.categories)}
        </section>
      )}

      {/* General Electives */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">
          {degree.generalElectives.name} ({degree.generalElectives.hours}h)
        </h3>
        <div className="border rounded-lg p-4 text-sm space-y-1">
          <p>
            <strong>Count:</strong> {degree.generalElectives.count}
          </p>
          <p className="text-muted-foreground">{degree.generalElectives.note}</p>
        </div>
      </section>

      {/* Mutually Exclusive Rules */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Mutually Exclusive Rules</h3>
        <div className="space-y-2">
          {data.mutuallyExclusive.map((rule, i) => (
            <div key={i} className="border rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="text-sm">
                <span className="font-mono">{rule.courses.join(' / ')}</span>
                <span className="text-muted-foreground ml-2">— {rule.message}</span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingRule({ index: i, rule: { ...rule } })}
                  className="p-1.5 rounded hover:bg-muted"
                >
                  <Pencil className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRule(i)}
                  className="p-1.5 rounded hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setEditingRule({ index: -1, rule: { courses: [], message: '' } })
            }
          >
            <Plus className="size-4" />
            Add Rule
          </Button>
        </div>
      </section>

      {/* Category Edit Dialog */}
      {editingCategory && editingSection && (
        <CategoryEditDialog
          category={editingCategory}
          onSave={(cat) => handleSaveCategory(editingSection, cat)}
          onClose={() => {
            setEditingCategory(null)
            setEditingSection(null)
          }}
        />
      )}

      {/* Rule Edit Dialog */}
      {editingRule && (
        <RuleEditDialog
          rule={editingRule.rule}
          onSave={(rule) => handleSaveRule(editingRule.index, rule)}
          onClose={() => setEditingRule(null)}
        />
      )}
    </div>
  )
}

function CategoryEditDialog({
  category,
  onSave,
  onClose,
}: {
  category: RequirementCategory
  onSave: (cat: RequirementCategory) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<RequirementCategory>({ ...category })
  const [coursesText, setCoursesText] = useState(category.courses?.join(', ') || '')
  const [prereqsText, setPrereqsText] = useState(category.prerequisites?.join(', ') || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.id || !form.name) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        courses: coursesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        prerequisites: prereqsText
          ? prereqsText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category.id ? `Edit ${category.name}` : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">ID</label>
              <Input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="camelCase"
                disabled={!!category.id}
                className="h-10 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Hours</label>
              <Input
                type="number"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) || 0 })}
                className="h-10 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Courses (comma-separated codes)
            </label>
            <textarea
              value={coursesText}
              onChange={(e) => setCoursesText(e.target.value)}
              placeholder="MATH 10043, INSC 20153"
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-card resize-none font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Prerequisites (comma-separated IDs)
            </label>
            <Input
              value={prereqsText}
              onChange={(e) => setPrereqsText(e.target.value)}
              placeholder="statistics, coding"
              className="h-10 text-sm font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="selectOne"
              checked={form.selectOne ?? false}
              onChange={(e) => setForm({ ...form, selectOne: e.target.checked })}
              className="size-4"
            />
            <label htmlFor="selectOne" className="text-sm">
              Select One (student picks one course from the list)
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={saving || !form.id || !form.name}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RuleEditDialog({
  rule,
  onSave,
  onClose,
}: {
  rule: MutuallyExclusiveRule
  onSave: (rule: MutuallyExclusiveRule) => Promise<void>
  onClose: () => void
}) {
  const [coursesText, setCoursesText] = useState(rule.courses.join(', '))
  const [message, setMessage] = useState(rule.message)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const courses = coursesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (courses.length < 2 || !message) return
    setSaving(true)
    try {
      await onSave({ courses, message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mutually Exclusive Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Courses (comma-separated, min 2)
            </label>
            <Input
              value={coursesText}
              onChange={(e) => setCoursesText(e.target.value)}
              placeholder="MATH 10043, INSC 20153"
              className="h-10 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="These courses are mutually exclusive..."
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-card resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
