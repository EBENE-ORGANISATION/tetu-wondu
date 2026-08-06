import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { compresser } from '@/lib/compression'
import type { VendorType } from '@/types/database'

export interface Candidature {
  display_name: string
  contact_name: string | null
  whatsapp_number: string
  city: string
  neighborhood: string | null
  vendor_type: VendorType
  tagline: string | null
  description: string | null
  price_from_cfa: number | null
  catalog_url: string | null
  instagram: string | null
  consentement: boolean
}

/**
 * Le dépôt d'une candidature par un créateur, sans compte.
 *
 * Les photos partent d'abord, une par une : sur une 3G qui coupe, quatre envois
 * simultanés se gênent et échouent ensemble. Si tout aboutit, la candidature
 * est enregistrée avec les chemins des photos. Si l'enregistrement échoue, les
 * fichiers déjà déposés sont retirés — inutile de laisser grossir le stockage
 * avec des photos que personne ne verra jamais.
 */
export function useDeposerCandidature() {
  return useMutation({
    mutationFn: async ({
      candidature,
      photos,
      onProgres,
    }: {
      candidature: Candidature
      photos: File[]
      onProgres?: (etape: string) => void
    }) => {
      const dossier = `candidatures/${crypto.randomUUID()}`
      const chemins: string[] = []

      try {
        for (const [i, fichier] of photos.entries()) {
          onProgres?.(`Envoi de la photo ${i + 1} sur ${photos.length}…`)
          const compressee = await compresser(fichier)
          const chemin = `${dossier}/${crypto.randomUUID()}.${compressee.extension}`

          const { error } = await supabase.storage
            .from('atelier-images')
            .upload(chemin, compressee.blob, {
              contentType: compressee.blob.type,
              cacheControl: '31536000',
            })
          if (error) throw error
          chemins.push(chemin)
        }

        onProgres?.('Enregistrement…')
        const { error } = await supabase
          .from('candidatures')
          .insert({ ...candidature, photos: chemins })
        if (error) throw error

        return { photos: chemins.length }
      } catch (e) {
        // Ménage : on ne laisse pas derrière soi des photos sans candidature.
        if (chemins.length > 0) {
          await supabase.storage.from('atelier-images').remove(chemins)
        }
        throw e
      }
    },
  })
}
