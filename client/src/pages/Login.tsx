import { useState, FormEvent } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

interface Props {
  onSuccess: (token: string) => void
}

export default function Login({ onSuccess }: Props) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.auth.verify(token.trim())
      if (res.ok) {
        onSuccess(token.trim())
      } else {
        setError('Invalid access token. Please try again.')
      }
    } catch {
      setError('Could not reach the server. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="text-white">
            <p className="font-bold leading-tight">IDOT Sidecar</p>
            <p className="text-sm text-slate-400 leading-tight">Utility Coordination AI</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-2xl p-8 space-y-5"
        >
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your access token to continue</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="token" className="text-sm font-medium text-gray-700">
              Access token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={!token.trim() || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sign in
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Token is set via the <code className="bg-gray-100 px-1 rounded">AUTH_TOKEN</code> environment variable.
          </p>
        </form>
      </div>
    </div>
  )
}
