import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/cormorant-sc/500.css'
import '@fontsource/cormorant-sc/700.css'
import '@fontsource-variable/roboto-condensed/wght.css'
import './index.css'
import App from './app/App.tsx'
import { AppProviders } from './app/providers/AppProviders.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
