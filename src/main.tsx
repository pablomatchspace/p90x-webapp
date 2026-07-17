import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { syncPort } from '@/state/sync'
import { persistencePort } from '@/state/store'

persistencePort.attach()
// No-op — and no network call — unless the user has opted into cloud sync (E10).
syncPort.attach()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
