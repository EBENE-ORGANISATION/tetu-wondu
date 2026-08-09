-- =============================================================================
-- 0017 — Corrections issues de la revue de sécurité du 6 août 2026
-- =============================================================================
--
-- Cette revue a consisté à attaquer réellement la base avec la clé publique du
-- site, pas à relire les règles. Vingt-quatre tentatives, dont vingt-et-une
-- repoussées. Ce fichier corrige les trois points restants et fait le ménage
-- des traces laissées par les tests.
-- =============================================================================


-- =============================================================================
-- 1. Fermer offer_stats_period aux anonymes
-- =============================================================================
--
--   CONSTAT : un visiteur muni de la clé publique pouvait appeler cette
--   fonction. Elle ne fuitait rien de secret — les compteurs restent à zéro
--   grâce aux règles de « events », et les titres d'offres sont publics — mais
--   elle expose la liste complète des offres, y compris leur créateur, sans
--   passer par le catalogue. Sa jumelle vendor_stats_period était déjà fermée :
--   cette incohérence n'avait pas de raison d'être.

revoke all on function public.offer_stats_period(integer) from public;
revoke all on function public.offer_stats_period(integer) from anon;
grant execute on function public.offer_stats_period(integer) to authenticated, service_role;


-- =============================================================================
-- 2. Empêcher l'inventaire du stockage
-- =============================================================================
--
--   CONSTAT, le plus sérieux de la revue : un anonyme pouvait demander la
--   LISTE des fichiers des buckets. Il découvrait ainsi le dossier
--   « candidatures », puis, de proche en proche, l'adresse des photos déposées
--   par des créateurs dont vous n'aviez pas encore vu la candidature — et même
--   de ceux que vous auriez refusés.
--
--   Ces photos n'étaient pas censées être secrètes, mais elles n'étaient pas
--   censées être inventoriables non plus. Quelqu'un pouvait aspirer l'ensemble
--   des dépôts sans jamais visiter le site.
--
--   CORRECTIF : on retire le droit de lister. L'affichage des images n'est PAS
--   affecté : les buckets restent publics, et l'adresse
--   /storage/v1/object/public/… continue de servir chaque fichier sans
--   authentification. C'est cette adresse qu'utilisent l'application et le
--   robot de WhatsApp. Seul l'inventaire disparaît — or on ne devine pas un
--   chemin qui contient deux identifiants aléatoires.

drop policy if exists "images lisibles publiquement" on storage.objects;
drop policy if exists "photos d'atelier lisibles publiquement" on storage.objects;

-- Les administrateurs gardent l'inventaire, utile pour le ménage.
create policy "inventaire du stockage reserve aux admins" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('offer-images', 'atelier-images')
    and public.has_role(auth.uid(), 'admin')
  );


-- =============================================================================
-- 3. Ménage des traces de la revue
-- =============================================================================
--
--   Les tests ont créé de vraies lignes. Elles n'ont rien à faire dans vos
--   chiffres ni dans votre file de candidatures.

delete from public.candidatures
 where display_name in ('SONDE', 'SONDE SECURITE')
    or whatsapp_number = '22890000777';

delete from public.events where session_id in ('SONDE-SECU', 'TEST-BRANCHEMENT');

delete from storage.objects
 where bucket_id = 'atelier-images'
   and name like 'candidatures/sonde/%';


-- =============================================================================
--  VÉRIFICATION
-- =============================================================================
--
--  1. L'affichage des images fonctionne toujours — ouvrez une fiche d'atelier
--     sur le site en ligne, les photos doivent apparaître. C'est LE contrôle
--     à faire après ce fichier.
--
--  2. Plus aucune trace de la revue :
--       select count(*) from public.candidatures where whatsapp_number = '22890000777';  -- 0
--       select count(*) from public.events where session_id like 'SONDE%';               -- 0
--
--  3. Les droits des deux fonctions de statistiques, qui ne doivent contenir
--     ni public ni anon :
--       select proname, proacl from pg_proc
--        where proname in ('offer_stats_period', 'vendor_stats_period');
-- =============================================================================
