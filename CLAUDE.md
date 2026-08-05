# Contexte du projet

## Le projet

Annuaire web des créateurs et fabricants togolais. Le visiteur découvre un objet,
puis contacte son créateur sur WhatsApp. **Aucun paiement, aucun panier, aucune
livraison** dans cette version.

**Le nom retenu est TETU WONDU** (décision du 3 août 2026). L'identité visuelle
n'est en revanche pas arrêtée. Et malgré la décision, le nom ne doit **jamais**
être écrit en dur dans le code : il passe par `VITE_APP_NAME`, au même titre que
la palette qui passe par des variables CSS. Un changement de nom doit rester une
modification de configuration, pas une recherche-remplacement dans 40 fichiers.

Périmètre : tous les créateurs et fabricants, pas seulement l'agroalimentaire.
Alimentation artisanale, cosmétique, mode et pagne, bijoux, personnalisation et
impression, décoration, art, enfants. Les prestations de services sont prévues
dans le schéma mais **ne doivent pas être affichées** au lancement.

## L'interlocuteur

Aucune expérience en développement. Il faut donc :

- expliquer avant d'agir, en langage courant, sans jargon non défini ;
- dire explicitement ce qu'il doit voir à l'écran pour savoir que ça a marché ;
- signaler quand une décision est irréversible ou coûteuse à défaire ;
- **faire valider avant d'enchaîner** — mais uniquement pour les opérations
  irréversibles : exécution de SQL, déploiement, suppression, publication.
  Écrire ou modifier des fichiers locaux ne demande pas de validation
  intermédiaire : c'est réversible, et découper à l'excès lui fait perdre du
  temps sans rien lui apprendre.

Il travaille sur ordinateur et sur téléphone. Il a déjà livré deux projets sur
Supabase, distribués en PWA et en APK — donc l'emballage final en APK lui est
familier, il n'y a pas besoin de le lui expliquer.

## Les trois décisions structurantes

**1. Le créateur est l'entité centrale, pas le produit.** Ce qui relie une
savonnière de Kara, un imprimeur de mugs à Lomé et une bijoutière, c'est la
personne. Un client qui a aimé un objet revient vers son auteur. La fiche
créateur est donc aussi importante que la fiche offre.

**2. Une seule table `offers` pour les produits et les services.** Une colonne
`offer_type` distingue les deux. Le lancement se fait avec `product` uniquement ;
aucune migration ne sera nécessaire pour ouvrir les services.

**3. Stock ou sur commande.** Un pot de miel existe déjà. Un t-shirt personnalisé
n'existe pas encore. D'où `is_made_to_order` et `lead_time_days`. Et trois modes
de prix : `fixed`, `from`, `quote`.

## La table `events` est l'actif central du projet

Le suivi des clics WhatsApp est **la seule donnée de valeur** au bout d'un mois :
c'est la preuve chiffrée que la plateforme apporte des clients, donc l'argument
pour recruter des créateurs, négocier une commission plus tard, ou lever des
fonds. Si le suivi ne fonctionne pas, rien d'autre n'a de valeur.

Règle absolue : un échec de suivi ne doit **jamais** casser l'interface.
try/catch silencieux, appel non bloquant.

## Sécurité — non négociable

- Les rôles vivent dans `user_roles`, **jamais** dans une colonne de `profiles`
  modifiable par son propriétaire. Sinon un utilisateur peut se promouvoir admin.
- `has_role()` est en `SECURITY DEFINER` pour éviter la récursion RLS.
- Aucune écriture sur `user_roles` depuis le client. Admins uniquement.
- La clé `service_role` ne doit jamais apparaître dans le code ni dans Git.
- `events` : écriture ouverte à tous (y compris anonymes), lecture admins seuls.

## Contexte d'usage — contrainte de conception permanente

Téléphone Android d'entrée de gamme, écran de 5 à 6 pouces, connexion 3G
instable, consultation fréquente en plein soleil. **Lisible et léger avant d'être
élégant.**

Objectifs mesurables : moins de **200 Ko de JavaScript initial compressé
(gzip)**, premier affichage sous 3 secondes en 3G bridée. Compression des images
côté client avant envoi (1600 px de large maximum, qualité 0.8, WebP si
supporté).

L'unité compte : React + Router + TanStack Query + `@supabase/supabase-js`
pèsent déjà ~120 Ko gzip avant la première ligne de code applicatif. En taille
non compressée l'objectif serait inatteignable dès le premier jour. La marge
réelle est donc d'environ 80 Ko — il faut la défendre, pas la dépenser en
bibliothèques de confort.

## Règles d'affichage

Prix, selon `price_mode` :

| mode | affichage |
|---|---|
| `fixed` | `3 000 FCFA` |
| `from` | `À partir de 25 000 FCFA` |
| `quote` | `Sur devis` — `price_cfa` est NULL, ne jamais afficher 0 |

Séparateur de milliers : espace, jamais de virgule.

Disponibilité :

- `is_made_to_order = false` → badge « Disponible »
- `is_made_to_order = true` → badge « Sur commande · {lead_time_days} jours »
- `is_available = false` → badge « Momentanément indisponible », carte grisée
- `is_customizable = true` → badge « Personnalisable » en complément

Lien WhatsApp : `https://wa.me/{whatsapp_number}?text={message encodé}`
Message adapté au mode de prix — demande de devis si `quote`, sinon mention du
prix. Toujours inclure l'URL de la fiche.

## Où vit le SQL

Dans `supabase/migrations/`, et nulle part ailleurs. Huit fichiers numérotés,
rejouables dans l'ordre sur une base vide. `supabase/README.md` explique la
marche à suivre et les vérifications.

**Toute modification future du schéma est un nouveau fichier `0009_…`**, jamais
une retouche d'un fichier existant. C'est ce qui garantit qu'on peut toujours
reconstruire la base.

`supabase/A-EXECUTER-EN-UNE-FOIS.sql` est la concaténation automatique des
fichiers 0002 à 0008, pour un copier-coller unique dans l'éditeur SQL. Fichier
généré : ne jamais l'éditer à la main, le régénérer.

## État d'avancement

- [x] Projet Supabase créé (organisation gratuite séparée, région West EU)
- [x] Bloc 1 exécuté : types, `profiles`, `user_roles`, `has_role()`, `vendors`
- [x] SQL versionné dans `supabase/migrations/`, corrections de la revue incluses
- [x] Nom retenu : TETU WONDU
- [x] Base exécutée et vérifiée le 3 août 2026 — 12 contrôles au vert
      (`supabase/VERIFICATION.sql`, rejouable à tout moment)
- [x] **Lovable abandonné** : Lovable Cloud s'activait tout seul, et le schéma
      étant déjà figé, le scaffold direct est revenu moins cher. Le projet est
      construit en Claude Code, à la racine du dossier.
- [x] Maquette de référence validée (`maquette.html`), jetons de design posés
- [x] Écrans livrés : accueil « Ateliers », fiche offre, fiche créateur,
      recherche + filtres, page introuvable
- [x] Suivi d'audience branché et vérifié en conditions réelles
- [x] Authentification par lien magique, rôle lu dans `user_roles`
- [x] Back-office : tableau de bord, créateurs, offres, photos compressées
- [x] Back-office chargé à la demande — les visiteurs ne le téléchargent pas
- [x] Recherche insensible aux accents — migration `0009` exécutée le 4 août 2026
- [x] Écran « Administrateurs » codé (Edge Function à déployer par l'admin)
- [x] Dépôt public : `EBENE-ORGANISATION/tetu-wondu`, branche `main`
- [x] **En ligne : https://tetu-wondu.pages.dev** (Cloudflare Pages, déploiement
      automatique à chaque `git push`, environ une minute)
- [x] Aperçus WhatsApp vérifiés en production — titre, prix et description
      réécrits par les fonctions Cloudflare
- [ ] **Saisir de vrais créateurs, supprimer les 8 fiches fictives** ← étape en cours
- [x] Fonction serveur `administrateurs` déployée et vérifiée — un appel avec
      la seule clé publique est refusé (`401`)
- [x] Polices Space Grotesk et Archivo servies depuis le site — tranche latine
      seule (56 Ko), `font-display: swap`, jamais depuis Google
- [x] Fichiers compilés gardés un an dans le navigateur (`public/_headers`) —
      la deuxième visite ne retélécharge ni code, ni styles, ni polices
- [ ] Feuille de confirmation avant WhatsApp, états hors ligne
- [ ] Edge Function d'expiration des fiches (60 jours)
- [ ] PWA, puis emballage APK

## Diagnostic des aperçus WhatsApp

Les fonctions posent un en-tête `x-apercu` sur chaque réponse, visible dans les
outils de développement du navigateur, onglet Réseau :

| Valeur | Signification |
|---|---|
| `b2:ok` | L'aperçu a été enrichi, tout va bien |
| `b2:variables-manquantes` | Variables absentes côté Cloudflare |
| `b2:offre-introuvable-401` | Clé Supabase refusée |
| `b2:offre-introuvable-404` | `VITE_SUPABASE_URL` fausse (souvent un `/rest/v1/` en trop) |
| `b2:offre-introuvable-406` | La fiche n'existe pas ou n'est pas publiée |

`b2` est le marqueur de version des fonctions, dans `functions/_partage.ts`.
L'incrémenter permet de vérifier qu'un déploiement est bien arrivé : sans lui,
un déploiement qui ne part pas et un correctif sans effet sont indiscernables.

**Piège vécu** : « Retry deployment » rejoue l'ancien déploiement avec ses
réglages figés. Après un changement de variable, forcer une compilation neuve
par un `git commit --allow-empty` puis `git push`.

Poids mesuré au dernier build : **151 Ko de JavaScript compressé**, dont 148 Ko
de bibliothèques. Cinq écrans ont coûté 7 Ko au total — le budget de 200 Ko
n'est pas menacé par le code applicatif.

## Les documents du projet

| Fichier | Rôle |
|---|---|
| `supabase/README.md` | Mode d'emploi de la base. Dans le dépôt. |

Quatre documents vivent **à côté du dépôt, jamais dedans** (voir `.gitignore`).
Ils sont sur le disque, au même endroit — ne pas les supprimer :

| Fichier | Rôle |
|---|---|
| `guide-miato-v2.md` | Le plan d'ensemble, phases 0 à 5. La Phase 2 (Lovable) est caduque. |
| `REVUE-2026-08-03.md` | Relecture critique. Voir son en-tête pour ce qui est traité. |
| `PROMPT-LOVABLE.md` | **Caduc.** Conservé pour mémoire de la route non prise. |
| `maquette.html` | La maquette de référence. 528 Ko de bundle compilé. |

## Écarts assumés par rapport au guide

Le guide n'a pas été réécrit sur ces points ; les fichiers SQL font foi.

- **`offers.vendor_display_name`** : recopie du nom du créateur, entretenue par
  déclencheur. Sans elle, la recherche « par créateur » est impossible —
  `search_vector` est une colonne générée, et une colonne générée ne peut pas
  lire une autre table. Ne jamais l'écrire à la main.
- **`offer_stats`** est en `security_invoker` ; la fonction
  `offer_stats_period(days)` sert le tableau de bord 7 / 30 jours.
- **Colonnes réservées à l'admin** (`is_verified`, `is_active`, `status`…) :
  protégées par déclencheur, pas par droits colonne par colonne. Les droits
  colonne par colonne auraient aussi bloqué l'admin, qui est lui aussi un
  utilisateur `authenticated`.
- **Vues dédupliquées** par `session_id` et par heure. Les clics, non.

## Stack

React + Vite + TypeScript strict + Tailwind + shadcn/ui + React Router +
TanStack Query + @supabase/supabase-js. Aucune dépendance propriétaire.

Toutes les requêtes Supabase passent par des hooks TanStack Query sous
`src/hooks/`. **Jamais** d'appel Supabase directement dans un composant.

Déploiement : Cloudflare Pages via GitHub. Puis PWA, puis emballage APK.

## Commandes

```bash
npm install          # installer les dépendances
npm run dev          # serveur local, http://localhost:5173
npm run dev:tel      # idem, mais accessible depuis le téléphone sur le même wifi
npm run build        # vérifie les types PUIS compile dans dist/
npm run preview      # servir le build pour vérifier avant déploiement
npx tsc --noEmit     # vérification des types seule, sans rien produire
```

`npm run build` échoue si un type est faux : c'est voulu, un build qui passe
est un build déployable.

Variables d'environnement, dans `.env` à la racine (jamais commité) :

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique. Publique par nature, sa présence dans le code est normale. |
| `VITE_APP_NAME` | Nom affiché de la marque — `TETU WONDU` |
| `VITE_SITE_URL` | URL publique, pour construire les liens partagés sur WhatsApp |

La clé `service_role` n'a **aucune** raison d'apparaître dans un fichier `.env`
de ce projet : elle ne sert que côté serveur, dans les Edge Functions Supabase,
où elle est fournie par la plateforme.

Convention de commit : une correction = un commit, message en français à
l'impératif (`corrige l'affichage du prix sur devis`). Branche `main` déployée
automatiquement par Cloudflare Pages à chaque `git push`.

## Partage sur WhatsApp — décision prise

Le robot de WhatsApp **n'exécute pas de JavaScript**. Sur une application Vite
classique, `react-helmet` et tous ses équivalents côté navigateur sont donc sans
effet : chaque lien partagé afficherait le même aperçu générique, sans photo ni
titre du produit. Or une grande part de la croissance viendra de liens collés
dans des groupes WhatsApp.

Solution retenue : des **Pages Functions Cloudflare** qui réécrivent le HTML au
vol, avant de le servir.

```
functions/offre/[slug].ts
functions/createur/[slug].ts
  → lire l'offre / le créateur dans Supabase
  → injecter og:title, og:description, og:image via HTMLRewriter
  → servir index.html modifié
```

Conséquence pratique : le dossier `functions/` à la racine du dépôt fait partie
du déploiement Cloudflare Pages. Ne pas le supprimer, ne pas le déplacer.

## Authentification — décision prise

Pas d'OTP par SMS au lancement : coût par message vers le Togo, friction inutile
tant que les offres sont saisies manuellement par l'administrateur.

Lancement avec lien magique par e-mail pour l'administrateur uniquement. Les
créateurs n'ont pas de compte : leur fiche existe avec `vendors.user_id` à NULL,
et sera rattachée à un compte le jour où ils réclament leur autonomie.

## Pièges connus

- Lovable a tendance à générer email/mot de passe par défaut. Lui interdire de
  toucher à l'authentification.
- Ne pas laisser Lovable créer son propre projet Supabase : le schéma existe.
  **Lovable Cloud s'active désormais tout seul** sur les nouveaux projets — il
  faut le débrancher explicitement avant le premier prompt. La déconnexion est
  irréversible et détruit la base Cloud, ce qui est sans conséquence tant que
  rien n'y a été généré. Elle ne touche pas le projet Supabase du client.
  Refuser aussi toute « synchronisation » entre les deux bases.
- Ne pas rouvrir Lovable après la reprise en main par Claude Code — deux outils
  sur le même dépôt produisent des conflits que l'interlocuteur ne saura pas
  résoudre.
- Lovable ignore volontiers les colonnes qu'il ne comprend pas. Vérifier après
  génération qu'il ne tente pas d'écrire `vendor_display_name` ni `search_vector`
  à la main : ces deux colonnes sont entretenues par la base.
- Prévoir l'expiration des fiches : Edge Function hebdomadaire qui repasse en
  `draft` toute offre dont `last_confirmed_at` dépasse 60 jours. Un catalogue
  périmé tue ce type de plateforme en trois mois. Cette fonction tourne avec la
  clé `service_role` : les déclencheurs de protection la laissent passer, c'est
  prévu.
- Le clic WhatsApp **n'est pas une vente**. `events` prouve des clics, rien de
  plus. Prévoir dès le premier mois un message WhatsApp mensuel à chaque
  créateur — « combien de commandes via la plateforme ce mois-ci ? » — consigné
  quelque part. Sans cette boucle manuelle, l'actif central est une métrique de
  vanité, et c'est exactement la question que posera un investisseur.
- `events` accepte l'écriture anonyme, par nécessité : un visiteur non connecté
  doit pouvoir être compté. La déduplication des vues absorbe les doublons
  accidentels. Les chiffres restent donc à recouper avec les créateurs avant
  d'en faire un argument commercial. Détail de l'analyse dans
  `REVUE-2026-08-03.md`, gardé hors du dépôt.
- **La recherche sans accents tient en deux moitiés solidaires.** Côté base, la
  migration `0009` (`unaccent` + `f_unaccent`) ; côté code, `sansAccents()` dans
  `src/hooks/useRecherche.ts`. Toucher à l'une sans l'autre casse la recherche
  sans que rien ne plante — le contrôle n° 8 de `VERIFICATION.sql` surveille la
  moitié « base ».
