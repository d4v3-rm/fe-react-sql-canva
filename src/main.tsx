import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'

import App from '@/app/App'
import { DialogProvider } from '@/components/ui/dialog/DialogProvider'
import '@/styles/main.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>,
)
