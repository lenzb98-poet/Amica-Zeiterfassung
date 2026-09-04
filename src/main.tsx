import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Fehleranzeige from './components/Fehleranzeige'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fehleranzeige>
      <App />
    </Fehleranzeige>
  </StrictMode>,
)
