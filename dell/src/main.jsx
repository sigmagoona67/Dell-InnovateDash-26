import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import './index.css'
import App from './App.jsx'
import { restoreAuthFromPersistence } from './lib/authPersistence.js'
import { insforge } from './lib/insforgeClient.js'

if (insforge) {
  restoreAuthFromPersistence(insforge)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)
