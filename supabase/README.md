# Base de données — mode d'emploi

Le SQL du projet vit ici, et nulle part ailleurs. Si le projet Supabase est
perdu, mal configuré, ou si vous voulez une base de test séparée, ces huit
fichiers la reconstruisent à l'identique.

## Ce que vous avez à exécuter aujourd'hui

Le fichier `0001` est **déjà exécuté** dans votre projet Supabase — ne le rejouez
pas. Restent les fichiers `0002` à `0008`.

### La voie rapide : un seul copier-coller

Ouvrez **`A-EXECUTER-EN-UNE-FOIS.sql`** (dans ce dossier), tout sélectionner,
copier, puis Supabase → **SQL Editor** → *New query* → coller → **Run**.

C'est la concaténation des sept fichiers dans le bon ordre. L'éditeur SQL de
Supabase exécute le script dans une transaction unique : soit tout passe, soit
rien ne passe. Aucun état intermédiaire bancal n'est possible, et une erreur
laisse la base exactement comme avant.

### La voie détaillée : fichier par fichier

Utile si un jour vous voulez comprendre ou isoler un problème. Pour chacun :
Supabase → **SQL Editor** → *New query* → coller le contenu → **Run**, dans
l'ordre des numéros.

Dans les deux cas, vous devez voir en bas de l'éditeur le message vert
**« Success. No rows returned »**. Si un message rouge apparaît, arrêtez-vous
là et signalez-le tel quel. Ne continuez jamais après une erreur — chaque
fichier suppose que le précédent est passé.

| Fichier | Ce qu'il fait | Ce que vous devez constater ensuite |
|---|---|---|
| `0002_corrections_bloc1.sql` | Impose un format valide au numéro WhatsApp | Rien de visible. C'est normal. |
| `0003_categories_offres_images_favoris.sql` | Crée le catalogue | Table Editor : `categories`, `offers`, `offer_images`, `favorites` apparaissent |
| `0004_automatismes.sql` | Horodatage, création de profil, recopie du nom du créateur | Rien de visible |
| `0005_evenements_et_statistiques.sql` | Le suivi d'audience | Table Editor : `events` apparaît |
| `0006_politiques_rls.sql` | Toute la sécurité | Advisors → Security : plus aucune table signalée sans RLS |
| `0007_stockage_images.sql` | Le stockage des photos | Storage : le bucket `offer-images` apparaît |
| `0008_categories_et_jeu_de_test.sql` | Catégories + données fictives | `categories` : 13 lignes — `vendors` : 8 — `offers` : 20 |

## Vérifications une fois les huit fichiers passés

- [ ] `offers` contient 20 lignes, dont 2 en `price_mode = 'quote'` avec
      `price_cfa` vide (c'est ce qui affichera « Sur devis »)
- [ ] `offers` : la colonne `vendor_display_name` est remplie toute seule
      (« Karité de Kara », « Flok 228 »…). Si elle est vide, le déclencheur du
      fichier `0004` n'est pas passé.
- [ ] Advisors → Security : aucune alerte rouge, en particulier pas de
      `security_definer_view`
- [ ] `select count(*) from public.events;` renvoie 0 — c'est attendu, le suivi
      ne se remplira qu'une fois l'application en ligne

## Vous donner le rôle administrateur

À faire **après** votre première connexion dans l'application, pas avant.
Authentication → Users → copier votre identifiant, puis :

```sql
insert into public.user_roles (user_id, role) values ('COLLEZ-VOTRE-UUID-ICI', 'admin');
```

## Deux points à savoir

**L'éditeur SQL de Supabase passe outre la sécurité.** C'est voulu : c'est ainsi
que le jeu de test peut être inséré alors que les règles RLS sont déjà actives.
Cela veut aussi dire qu'un test fait depuis l'éditeur SQL ne prouve rien sur ce
que verra un visiteur. Les vrais tests de sécurité se font depuis l'application,
déconnecté.

**Ces fichiers rejoueront à l'identique sur une base vide, dans l'ordre.** Toute
modification future du schéma doit devenir un nouveau fichier `0009_…`, jamais
une retouche d'un fichier existant. C'est ce qui garantit qu'on peut toujours
reconstruire la base.

## Les fonctions serveur (Edge Functions)

Elles vivent dans `supabase/functions/`. Ce sont de petits programmes qui
tournent sur les serveurs de Supabase, pas dans le navigateur. C'est le **seul**
endroit du projet où la clé `service_role` a le droit d'exister — et encore, la
plateforme la fournit toute seule, elle n'est écrite nulle part.

| Fonction | Rôle |
|---|---|
| `administrateurs` | Lister, inviter et révoquer les administrateurs |
| `expiration-fiches` | Dépublier les offres non confirmées depuis 60 jours |

### Déployer sans rien installer

Supabase → **Edge Functions** → *Deploy a new function* → *Via Editor*.

1. Nom exact : **`administrateurs`** — l'application l'appelle par ce nom, une
   faute de frappe la rend introuvable
2. Coller le contenu de `functions/administrateurs/index.ts`
3. *Deploy*

Aucune variable à configurer : `SUPABASE_URL`, `SUPABASE_ANON_KEY` et
`SUPABASE_SERVICE_ROLE_KEY` sont injectées automatiquement.

### Vérifier que ça marche

Ouvrez `/admin/administrateurs` dans l'application. La liste doit afficher votre
adresse. Si vous lisez « la fonction ne répond pas », c'est qu'elle n'est pas
déployée ou que son nom diffère.

### Ce que cette fonction vérifie avant d'agir

Chaque appel contrôle que le demandeur est lui-même administrateur, avec la clé
de service — donc sans faire confiance à ce que raconte le navigateur. Deux
garde-fous en plus : on ne peut pas retirer ses propres droits, ni descendre en
dessous d'un administrateur. Sans eux, on peut s'enfermer dehors et il faut
repasser par l'éditeur SQL pour rentrer.

## Planifier l'expiration hebdomadaire des fiches

Une fois `expiration-fiches` déployée de la même manière, il reste à la
déclencher toute seule chaque semaine.

### Par le tableau de bord — recommandé

Supabase → **Integrations** → **Cron** → *Create job*.

| Champ | Valeur |
|---|---|
| Name | `expiration-fiches` |
| Schedule | `0 6 * * 1` — tous les lundis à 6 h |
| Type | Supabase Edge Function |
| Function | `expiration-fiches` |

Supabase se charge de l'authentification : **aucune clé à saisir nulle part**.
C'est la raison de préférer ce chemin.

### Avant de laisser tourner : regardez d'abord

Dans le back-office, section **Fraîcheur du catalogue**, le bouton
*Voir ce qui expirerait* appelle la même fonction en mode simulation. Rien
n'est modifié, mais vous voyez exactement quelles fiches disparaîtraient et
quels créateurs seraient à rappeler.

Faites-le une fois avant de programmer la tâche. Dépublier vingt fiches par
surprise se répare, mais se remarque.

### Ce que la fonction ne fait pas

Elle retire les fiches périmées. **Elle ne vous dit pas ce qui a changé.** La
vraie boucle reste manuelle : un message WhatsApp par créateur — le back-office
vous le pré-remplit, avec la question qui compte : « combien de commandes vous
sont venues de la plateforme ce mois-ci ? »

Sans cette boucle, vous saurez que le catalogue est frais, mais toujours pas
s'il fait vendre. C'est exactement la question que posera un investisseur.

## Régénérer `A-EXECUTER-EN-UNE-FOIS.sql`

C'est un fichier **généré**. Ne le modifiez jamais à la main : corrigez le
fichier numéroté concerné, puis régénérez-le.

⚠️ **Il doit être écrit en UTF-8 sans BOM.** Le BOM est un marqueur invisible de
trois octets que Windows ajoute volontiers en début de fichier. Il ne se voit
dans aucun éditeur, mais PostgreSQL le lit comme un caractère et rejette tout le
script avec `syntax error at or near "﻿"` sur la ligne 1. Le piège s'est déjà
déclenché une fois.

```powershell
$base = "C:\Users\Lenovo\Desktop\TETU WONDU\supabase"
$out  = Join-Path $base "A-EXECUTER-EN-UNE-FOIS.sql"
$files = Get-ChildItem (Join-Path $base "migrations") -Filter "*.sql" |
         Where-Object { $_.Name -match '^000[2-8]_' } | Sort-Object Name
$txt = ($files | ForEach-Object {
  "`r`n`r`n-- >>>>>  $($_.Name)  <<<<<`r`n`r`n" +
  [System.IO.File]::ReadAllText($_.FullName).TrimStart([char]0xFEFF)
}) -join ""
[System.IO.File]::WriteAllText($out, $txt, (New-Object System.Text.UTF8Encoding($false)))
```

Le `$false` à la dernière ligne est ce qui évite le BOM. Vérification : le
fichier doit commencer par les octets `2D 2D 20`, c'est-à-dire `--`.
