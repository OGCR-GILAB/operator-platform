import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@majistudio/ogcr-design-system/styles.css'
import './index.css'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { ToastProvider } from './components/providers/ToastProvider'
import { GlobalProvider } from './components/providers/GlobalProvider'
import { TooltipProvider } from '@majistudio/ogcr-design-system'
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <GlobalProvider>
          <TooltipProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </TooltipProvider>
        </GlobalProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
