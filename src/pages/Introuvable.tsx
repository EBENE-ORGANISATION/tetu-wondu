import { Link } from 'react-router-dom'

/**
 * Aucune adresse ne doit mener à une page blanche.
 *
 * Le cas est banal ici : les liens partagés dans WhatsApp survivent des mois,
 * et une offre finit par être archivée ou retirée. Le visiteur qui arrive
 * dessus doit comprendre ce qui s'est passé et repartir vers le catalogue,
 * pas rester devant du vide.
 */
export default function Introuvable({ quoi = 'page' }: { quoi?: 'page' | 'offre' | 'atelier' }) {
  const messages = {
    page: {
      titre: 'Page introuvable',
      texte: "Cette adresse ne correspond à rien. Elle a peut-être été mal recopiée.",
    },
    offre: {
      titre: 'Cet objet n’est plus en ligne',
      texte:
        "Le créateur l’a retiré, ou la fiche a été archivée. Son atelier propose peut-être autre chose.",
    },
    atelier: {
      titre: 'Cet atelier n’est plus en ligne',
      texte: 'La fiche a été retirée ou mise en pause par son créateur.',
    },
  }[quoi]

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-8 text-center">
      <p className="font-action text-5xl font-bold text-ligne">404</p>
      <h1 className="mt-4 text-xl font-bold text-encre">{messages.titre}</h1>
      <p className="mt-2 text-second">{messages.texte}</p>
      <Link
        to="/"
        className="mt-6 flex items-center rounded-full bg-encre px-6 font-action font-semibold text-blanc"
      >
        Voir tous les ateliers
      </Link>
    </main>
  )
}
