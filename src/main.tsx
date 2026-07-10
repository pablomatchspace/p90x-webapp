import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { attachSync } from '@/state/sync'
import { attachPersistence } from '@/state/store'

attachPersistence()
// No-op — and no network call — unless the user has opted into cloud sync (E10).
attachSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
