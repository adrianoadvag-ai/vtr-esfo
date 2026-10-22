import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import './styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Quando uma versão nova do app é publicada, recarrega uma vez para usá-la
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let recarregou = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregou) return
    recarregou = true
    window.location.reload()
  })
}
