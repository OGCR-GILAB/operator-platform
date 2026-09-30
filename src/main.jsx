import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { ToastProvider } from './components/providers/ToastProvider'
import { GlobalProvider } from './components/providers/GlobalProvider'
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <GlobalProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </GlobalProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
