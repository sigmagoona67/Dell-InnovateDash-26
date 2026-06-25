import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, UserCircle, LogOut } from 'lucide-react'
import { requireInsforge } from '../../lib/insforgeClient'

const LINKS = [
  { to: '/staff-dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/staff-dashboard/team', label: 'Care Team', icon: Users, end: false },
  { to: '/staff-dashboard/profile-quiz', label: 'My Profile', icon: UserCircle, end: false },
]

/**
 * Persistent staff global nav. One source of truth for cross-surface
 * navigation with an active state; inline page links are demoted.
 */
export default function StaffNav() {
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await requireInsforge().auth.signOut()
    } catch (error) {
      if (import.meta.env.DEV) console.debug('[staff] sign out', error?.message)
    } finally {
      navigate('/staff-auth', { replace: true })
    }
  }

  return (
    <nav
      aria-label="Staff"
      className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-500" />
          <span className="font-display text-[15px] font-semibold text-ink-800">CareBridge AI</span>
          <span className="hidden text-[13px] font-medium text-slate-500 sm:inline">· Staff</span>
        </div>

        <div className="flex items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${
                  isActive
                    ? 'bg-sky-50 text-sky-600'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-sky-600'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="ml-1 inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
