import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { compresser } from '@/lib/compression'

export interface ResultatEnvoi {
  envoyees: number
  poidsAvant: number
  poidsApres: number
  echecs: string[]
}

/**
 * Envoi des photos d'une offre.
 *
 * Chaque photo est compressée dans le navigateur avant de partir : une photo
 * de 4 Mo devient environ 150 Ko. Sur la 3G du terrain, c'est la différence
 * entre un envoi qui aboutit et un envoi qui expire.
 *
 * Les photos partent une par une, pas toutes ensemble : sur une connexion
 * fragile, quatre envois simultanés se gênent et échouent tous. Une par une,
 * si la troisième échoue, les deux premières sont déjà enregistrées.
 */
export function useUploadImages() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({
      offerId,
      fichiers,
      departSortOrder = 0,
      onProgres,
    }: {
      offerId: string
      fichiers: File[]
      departSortOrder?: number
      onProgres?: (fait: number, total: number) => void
    }): Promise<ResultatEnvoi> => {
      const resultat: ResultatEnvoi = { envoyees: 0, poidsAvant: 0, poidsApres: 0, echecs: [] }

      for (const [index, fichier] of fichiers.entries()) {
        try {
          const photo = await compresser(fichier)
          const chemin = `${offerId}/${crypto.randomUUID()}.${photo.extension}`

          const { error: erreurEnvoi } = await supabase.storage
            .from('offer-images')
            .upload(chemin, photo.blob, {
              contentType: photo.blob.type,
              cacheControl: '31536000', // un an : le nom du fichier est unique
            })
          if (erreurEnvoi) throw erreurEnvoi

          const { error: erreurLigne } = await supabase.from('offer_images').insert({
            offer_id: offerId,
            storage_path: chemin,
            sort_order: departSortOrder + index,
          })
          if (erreurLigne) {
            // La ligne n'a pas pu être créée : on retire le fichier orphelin
            // plutôt que de laisser grossir le bucket pour rien.
            await supabase.storage.from('offer-images').remove([chemin])
            throw erreurLigne
          }

          resultat.envoyees++
          resultat.poidsAvant += photo.poidsAvant
          resultat.poidsApres += photo.poidsApres
        } catch (e) {
          resultat.echecs.push(`${fichier.name} : ${(e as Error).message}`)
        }

        onProgres?.(index + 1, fichiers.length)
      }

      return resultat
    },
    onSuccess: () => void client.invalidateQueries(),
  })
}
