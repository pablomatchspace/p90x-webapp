import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

// The landing route (Dashboard) is imported eagerly: it is the most-visited
// page and the one the Lighthouse budget audits, so it must paint without a
// second chunk fetch. Every other page is code-split (US-081) so it stays out
// of the initial bundle; Layout wraps the outlet in Suspense to cover the load.
const TodayPage = lazy(() =>
  import('@/features/today/TodayPage').then((m) => ({ default: m.TodayPage })),
)
const SchedulePage = lazy(() =>
  import('@/features/schedule/SchedulePage').then((m) => ({ default: m.SchedulePage })),
)
const WeeklyEditorPage = lazy(() =>
  import('@/features/schedule/WeeklyEditorPage').then((m) => ({ default: m.WeeklyEditorPage })),
)
const HistoryPage = lazy(() =>
  import('@/features/schedule/HistoryPage').then((m) => ({ default: m.HistoryPage })),
)
const WorkoutsPage = lazy(() =>
  import('@/features/workouts/WorkoutsPage').then((m) => ({ default: m.WorkoutsPage })),
)
const WorkoutDetailPage = lazy(() =>
  import('@/features/workouts/WorkoutDetailPage').then((m) => ({ default: m.WorkoutDetailPage })),
)
const FocusPage = lazy(() =>
  import('@/features/workouts/FocusPage').then((m) => ({ default: m.FocusPage })),
)
const BodyPage = lazy(() =>
  import('@/features/body/BodyPage').then((m) => ({ default: m.BodyPage })),
)
const BodyTrendsPage = lazy(() =>
  import('@/features/dashboard/BodyTrendsPage').then((m) => ({ default: m.BodyTrendsPage })),
)
const StrengthProgressPage = lazy(() =>
  import('@/features/dashboard/StrengthProgressPage').then((m) => ({
    default: m.StrengthProgressPage,
  })),
)
const MorePage = lazy(() =>
  import('@/features/more/MorePage').then((m) => ({ default: m.MorePage })),
)
const DataPage = lazy(() =>
  import('@/features/more/DataPage').then((m) => ({ default: m.DataPage })),
)
const TimerPage = lazy(() =>
  import('@/features/workouts/TimerPage').then((m) => ({ default: m.TimerPage })),
)
const QuotesPage = lazy(() =>
  import('@/features/more/QuotesPage').then((m) => ({ default: m.QuotesPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/more/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const NotesPage = lazy(() =>
  import('@/features/more/NotesPage').then((m) => ({ default: m.NotesPage })),
)
const BodyFatCalculatorsPage = lazy(() =>
  import('@/features/more/BodyFatCalculatorsPage').then((m) => ({
    default: m.BodyFatCalculatorsPage,
  })),
)
const HelpPage = lazy(() =>
  import('@/features/more/HelpPage').then((m) => ({ default: m.HelpPage })),
)

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="day/:date" element={<TodayPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="schedule/weekly" element={<WeeklyEditorPage />} />
          <Route path="schedule/history" element={<HistoryPage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="workouts/:key" element={<WorkoutDetailPage />} />
          <Route path="workouts/:key/focus/:programDayId" element={<FocusPage />} />
          <Route path="body" element={<BodyPage />} />
          <Route path="trends" element={<BodyTrendsPage />} />
          <Route path="progress" element={<StrengthProgressPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="more/data" element={<DataPage />} />
          <Route path="more/timer" element={<TimerPage />} />
          <Route path="more/quotes" element={<QuotesPage />} />
          <Route path="more/settings" element={<SettingsPage />} />
          <Route path="more/notes" element={<NotesPage />} />
          <Route path="more/calculators" element={<BodyFatCalculatorsPage />} />
          <Route path="more/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
