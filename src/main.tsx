import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

/**
 * Les polices de la maquette, servies depuis notre propre site.
 *
 * Jamais depuis Google Fonts : cela ferait deux connexions vers un domaine
 * tiers avant le premier texte, ce qui se paie cher en 3G — et cela enverrait
 * l'adresse IP de chaque visiteur à Google sans raison.
 *
 * Ces fichiers découpent l'alphabet en tranches (latin, latin étendu,
 * vietnamien). Le navigateur ne télécharge que celle dont il a besoin : pour
 * du français, la tranche latine seule, et rien d'autre.
 */
import '@fontsource-variable/space-grotesk/wght.css'
import '@fontsource-variable/archivo/wght.css'

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
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

/**
 * Le catalogue est conservé sur le téléphone, pas seulement en mémoire.
 *
 * Sans cela, « hors ligne » ne voudrait pas dire grand-chose : il suffirait de
 * fermer l'onglet pour tout perdre, et le visiteur retrouverait une page vide
 * au prochain lancement. Là, il retrouve ce qu'il avait déjà vu — avec un
 * bandeau qui le prévient que ce n'est peut-être plus à jour.
 *
 * Durée de vie : 24 heures. Au-delà, un catalogue périmé vaut moins qu'une
 * page vide — on ne veut pas qu'un client contacte un créateur pour un objet
 * retiré depuis une semaine.
 */
const stockage = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'tw-cache',
  // Écrire à chaque frappe de recherche userait le stockage sur un téléphone
  // d'entrée de gamme. Une seconde de répit suffit.
  throttleTime: 1000,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: stockage,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          // On n'enregistre que ce qui a réussi. Conserver une erreur réseau
          // la ferait réapparaître au prochain lancement, alors que le réseau
          // est peut-être revenu entre-temps.
          shouldDehydrateQuery: (q) => q.state.status === 'success',
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
