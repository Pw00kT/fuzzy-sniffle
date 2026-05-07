import { useEffect, useState, FormEvent } from 'react'
import { Eye, EyeOff, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface KeyFieldProps {
  label: string
  description: string
  value: string
  isSet: boolean
  placeholder?: string
  onChange: (v: string) => void
}

function KeyField({ label, description, value, isSet, placeholder = 'pplx-...', onChange }: KeyFieldProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {isSet && !value && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="w-3 h-3" /> Configured
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSet ? '••••••••  (leave blank to keep existing)' : placeholder}
          className="w-full pr-10 pl-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

interface SettingsStatus {
  perplexityKeySet: boolean
  openaiKeySet: boolean
}

export default function Settings() {
  const [perplexityKey, setPerplexityKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [status, setStatus] = useState<SettingsStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings', { headers: { Authorization: `Bearer ${localStorage.getItem('idot_auth_token') ?? ''}` } })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const body: Record<string, string> = {}
      if (perplexityKey.trim()) body.perplexityApiKey = perplexityKey.trim()
      if (openaiKey.trim())     body.openaiApiKey     = openaiKey.trim()

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('idot_auth_token') ?? ''}`,
        },
        body: JSON.stringify(body),
      }).then((r) => r.json())

      setStatus(res)
      setPerplexityKey('')
      setOpenaiKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure API keys for AI features</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <KeyField
              label="Perplexity API Key"
              description="Powers meeting extraction, risk analysis, action items, and Ask Sidecar chat. Free for government — get yours at perplexity.ai/api."
              value={perplexityKey}
              isSet={status?.perplexityKeySet ?? false}
              placeholder="pplx-..."
              onChange={setPerplexityKey}
            />
            <KeyField
              label="OpenAI API Key (optional)"
              description="Powers audio transcription via Whisper. Without this, a sample transcript is used instead of real transcription."
              value={openaiKey}
              isSet={status?.openaiKeySet ?? false}
              placeholder="sk-..."
              onChange={setOpenaiKey}
            />
          </CardContent>
        </Card>

        {!status?.perplexityKeySet && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>No Perplexity key configured. The app will use mock data for extraction and chat features.</span>
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Settings saved. New keys are active immediately.
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" disabled={saving || (!perplexityKey.trim() && !openaiKey.trim())}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving…' : 'Save keys'}
        </Button>
      </form>
    </div>
  )
}
