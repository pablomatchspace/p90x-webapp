import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { BodyPage } from '@/features/body/BodyPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DataPage } from '@/features/more/DataPage'
import { MorePage } from '@/features/more/MorePage'
import { HistoryPage } from '@/features/schedule/HistoryPage'
import { SchedulePage } from '@/features/schedule/SchedulePage'
import { WeeklyEditorPage } from '@/features/schedule/WeeklyEditorPage'
import { TodayPage } from '@/features/today/TodayPage'
import { FocusPage } from '@/features/workouts/FocusPage'
import { TimerPage } from '@/features/workouts/TimerPage'
import { WorkoutDetailPage } from '@/features/workouts/WorkoutDetailPage'
import { WorkoutsPage } from '@/features/workouts/WorkoutsPage'

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
          <Route path="more" element={<MorePage />} />
          <Route path="more/data" element={<DataPage />} />
          <Route path="more/timer" element={<TimerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
