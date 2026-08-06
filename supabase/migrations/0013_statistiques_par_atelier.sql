-- =============================================================================
-- 0013 — Compter par atelier, et compter tous les départs
-- =============================================================================
--
-- POURQUOI
--   Le tableau de bord comptait par objet. En phase 1, l'unité n'est plus
--   l'objet mais l'atelier : c'est lui qu'on découvre, qu'on partage et qu'on
--   contacte. Compter par objet ne dit plus rien d'utile.
--
--   Et surtout, trois départs sur cinq n'étaient affichés nulle part. Les clics
--   vers un catalogue WhatsApp Business, vers Instagram ou vers le téléphone
--   étaient bien enregistrés depuis le début — mais aucun écran ne les montrait.
--
-- CE QUE ÇA PERMET DE VOIR
--   Un atelier très consulté mais jamais contacté a un problème de photos ou de
--   prix. Un atelier dont tout le monde part vers Instagram sans jamais écrire
--   n'a pas besoin de vous. Ces deux diagnostics étaient invisibles.
--
-- SÉCURITÉ
--   security invoker, donc les règles de events s'appliquent : seul un
--   administrateur voit autre chose que des zéros. Les droits d'appel sont
--   quand même retirés à « public » — la leçon de la migration 0011.
-- =============================================================================

create or replace function public.vendor_stats_period(days integer default 30)
returns table (
  vendor_id    uuid,
  display_name text,
  city         text,
  vues         bigint,
  whatsapp     bigint,
  catalogue    bigint,
  instagram    bigint,
  telephone    bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    v.id,
    v.display_name,
    v.city,
    count(*) filter (where e.event_type = 'vendor_view')      as vues,
    count(*) filter (where e.event_type = 'whatsapp_click')   as whatsapp,
    count(*) filter (where e.event_type = 'catalog_click')    as catalogue,
    count(*) filter (where e.event_type = 'instagram_click')  as instagram,
    count(*) filter (where e.event_type = 'phone_click')      as telephone
  from public.vendors v
  left join public.events e
    on e.vendor_id = v.id
   and e.created_at >= now() - make_interval(days => greatest(days, 1))
  where v.is_active = true
  group by v.id, v.display_name, v.city;
$$;

-- « from public » d'abord, sinon rien n'est fermé : PostgreSQL accorde
-- l'exécution à ce groupe par défaut. Voir migration 0011.
revoke all on function public.vendor_stats_period(integer) from public;
revoke all on function public.vendor_stats_period(integer) from anon;
grant execute on function public.vendor_stats_period(integer) to authenticated, service_role;

-- =============================================================================
--  VÉRIFICATION
-- =============================================================================
--
--  Depuis l'éditeur SQL (qui voit tout) :
--    select * from public.vendor_stats_period(30) order by vues desc;
--
--  Les droits, qui ne doivent contenir ni public ni anon :
--    select proname, proacl from pg_proc
--     where proname = 'vendor_stats_period';
-- =============================================================================
