-- =============================================================================
-- 0010 — Expiration des fiches, faite et planifiée par la base
-- =============================================================================
--
-- POURQUOI DANS LA BASE PLUTÔT QUE DANS UNE FONCTION SERVEUR
--   La planification d'une fonction serveur oblige à ranger une clé d'accès
--   quelque part pour que la tâche puisse s'authentifier. Ici, rien à ranger :
--   la base se déclenche elle-même et modifie ses propres lignes.
--
--   La fonction serveur « expiration-fiches » reste utile — elle produit le
--   rapport et la liste des créateurs à rappeler pour le back-office — mais
--   elle ne décide plus du seuil ni de la dépublication : elle appelle ce qui
--   suit. Le seuil de 60 jours n'est donc écrit qu'à un seul endroit.
--
-- CE QUI EST FAIT AUX FICHES PÉRIMÉES
--   Elles repassent en brouillon. Rien n'est supprimé, tout est republiable
--   d'un clic depuis le back-office après vérification auprès du créateur.
-- =============================================================================

-- --- La liste, sans rien modifier -------------------------------------------

create or replace function public.fiches_perimees(jours integer default 60)
returns table (
  offer_id            uuid,
  slug                text,
  title               text,
  vendor_display_name text,
  vendor_id           uuid,
  contact_name        text,
  whatsapp_number     text,
  jours_ecoules       integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id, o.slug, o.title, o.vendor_display_name,
    v.id, v.contact_name, v.whatsapp_number,
    extract(day from now() - o.last_confirmed_at)::integer
  from public.offers o
  join public.vendors v on v.id = o.vendor_id
  where o.status = 'published'
    and o.last_confirmed_at < now() - make_interval(days => greatest(jours, 1))
  order by o.last_confirmed_at;
$$;

-- SECURITY DEFINER ci-dessus : la fonction doit voir toutes les offres, y
-- compris pour un appelant qui n'en verrait qu'une partie. On restreint donc
-- explicitement qui a le droit de l'appeler.
revoke execute on function public.fiches_perimees(integer) from anon, authenticated;
grant execute on function public.fiches_perimees(integer) to service_role;

-- --- La dépublication --------------------------------------------------------

create or replace function public.expirer_fiches(jours integer default 60)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  nombre integer;
begin
  update public.offers
     set status = 'draft'
   where status = 'published'
     and last_confirmed_at < now() - make_interval(days => greatest(jours, 1));

  get diagnostics nombre = row_count;
  return nombre;
end;
$$;

revoke execute on function public.expirer_fiches(integer) from anon, authenticated;
grant execute on function public.expirer_fiches(integer) to service_role;

-- =============================================================================
--  PLANIFICATION HEBDOMADAIRE
-- =============================================================================
--
--  pg_cron est le planificateur intégré à PostgreSQL. Il faut l'activer une
--  fois : Database -> Extensions -> chercher « pg_cron » -> activer.
--  Ou simplement laisser la ligne ci-dessous s'en charger.

create extension if not exists pg_cron;

-- Retire une éventuelle tâche du même nom, pour que ce fichier puisse être
-- rejoué sans créer de doublon.
do $$
begin
  perform cron.unschedule('expiration-fiches');
exception
  when others then null; -- la tâche n'existait pas : rien à faire
end;
$$;

-- Tous les lundis à 6 h (heure du serveur, UTC).
select cron.schedule(
  'expiration-fiches',
  '0 6 * * 1',
  $$ select public.expirer_fiches(); $$
);

-- =============================================================================
--  VÉRIFICATIONS
-- =============================================================================
--
--  La tâche est-elle enregistrée ?
--    select jobname, schedule, active from cron.job where jobname = 'expiration-fiches';
--
--  Qu'est-ce qui expirerait aujourd'hui ? (ne modifie rien)
--    select * from public.fiches_perimees();
--
--  Historique des passages, après le premier lundi :
--    select status, start_time, return_message from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'expiration-fiches')
--     order by start_time desc limit 10;
--
--  Pour arrêter la planification :
--    select cron.unschedule('expiration-fiches');
-- =============================================================================
