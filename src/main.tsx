import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyDocumentTitle } from './services/appTitle'
import { preloadRecentBlogsForLocation } from './services/homeBlogsPreload'
import { activateGoogleFonts } from './services/googleFonts'

activateGoogleFonts()
applyDocumentTitle()
// Kick off the start page's blog query before React mounts, so it runs in
// parallel with the app-settings read the route guard waits for.
preloadRecentBlogsForLocation(window.location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
