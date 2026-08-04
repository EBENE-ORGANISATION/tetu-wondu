import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Accueil from '@/pages/Accueil'
import Recherche from '@/pages/Recherche'
import FicheOffre from '@/pages/FicheOffre'
import FicheCreateur from '@/pages/FicheCreateur'
import Introuvable from '@/pages/Introuvable'

/**
 * Le back-office est chargé à la demande, pas au démarrage.
 *
 * Sans cela, chaque visiteur téléchargerait les formulaires de saisie, la
 * compression d'images et le tableau de bord — une dizaine de kilo-octets pour
 * des écrans qu'il ne verra jamais, sur une connexion 3G qu'il paie.
 *
 * Vous, administrateur, attendrez une fraction de seconde de plus à l'ouverture
 * de /admin. C'est le bon côté du compromis : vous êtes une personne, les
 * visiteurs sont censés être des milliers.
 */
const Tableau = lazy(() => import('@/pages/admin/Tableau'))
const Createurs = lazy(() => import('@/pages/admin/Createurs'))
const FormulaireCreateur = lazy(() => import('@/pages/admin/FormulaireCreateur'))
const Offres = lazy(() => import('@/pages/admin/Offres'))
const FormulaireOffre = lazy(() => import('@/pages/admin/FormulaireOffre'))
const Administrateurs = lazy(() => import('@/pages/admin/Administrateurs'))
const RouteProtegee = lazy(() =>
  import('@/components/RouteProtegee').then((m) => ({ default: m.RouteProtegee })),
)

/**
 * Les chemins /offre/:slug et /createur/:slug sont figés : ils seront repris
 * tels quels par les Pages Functions Cloudflare qui fabriquent les aperçus
 * WhatsApp. Les changer casserait tous les liens déjà collés dans des groupes.
 */
export default function App() {
  return (
    <>
      <RemonterEnHaut />
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/recherche" element={<Recherche />} />
        <Route path="/offre/:slug" element={<FicheOffre />} />
        <Route path="/createur/:slug" element={<FicheCreateur />} />

        <Route path="/admin" element={<Admin element={<Tableau />} />} />
        <Route path="/admin/createurs" element={<Admin element={<Createurs />} />} />
        <Route path="/admin/createurs/:id" element={<Admin element={<FormulaireCreateur />} />} />
        <Route path="/admin/offres" element={<Admin element={<Offres />} />} />
        <Route path="/admin/offres/:id" element={<Admin element={<FormulaireOffre />} />} />
        <Route path="/admin/administrateurs" element={<Admin element={<Administrateurs />} />} />

        {/* Sans cette route, une adresse inconnue afficherait une page blanche. */}
        <Route path="*" element={<Introuvable />} />
      </Routes>
    </>
  )
}

/** Vérification des droits + chargement différé, en un seul endroit. */
function Admin({ element }: { element: React.ReactNode }) {
  return (
    <Suspense fallback={<AttenteAdmin />}>
      <RouteProtegee>{element}</RouteProtegee>
    </Suspense>
  )
}

function AttenteAdmin() {
  return (
    <main aria-hidden="true" className="mx-auto max-w-2xl space-y-3 px-5 pt-8">
      <div className="shimmer h-6 w-1/3 rounded" />
      <div className="shimmer h-32 rounded-2xl" />
    </main>
  )
}

/**
 * Sans cela, on ouvre une fiche depuis le milieu de l'accueil et on arrive au
 * milieu de la fiche. Déroutant partout, et pire sur un petit écran où l'on ne
 * voit pas qu'on a changé de page.
 */
function RemonterEnHaut() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
