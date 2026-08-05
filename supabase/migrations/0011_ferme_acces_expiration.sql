-- =============================================================================
-- 0011 — Fermer l'accès aux fonctions d'expiration   (CORRECTIF DE SÉCURITÉ)
-- =============================================================================
--
-- LE DÉFAUT
--   La migration 0010 croyait fermer l'accès avec :
--       revoke execute on function ... from anon, authenticated;
--
--   C'est insuffisant. PostgreSQL accorde le droit d'exécution d'une fonction
--   au groupe « public » par défaut, et ce groupe englobe tout le monde —
--   y compris anon. Retirer le droit à anon ne retire rien tant que public
--   l'a encore.
--
-- CE QUE ÇA PERMETTAIT
--   N'importe quel visiteur, avec la clé publique lisible dans le code du
--   site, pouvait appeler :
--       expirer_fiches(0)
--   greatest(0, 1) valant 1, cela dépubliait toute offre de plus d'un jour —
--   c'est-à-dire le catalogue entier. Les fonctions étant en SECURITY DEFINER,
--   les règles RLS ne s'y opposaient pas : c'est précisément le pouvoir qu'on
--   leur donne, et la raison pour laquelle leurs droits d'appel doivent être
--   verrouillés à la main.
--
-- APRÈS CE FICHIER
--   Seul service_role peut les appeler : la tâche hebdomadaire (qui s'exécute
--   dans la base, sans passer par le réseau) et la fonction serveur
--   « expiration-fiches », qui vérifie de son côté que le demandeur est
--   administrateur.
-- =============================================================================

revoke all on function public.fiches_perimees(integer) from public;
revoke all on function public.expirer_fiches(integer)  from public;

revoke all on function public.fiches_perimees(integer) from anon, authenticated;
revoke all on function public.expirer_fiches(integer)  from anon, authenticated;

grant execute on function public.fiches_perimees(integer) to service_role;
grant execute on function public.expirer_fiches(integer)  to service_role;

-- =============================================================================
--  VÉRIFICATION
-- =============================================================================
--
--  Qui a le droit d'appeler quoi ? La colonne « droits » ne doit contenir que
--  service_role et le propriétaire — ni public, ni anon, ni authenticated.
--
--    select p.proname as fonction,
--           coalesce(array_to_string(p.proacl, E'\n'), '(par defaut = tout le monde)') as droits
--      from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public'
--       and p.proname in ('fiches_perimees', 'expirer_fiches');
--
--  Test grandeur nature, depuis un terminal, avec la clé publique :
--    l'appel doit renvoyer une erreur de permission, pas un résultat.
-- =============================================================================
