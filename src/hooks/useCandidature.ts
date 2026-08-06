import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { compresser } from '@/lib/compression'
import type { PriceMode, VendorType } from '@/types/database'

/**
 * Une pièce telle que le créateur la décrit, avant qu'elle ne devienne une
 * offre. Les photos sont ici des chemins déjà déposés dans le stockage.
 */
export interface PieceCandidate {
  titre: string
  description: string | null
  price_mode: PriceMode
  price_cfa: number | null
  unit: string | null
  sur_commande: boolean
  delai_jours: number | null
  personnalisable: boolean
  categorie_slug: string | null
  photos: string[]
}

/** La même pièce côté formulaire : les photos ne sont pas encore envoyées. */
export interface PieceSaisie extends Omit<PieceCandidate, 'photos'> {
  fichiers: File[]
}

export interface Candidature {
  display_name: string
  contact_name: string | null
  whatsapp_number: string
  phone: string | null
  city: string
  neighborhood: string | null
  vendor_type: VendorType
  tagline: string | null
  description: string | null
  price_from_cfa: number | null
  catalog_url: string | null
  instagram: string | null
  accepts_custom: boolean
  consentement: boolean
}

/**
 * Le dépôt d'une candidature par un créateur, sans compte.
 *
 * Les photos partent une par une : sur une 3G qui coupe, plusieurs envois
 * simultanés se gênent et échouent ensemble. Si l'enregistrement final échoue,
 * tous les fichiers déjà déposés sont retirés — inutile de laisser grossir le
 * stockage avec des photos que personne ne verra jamais.
 *
 * Les photos d'atelier et les photos de pièces ne vont pas au même endroit :
 * chacune dans le bucket où elle finira, pour n'avoir aucun fichier à déplacer
 * le jour de l'acceptation.
 */
export function useDeposerCandidature() {
  return useMutation({
    mutationFn: async ({
      candidature,
      photos,
      pieces,
      onProgres,
    }: {
      candidature: Candidature
      photos: File[]
      pieces: PieceSaisie[]
      onProgres?: (etape: string) => void
    }) => {
      const dossier = `candidatures/${crypto.randomUUID()}`
      const deposes: { bucket: string; chemin: string }[] = []

      const envoyer = async (bucket: string, fichier: File, sousDossier: string) => {
        const compressee = await compresser(fichier)
        const chemin = `${dossier}/${sousDossier}/${crypto.randomUUID()}.${compressee.extension}`
        const { error } = await supabase.storage.from(bucket).upload(chemin, compressee.blob, {
          contentType: compressee.blob.type,
          cacheControl: '31536000',
        })
        if (error) throw error
        deposes.push({ bucket, chemin })
        return chemin
      }

      try {
        const total = photos.length + pieces.reduce((s, p) => s + p.fichiers.length, 0)
        let fait = 0
        const avancer = () => onProgres?.(`Envoi de la photo ${++fait} sur ${total}…`)

        const cheminsAtelier: string[] = []
        for (const f of photos) {
          avancer()
          cheminsAtelier.push(await envoyer('atelier-images', f, 'atelier'))
        }

        const piecesCompletes: PieceCandidate[] = []
        for (const [i, piece] of pieces.entries()) {
          const cheminsPiece: string[] = []
          for (const f of piece.fichiers) {
            avancer()
            cheminsPiece.push(await envoyer('offer-images', f, `piece-${i + 1}`))
          }
          const { fichiers: _fichiers, ...reste } = piece
          piecesCompletes.push({ ...reste, photos: cheminsPiece })
        }

        onProgres?.('Enregistrement…')
        const { error } = await supabase.from('candidatures').insert({
          ...candidature,
          photos: cheminsAtelier,
          pieces: piecesCompletes,
        })
        if (error) throw error

        return { photos: cheminsAtelier.length, pieces: piecesCompletes.length }
      } catch (e) {
        // Ménage : on ne laisse pas derrière soi des photos sans candidature.
        for (const bucket of new Set(deposes.map((d) => d.bucket))) {
          const chemins = deposes.filter((d) => d.bucket === bucket).map((d) => d.chemin)
          if (chemins.length) await supabase.storage.from(bucket).remove(chemins)
        }
        throw e
      }
    },
  })
}
