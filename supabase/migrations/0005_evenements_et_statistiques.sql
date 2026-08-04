-- =============================================================================
-- 0005 — Suivi d'audience et statistiques   (= « Bloc 3 »)
-- =============================================================================
--
-- C'est la table qui donne sa valeur au projet. Au bout d'un mois, les clics
-- WhatsApp sont le seul actif : la preuve chiffrée que la plateforme apporte
-- des clients. Si le suivi ne fonctionne pas, rien d'autre n'a de valeur.
--
-- Deux écarts avec guide-miato-v2.md section 1.3, tous deux issus de la revue :
--
--   1. La vue offer_stats est passée en security_invoker. Sans cela elle
--      s'exécutait avec les droits de son propriétaire, ce qui annulait la
--      règle « seuls les admins lisent les événements » : n'importe qui
--      disposant de la clé publique du projet pouvait lire les statistiques
--      de tous les créateurs. Supabase le signalait en rouge sous le nom
--      security_definer_view.
--
--   2. La vue n'avait aucun filtre de date alors que le tableau de bord
--      demande 7 et 30 jours. D'où la fonction offer_stats_period ci-dessous.
-- =============================================================================

create type public.event_type as enum (
  'offer_view', 'vendor_view', 'whatsapp_click', 'phone_click',
  'instagram_click', 'search', 'category_view'
);

create table public.events (
  id         uuid primary key default gen_random_uuid(),
  event_type public.event_type not null,
  offer_id   uuid references public.offers(id) on delete set null,
  vendor_id  uuid references public.vendors(id) on delete set null,
  session_id text,
  metadata   jsonb,
  created_at timestamptz not null default now(),
  -- L'écriture est ouverte à tous, y compris aux visiteurs anonymes : sans
  -- garde-fou, n'importe qui pourrait remplir la table de contenu volumineux.
  constraint events_metadata_size check (
    metadata is null or length(metadata::text) <= 2000
  ),
  constraint events_session_id_size check (
    session_id is null or length(session_id) <= 64
  )
);

create index events_type_date_idx on public.events (event_type, created_at desc);
create index events_offer_idx     on public.events (offer_id);
create index events_vendor_idx    on public.events (vendor_id);

-- Déduplication des vues : un même visiteur qui rafraîchit une fiche dix fois
-- dans l'heure ne compte qu'une vue. Sinon le ratio « clics WhatsApp / vues »
-- — l'indicateur qui dit si le catalogue donne envie — est faussé vers le bas.
-- Les clics ne sont PAS dédupliqués : deux prises de contact sont deux
-- prises de contact.
-- L'insertion en double échoue silencieusement, ce qui est le comportement
-- voulu : le suivi ne doit jamais casser l'interface.
create unique index events_offer_view_dedup_idx
  on public.events (
    offer_id, session_id, (date_trunc('hour', created_at at time zone 'UTC'))
  )
  where event_type = 'offer_view' and offer_id is not null and session_id is not null;

create unique index events_vendor_view_dedup_idx
  on public.events (
    vendor_id, session_id, (date_trunc('hour', created_at at time zone 'UTC'))
  )
  where event_type = 'vendor_view' and vendor_id is not null and session_id is not null;

-- --- Statistiques ------------------------------------------------------------

-- Vue « depuis toujours ». security_invoker = on : elle s'exécute avec les
-- droits de celui qui la consulte, donc les règles de sécurité de events
-- s'appliquent. Un non-administrateur verra les lignes mais des compteurs à 0.
create or replace view public.offer_stats
  with (security_invoker = on) as
select
  o.id as offer_id, o.title, v.display_name,
  count(*) filter (where e.event_type = 'offer_view')     as views,
  count(*) filter (where e.event_type = 'whatsapp_click') as whatsapp_clicks
from public.offers o
join public.vendors v on v.id = o.vendor_id
left join public.events e on e.offer_id = o.id
group by o.id, o.title, v.display_name;

-- Même chose sur une période glissante, pour le tableau de bord 7 / 30 jours.
-- Appel depuis l'application : supabase.rpc('offer_stats_period', { days: 7 })
create or replace function public.offer_stats_period(days integer default 30)
returns table (
  offer_id        uuid,
  title           text,
  display_name    text,
  views           bigint,
  whatsapp_clicks bigint
)
language sql stable security invoker set search_path = public as $$
  select
    o.id, o.title, v.display_name,
    count(*) filter (where e.event_type = 'offer_view')     as views,
    count(*) filter (where e.event_type = 'whatsapp_click') as whatsapp_clicks
  from public.offers o
  join public.vendors v on v.id = o.vendor_id
  left join public.events e
    on e.offer_id = o.id
   and e.created_at >= now() - make_interval(days => greatest(days, 1))
  group by o.id, o.title, v.display_name;
$$;
