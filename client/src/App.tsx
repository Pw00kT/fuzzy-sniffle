import { useEffect, useState } from 'react'
import { Route, Switch } from 'wouter'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import RecordMeeting from './pages/RecordMeeting'
import UploadAudio from './pages/UploadAudio'
import MeetingDetail from './pages/MeetingDetail'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { api } from './lib/api'

const TOKEN_KEY = 'idot_auth_token'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    api.health().then((h) => {
      if (!h.authRequired) {
        setAuthState('authenticated')
        return
      }
      const stored = getStoredToken()
      if (!stored) { setAuthState('unauthenticated'); return }
      // Verify stored token is still valid
      api.auth.verify(stored).then((r) => {
        setAuthState(r.ok ? 'authenticated' : 'unauthenticated')
      }).catch(() => setAuthState('unauthenticated'))
    }).catch(() => {
      // Server unreachable — allow app to load, individual calls will fail gracefully
      setAuthState('authenticated')
    })
  }, [])

  const handleLogin = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    setAuthState('authenticated')
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setAuthState('unauthenticated')
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <Login onSuccess={handleLogin} />
  }

  return (
    <Layout onLogout={handleLogout}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/record" component={RecordMeeting} />
        <Route path="/upload" component={UploadAudio} />
        <Route path="/meeting/:id" component={MeetingDetail} />
        <Route path="/settings" component={Settings} />
        <Route>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Page not found
          </div>
        </Route>
      </Switch>
    </Layout>
  )
}
