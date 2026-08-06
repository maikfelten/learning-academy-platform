import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { themeAnwenden } from './lib/theme.js'

// Theme vor dem ersten Rendern setzen, sonst blitzt kurz das falsche auf.
themeAnwenden()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
