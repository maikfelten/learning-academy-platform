import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { brandingLaden } from './lib/branding.js'

// Fetch the platform name before the first render so the login screen and the
// page title are correct straight away. On failure the defaults apply.
brandingLaden().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
