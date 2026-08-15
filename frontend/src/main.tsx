import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAppProtection } from './utils/protection'

// © 2026 HadesCore Technologies. All Rights Reserved. — APEX LMS
initAppProtection()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
