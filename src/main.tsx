import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

/**
 * Réglages pensés pour une 3G instable :
 * - on garde les données 5 minutes avant de les considérer périmées, pour ne
 *   pas relancer une requête à chaque retour en arrière ;
 * - on ne recharge pas au simple retour sur l'onglet ;
 * - on réessaie une seule fois : sur un réseau coupé, insister ne sert à rien
 *   et retarde l'affichage du message « pas de connexion ».
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
