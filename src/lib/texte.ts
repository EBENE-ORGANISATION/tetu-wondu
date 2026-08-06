/**
 * Retire les accents d'un texte : « Kpalimé » devient « Kpalime ».
 *
 * Écrit une seule fois et importé partout : ce motif vivait en trois
 * exemplaires — recherche, identifiants d'adresse, filtrage de l'accueil — et
 * trois copies d'une même règle finissent toujours par diverger.
 *
 * Comment ça marche : `normalize('NFD')` sépare chaque lettre accentuée en
 * deux caractères — la lettre nue, puis l'accent. La plage U+0300 à U+036F
 * couvre ces accents isolés, qu'on supprime.
 *
 * Les codes sont écrits en séquences d'échappement, jamais en caractères
 * littéraux : des signes invisibles dans un fichier source finissent par être
 * mangés par un éditeur, un copier-coller ou un outil de conversion — et le
 * jour où ça arrive, la recherche cesse de fonctionner sans que rien ne plante.
 */
const ACCENTS = /[\u0300-\u036f]/g

export function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(ACCENTS, '')
}

/** Version pour comparer : sans accents et en minuscules. */
export function normaliser(texte: string): string {
  return sansAccents(texte).toLowerCase()
}
