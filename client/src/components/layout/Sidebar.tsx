import { Link, useLocation } from 'wouter'
import { LayoutDashboard, Mic, Upload, Zap, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/record', label: 'Record Meeting', icon: Mic },
  { href: '/upload', label: 'Upload Audio', icon: Upload },
]

interface Props {
  onLogout: () => void
}

export default function Sidebar({ onLogout }: Props) {
  const [location] = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">IDOT Sidecar</p>
          <p className="text-xs text-slate-400 leading-tight">Utility Coordination AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href
          return (
            <Link key={href} href={href}>
              <a
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </a>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-400">Connected to API</span>
        </div>
        <p className="text-xs text-slate-500">Powered by Claude &amp; Whisper</p>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full mt-1"
        >
          <LogOut className="w-3 h-3" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
