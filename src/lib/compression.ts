/**
 * Compression des photos AVANT envoi.
 *
 * Une photo de téléphone Android pèse couramment 3 à 5 Mo. Envoyer ça depuis
 * une 3G instable prend plusieurs minutes et échoue souvent en route. Réduite
 * à 1600 px de large en WebP, la même photo tombe autour de 150 Ko — et reste
 * plus nette que nécessaire pour un écran de 5 pouces.
 *
 * Le travail se fait dans le navigateur : rien ne part tant que ce n'est pas
 * allégé.
 */

const LARGEUR_MAX = 1600
const QUALITE = 0.8

/** Le navigateur sait-il fabriquer du WebP ? Testé une fois, pas à chaque photo. */
let supporteWebp: boolean | null = null

function testerWebp(): boolean {
  if (supporteWebp !== null) return supporteWebp
  const toile = document.createElement('canvas')
  toile.width = 1
  toile.height = 1
  supporteWebp = toile.toDataURL('image/webp').startsWith('data:image/webp')
  return supporteWebp
}

export interface PhotoCompressee {
  blob: Blob
  extension: 'webp' | 'jpg'
  largeur: number
  hauteur: number
  poidsAvant: number
  poidsApres: number
}

export async function compresser(fichier: File): Promise<PhotoCompressee> {
  const image = await chargerImage(fichier)

  // On ne redimensionne que vers le bas : agrandir une petite photo la rend
  // floue sans rien apporter.
  const ratio = Math.min(1, LARGEUR_MAX / image.width)
  const largeur = Math.round(image.width * ratio)
  const hauteur = Math.round(image.height * ratio)

  const toile = document.createElement('canvas')
  toile.width = largeur
  toile.height = hauteur

  const contexte = toile.getContext('2d')
  if (!contexte) throw new Error("Le navigateur n'a pas pu préparer l'image.")

  contexte.imageSmoothingQuality = 'high'
  contexte.drawImage(image, 0, 0, largeur, hauteur)

  if ('close' in image) image.close()

  const webp = testerWebp()
  const type = webp ? 'image/webp' : 'image/jpeg'

  const blob = await new Promise<Blob | null>((resoudre) =>
    toile.toBlob(resoudre, type, QUALITE),
  )
  if (!blob) throw new Error("La compression de l'image a échoué.")

  return {
    blob,
    extension: webp ? 'webp' : 'jpg',
    largeur,
    hauteur,
    poidsAvant: fichier.size,
    poidsApres: blob.size,
  }
}

async function chargerImage(fichier: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap gère l'orientation EXIF : sans cela, les photos prises
  // en tenant le téléphone de travers arrivent couchées.
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(fichier, { imageOrientation: 'from-image' })
    } catch {
      // Certains vieux Android échouent ici : on retombe sur la méthode
      // classique plutôt que de refuser la photo.
    }
  }

  return new Promise((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resoudre(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      rejeter(new Error("Ce fichier n'est pas une image lisible."))
    }
    img.src = url
  })
}

/** « 2,4 Mo », « 148 Ko » — pour montrer le gain à l'écran. */
export function poidsLisible(octets: number): string {
  if (octets >= 1024 * 1024) return `${(octets / (1024 * 1024)).toFixed(1)} Mo`.replace('.', ',')
  return `${Math.round(octets / 1024)} Ko`
}
