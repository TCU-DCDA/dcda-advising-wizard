import { Input } from '@/components/ui/input'

interface NameStepProps {
  value: string
  onChange: (name: string) => void
}

export function NameStep({ value, onChange }: NameStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">What's your name?</h2>
        <p className="text-sm text-muted-foreground">
          This is used for your advising plan export only.
        </p>
      </div>

      <Input
        type="text"
        placeholder="Enter your name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
    </div>
  )
}
