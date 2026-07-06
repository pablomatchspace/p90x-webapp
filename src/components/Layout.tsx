import { CalendarCheck2, CalendarDays, Dumbbell, LayoutDashboard, Menu, Scale } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { SystemBanners } from '@/components/SystemBanners'
import { UpdateToast } from '@/components/UpdateToast'

const tabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/today', label: 'Today', icon: CalendarCheck2, end: false },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, end: false },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell, end: false },
  { to: '/body', label: 'Body', icon: Scale, end: false },
  { to: '/more', label: 'More', icon: Menu, end: false },
]

function navClasses(isActive: boolean) {
  return [
    'flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium',
    'md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2 md:text-sm',
    isActive
      ? 'text-red-600 dark:text-red-500 md:bg-red-50 md:dark:bg-red-950/40'
      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
  ].join(' ')
}

export function Layout() {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-6 border-r border-zinc-200 bg-white p-4 md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white">
            90X
          </span>
          <span className="text-lg font-bold tracking-tight">P90X Tracker</span>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Primary">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => navClasses(isActive)}>
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pb-24 md:pb-10 md:pl-56">
        <div className="mx-auto w-full max-w-5xl px-4 pt-4 md:px-8 md:pt-8">
          <SystemBanners />
          <Outlet />
        </div>
        <UpdateToast />
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 gap-1 border-t border-zinc-200 bg-white/95 px-2 pt-1 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.375rem)' }}
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => navClasses(isActive)}>
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
