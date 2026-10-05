import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './index.css'
import './App.css'
import { TryReader } from './TryReader'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TryReader />
  </StrictMode>,
)
