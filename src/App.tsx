import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { BodyPage } from '@/features/body/BodyPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DataPage } from '@/features/more/DataPage'
import { MorePage } from '@/features/more/MorePage'
import { SchedulePage } from '@/features/schedule/SchedulePage'
import { TodayPage } from '@/features/today/TodayPage'
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
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="body" element={<BodyPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="more/data" element={<DataPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
