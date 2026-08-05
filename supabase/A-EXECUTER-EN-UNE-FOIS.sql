-- =============================================================================
--  TETU WONDU — TOUT LE SQL, POUR RECONSTRUIRE UNE BASE VIDE
-- =============================================================================
--
--  Concatenation automatique des fichiers 0002 et suivants du dossier
--  migrations/. Ne le modifiez pas a la main : modifiez les fichiers numerotes,
--  puis regenerez celui-ci (voir README.md).
--
--  Le fichier 0001 n'est PAS inclus : il etait deja execute quand ce fichier a
--  ete cree la premiere fois. Pour une base entierement vide, jouez 0001 avant.
--
--  Doit etre enregistre en UTF-8 SANS BOM, sinon PostgreSQL rejette la ligne 1.
--
-- =============================================================================

-- >>>>>>>>>>>>>>>>>>>>  0002_corrections_bloc1.sql  <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0002 — Corrections du bloc 1 (à exécuter)
-- =============================================================================
--
-- Le bloc 1 a été exécuté avant la revue du 3 août 2026. Ce fichier rattrape
-- ce qui y manquait, sans toucher au reste.
--
-- Ce que ça corrige :
--   • Le numéro WhatsApp n'avait aucun contrôle de format. Tout le modèle
--     du projet passe par ce champ : une faute de frappe = un créateur
--     injoignable, et personne ne s'en aperçoit.
--
-- ⚠️  Si vous avez déjà saisi des créateurs à la main avec un numéro contenant
--     un « + », des espaces ou des tirets, cette commande échouera. Dans ce cas
--     corrigez d'abord les numéros dans le Table Editor (chiffres uniquement,
--     indicatif pays compris : 22890000001), puis relancez.
-- =============================================================================

-- Chiffres uniquement, 8 à 15 caractères. Format attendu par wa.me : pas de
-- « + », pas d'espace, pas de tiret, indicatif pays inclus.
alter table public.vendors
  add constraint vendors_whatsapp_format
  check (whatsapp_number ~ '^[0-9]{8,15}$');


-- >>>>>>>>>>>>>>>>>>>>  0003_categories_offres_images_favoris.sql  <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0003 — Catégories, offres, images, favoris   (= « Bloc 2 »)
-- =============================================================================
--
-- Différence avec guide-miato-v2.md section 1.2 : la colonne
-- vendor_display_name a été ajoutée sur offers, et incluse dans search_vector.
--
-- Pourquoi : l'écran d'accueil doit permettre de chercher « par créateur ».
-- search_vector est une colonne calculée automatiquement, et une colonne
-- calculée ne peut lire que sa propre ligne — jamais une autre table. Le nom
-- du créateur doit donc être recopié dans offers. Cette recopie est entretenue
-- automatiquement par les déclencheurs du fichier 0004 : vous n'aurez jamais
-- à saisir ce champ vous-même.
--
-- L'alternative était de faire deux recherches séparées (offres, puis
-- créateurs) et de les fusionner dans le navigateur. Écartée : elle casse le
-- défilement infini par pages de 12 prévu sur l'accueil.
-- =============================================================================

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  icon_name    text,
  applies_to   public.offer_type not null default 'product',
  sort_order   integer not null default 0
);

-- OFFERS : produits ET services dans une seule table.
-- offer_type distingue les deux ; on lance avec 'product' uniquement, et
-- l'ouverture des services ne demandera aucune migration.
create table public.offers (
  id                  uuid primary key default gen_random_uuid(),
  vendor_id           uuid not null references public.vendors(id) on delete cascade,
  category_id         uuid references public.categories(id) on delete set null,
  offer_type          public.offer_type not null default 'product',
  slug                text not null unique,
  title               text not null,
  description         text,
  details             text,
  price_mode          public.price_mode not null default 'fixed',
  price_cfa           integer check (price_cfa is null or price_cfa >= 0),
  unit                text,
  is_made_to_order    boolean not null default false,
  lead_time_days      integer check (lead_time_days is null or lead_time_days >= 0),
  is_customizable     boolean not null default false,
  origin_city         text,
  status              public.offer_status not null default 'draft',
  is_available        boolean not null default true,
  last_confirmed_at   timestamptz not null default now(),
  -- Recopie du nom du créateur, entretenue par déclencheur (fichier 0004).
  -- Ne jamais l'écrire à la main.
  vendor_display_name text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Un prix est obligatoire, sauf en mode « sur devis » où il doit rester NULL
  -- côté affichage (ne jamais montrer 0 FCFA).
  constraint price_required_unless_quote
    check (price_mode = 'quote' or price_cfa is not null)
);

create index offers_status_idx   on public.offers (status);
create index offers_vendor_idx   on public.offers (vendor_id);
create index offers_category_idx on public.offers (category_id);
create index offers_type_idx     on public.offers (offer_type);

-- Colonne de recherche plein texte, recalculée seule à chaque modification.
alter table public.offers
  add column search_vector tsvector
  generated always as (
    to_tsvector('french',
      coalesce(title, '')               || ' ' ||
      coalesce(description, '')         || ' ' ||
      coalesce(origin_city, '')         || ' ' ||
      coalesce(vendor_display_name, ''))
  ) stored;

create index offers_search_idx on public.offers using gin (search_vector);

create table public.offer_images (
  id           uuid primary key default gen_random_uuid(),
  offer_id     uuid not null references public.offers(id) on delete cascade,
  storage_path text not null,
  alt_text     text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index offer_images_offer_idx on public.offer_images (offer_id, sort_order);

-- FAVORITES : prévu pour plus tard. Inutilisable au lancement puisqu'il faut
-- un compte visiteur, qui n'existe pas encore. Ne rien afficher qui en dépende.
create table public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  offer_id   uuid not null references public.offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, offer_id)
);


-- >>>>>>>>>>>>>>>>>>>>  0004_automatismes.sql  <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0004 — Automatismes
-- =============================================================================
--
-- Correspond à guide-miato-v2.md section 1.4 — qui ne figurait dans AUCUN des
-- six blocs listés dans CLAUDE.md. Sans ce fichier, updated_at ne bouge jamais
-- et l'inscription d'un nouvel utilisateur ne crée ni profil ni rôle.
--
-- S'y ajoute l'entretien automatique de vendor_display_name (voir 0003).
-- =============================================================================

-- --- Horodatage des modifications -------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger t_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger t_vendors_touch  before update on public.vendors
  for each row execute function public.touch_updated_at();
create trigger t_offers_touch   before update on public.offers
  for each row execute function public.touch_updated_at();

-- --- Création du profil et du rôle à l'inscription ---------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.user_roles (user_id, role) values (new.id, 'visitor');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Recopie du nom du créateur dans offers ----------------------------------
-- Permet la recherche « par créateur » depuis l'accueil (voir 0003).

-- Cas 1 : une offre est créée, ou change de créateur.
create or replace function public.sync_offer_vendor_name()
returns trigger language plpgsql set search_path = public as $$
begin
  select display_name into new.vendor_display_name
  from public.vendors where id = new.vendor_id;
  return new;
end;
$$;

create trigger t_offers_sync_vendor_name
  before insert or update of vendor_id on public.offers
  for each row execute function public.sync_offer_vendor_name();

-- Cas 2 : un créateur est renommé — toutes ses offres suivent.
create or replace function public.propagate_vendor_name()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.offers
     set vendor_display_name = new.display_name
   where vendor_id = new.id
     and vendor_display_name is distinct from new.display_name;
  return null;
end;
$$;

create trigger t_vendors_propagate_name
  after update of display_name on public.vendors
  for each row
  when (old.display_name is distinct from new.display_name)
  execute function public.propagate_vendor_name();


-- >>>>>>>>>>>>>>>>>>>>  0005_evenements_et_statistiques.sql  <<<<<<<<<<<<<<<<<<<<

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


-- >>>>>>>>>>>>>>>>>>>>  0006_politiques_rls.sql  <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0006 — Sécurité : RLS et colonnes protégées   (= « Bloc 4 »)
-- =============================================================================
--
-- Tout ce qui touche à la sécurité est réuni ici.
--
-- Deux écarts avec guide-miato-v2.md section 1.5, issus de la revue :
--
--   1. Les politiques UPDATE avaient un « using » sans « with check ».
--      « using » dit qui a le droit de toucher à la ligne ; « with check » dit
--      à quoi la ligne a le droit de ressembler APRÈS. Sans le second, la
--      vérification d'après-modification n'existe pas.
--
--   2. La revue proposait de retirer le droit de modifier is_verified via des
--      droits colonne par colonne. Écarté : dans Supabase, l'administrateur est
--      lui aussi un utilisateur « authenticated ». Ce correctif l'aurait empêché
--      de cocher « Vérifié » et de publier une offre depuis son back-office.
--      Remplacé par les déclencheurs de fin de fichier, qui distinguent
--      l'administrateur du créateur.
--
-- C'est dormant au lancement : les créateurs n'ont pas de compte, vendors.user_id
-- est NULL. Cela s'active le jour où un créateur réclame sa fiche.
-- =============================================================================

alter table public.profiles     enable row level security;
alter table public.user_roles   enable row level security;
alter table public.vendors      enable row level security;
alter table public.categories   enable row level security;
alter table public.offers       enable row level security;
alter table public.offer_images enable row level security;
alter table public.favorites    enable row level security;
alter table public.events       enable row level security;

-- --- PROFILES ----------------------------------------------------------------

create policy "profil visible par son propriétaire" on public.profiles
  for select using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

create policy "profil modifiable par son propriétaire" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);   -- interdit de réattribuer son profil à autrui

-- --- USER_ROLES --------------------------------------------------------------
-- Les rôles vivent ici et nulle part ailleurs. Aucune écriture depuis le client.

create policy "lecture de ses propres rôles" on public.user_roles
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "seuls les admins gèrent les rôles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- CATEGORIES --------------------------------------------------------------

create policy "catégories publiques" on public.categories
  for select using (true);

create policy "admins gèrent les catégories" on public.categories
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- VENDORS -----------------------------------------------------------------

create policy "créateurs actifs visibles publiquement" on public.vendors
  for select using (
    is_active = true or user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "créateur modifie sa fiche" on public.vendors
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());   -- interdit de céder sa fiche à un autre compte

create policy "admins gèrent les créateurs" on public.vendors
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- OFFERS ------------------------------------------------------------------

create policy "offres publiées visibles publiquement" on public.offers
  for select using (
    status = 'published'
    or public.has_role(auth.uid(), 'admin')
    or vendor_id in (select id from public.vendors where user_id = auth.uid()));

create policy "créateur gère ses offres" on public.offers
  for all using (vendor_id in (select id from public.vendors where user_id = auth.uid()))
  with check (vendor_id in (select id from public.vendors where user_id = auth.uid()));

create policy "admins gèrent toutes les offres" on public.offers
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- OFFER_IMAGES ------------------------------------------------------------

create policy "images visibles avec l'offre" on public.offer_images
  for select using (true);

create policy "créateur gère les images de ses offres" on public.offer_images
  for all using (
    offer_id in (
      select o.id from public.offers o
      join public.vendors v on v.id = o.vendor_id
      where v.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin'))
  with check (
    offer_id in (
      select o.id from public.offers o
      join public.vendors v on v.id = o.vendor_id
      where v.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin'));

-- --- FAVORITES ---------------------------------------------------------------

create policy "favoris privés" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- EVENTS ------------------------------------------------------------------
-- Tout le monde écrit (y compris les visiteurs anonymes), seuls les admins lisent.

create policy "écriture d'événement ouverte" on public.events
  for insert to anon, authenticated with check (true);

create policy "lecture des événements réservée aux admins" on public.events
  for select using (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- Colonnes réservées à l'administrateur
-- =============================================================================
--
-- Le badge « Vérifié » est le principal signal de confiance de la plateforme.
-- Le statut « publié » est ce qui court-circuite ou non la modération.
-- Ni l'un ni l'autre ne doit être auto-attribuable par un créateur.
--
-- Les règles RLS ne suffisent pas ici : elles ne savent pas comparer la valeur
-- d'avant et la valeur d'après. Un déclencheur, si.
--
-- Fonctionnement : si un créateur tente de modifier une colonne réservée, la
-- valeur d'origine est silencieusement remise. Pas d'erreur, pas d'écran cassé.
-- L'éditeur SQL de Supabase et les Edge Functions (expiration hebdomadaire des
-- fiches) ne sont pas concernés.

create or replace function public.protect_vendor_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Éditeur SQL (rôle postgres) et Edge Functions (rôle service_role) : libre.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  new.is_verified := old.is_verified;
  new.is_active   := old.is_active;
  new.slug        := old.slug;
  new.user_id     := old.user_id;
  return new;
end;
$$;

create trigger t_vendors_protect
  before update on public.vendors
  for each row execute function public.protect_vendor_columns();

create or replace function public.protect_offer_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  new.status    := old.status;
  new.slug      := old.slug;
  new.vendor_id := old.vendor_id;
  return new;
end;
$$;

create trigger t_offers_protect
  before update on public.offers
  for each row execute function public.protect_offer_columns();


-- >>>>>>>>>>>>>>>>>>>>  0007_stockage_images.sql  <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0007 — Stockage des images   (= « Bloc 5 »)
-- =============================================================================
--
-- Bucket public : les photos des offres doivent être lisibles sans compte, y
-- compris par le robot de WhatsApp qui génère l'aperçu des liens partagés.
--
-- Note connue : la suppression étant réservée aux admins, les images orphelines
-- (offre supprimée) s'accumuleront dans le bucket. Sans importance au lancement,
-- à nettoyer plus tard.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('offer-images', 'offer-images', true)
on conflict (id) do nothing;

create policy "images lisibles publiquement" on storage.objects
  for select using (bucket_id = 'offer-images');

create policy "upload réservé aux créateurs et admins" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'offer-images'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'vendor')));

create policy "suppression réservée aux admins" on storage.objects
  for delete to authenticated using (
    bucket_id = 'offer-images' and public.has_role(auth.uid(), 'admin'));


-- >>>>>>>>>>>>>>>>>>>>  0008_categories_et_jeu_de_test.sql  <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0008 — Catégories et jeu de données de test   (= « Bloc 6 »)
-- =============================================================================
--
-- Les catégories sont définitives : elles serviront en production.
-- Les créateurs et les offres sont FICTIFS : ils servent à faire apparaître les
-- problèmes d'affichage (les trois modes de prix, le sur-commande, le devis)
-- avant d'avoir de vraies fiches. À supprimer avant la mise en ligne publique.
--
-- Les numéros WhatsApp de test (22890000001 et suivants) n'existent pas.
-- =============================================================================

-- --- Catégories --------------------------------------------------------------
-- Huit catégories produits pour le lancement. Les services sont préparés dans
-- la base mais NE DOIVENT PAS apparaître dans les filtres de l'application.

insert into public.categories (name, slug, icon_name, applies_to, sort_order) values
  ('Alimentation & boissons',      'alimentation',    'Cookie',        'product', 1),
  ('Beauté & soins',               'beaute',          'Sparkles',      'product', 2),
  ('Mode & accessoires',           'mode',            'Shirt',         'product', 3),
  ('Bijoux',                       'bijoux',          'Diamond',       'product', 4),
  ('Maison & décoration',          'maison',          'Lamp',          'product', 5),
  ('Personnalisation & impression','personnalisation','Stamp',         'product', 6),
  ('Art & créations',              'art',             'Palette',       'product', 7),
  ('Enfants & bébé',               'enfants',         'Baby',          'product', 8),
  -- Préparées pour plus tard, ne pas afficher au lancement
  ('Événementiel & traiteur',      'evenementiel',    'PartyPopper',   'service', 20),
  ('Beauté & coiffure',            'coiffure',        'Scissors',      'service', 21),
  ('Photo & vidéo',                'photo',           'Camera',        'service', 22),
  ('Design & communication',       'design',          'PenTool',       'service', 23),
  ('Couture sur mesure',           'couture',         'Needle',        'service', 24)
on conflict (slug) do nothing;

-- --- Créateurs fictifs -------------------------------------------------------

insert into public.vendors
  (slug, display_name, vendor_type, contact_name, whatsapp_number, city, tagline, accepts_custom, is_verified)
values
  ('karite-kara',    'Karité de Kara',       'transformer', 'Mariam Tchalla', '22890000001', 'Kara',    'Beurre de karité et savons, coopérative de 40 femmes', false, true),
  ('vergers-kloto',  'Vergers du Kloto',     'transformer', 'Afi Kodjo',      '22890000002', 'Kpalimé', 'Jus et confitures du plateau de Danyi',               false, true),
  ('atelier-notse',  'Atelier Tissage Notsé','maker',       'Kossi Amegan',   '22890000003', 'Notsé',   'Pagne kenté tissé sur métier traditionnel',           true,  true),
  ('perles-dahoue',  'Perles de Dahoué',     'creator',     'Sylvie Ahouna',  '22890000004', 'Lomé',    'Bijoux en perles de verre recyclé et laiton',         true,  true),
  ('flok-228',       'Flok 228',             'maker',       'Rachid Ouro',    '22890000005', 'Lomé',    'Impression textile, mugs et objets personnalisés',    true,  false),
  ('terre-bassar',   'Terre de Bassar',      'maker',       'Abdou Sambiani', '22890000006', 'Bassar',  'Poterie et céramique utilitaire',                     false, false),
  ('glaces-akwaba',  'Glaces Akwaba',        'transformer', 'Yawa Dogbe',     '22890000007', 'Lomé',    'Glaces artisanales aux fruits locaux',                false, true),
  ('atelier-zogbe',  'Atelier Zogbé',        'creator',     'Komlan Zogbé',   '22890000008', 'Aného',   'Peinture acrylique et illustration',                  true,  false)
on conflict (slug) do nothing;

-- --- Offres fictives ---------------------------------------------------------
-- 20 offres couvrant les trois modes de prix et les deux modes de disponibilité.
-- vendor_display_name n'est pas renseigné ici : le déclencheur du fichier 0004
-- le remplit tout seul.

insert into public.offers
  (vendor_id, category_id, offer_type, slug, title, description,
   price_mode, price_cfa, unit, is_made_to_order, lead_time_days, is_customizable, origin_city, status)
select v.id, c.id, 'product'::public.offer_type,
       d.slug, d.title, d.description,
       d.price_mode::public.price_mode, d.price_cfa, d.unit,
       d.mto, d.lead, d.custom, d.city, 'published'::public.offer_status
from (values
  ('karite-kara',   'beaute',          'beurre-karite-brut',   'Beurre de karité brut non raffiné', 'Extraction artisanale à l''eau, sans additif.',             'fixed',  3000, '500 g',    false, null, false, 'Kara'),
  ('karite-kara',   'beaute',          'savon-noir-karite',    'Savon noir au karité',              'Cendres de cabosses et karité, recette traditionnelle.',   'fixed',  1000, '150 g',    false, null, false, 'Kara'),
  ('karite-kara',   'beaute',          'baume-levres-miel',    'Baume à lèvres karité-miel',        'Karité, cire d''abeille et miel des Savanes.',             'fixed',  1200, '15 g',     false, null, false, 'Kara'),
  ('vergers-kloto', 'alimentation',    'jus-ananas-1l',        'Jus d''ananas pur pressé',          'Ananas pain de sucre, sans sucre ajouté.',                 'fixed',  2000, '1 L',      false, null, false, 'Kpalimé'),
  ('vergers-kloto', 'alimentation',    'confiture-mangue',     'Confiture de mangue artisanale',    'Mangues locales cuites au chaudron.',                      'fixed',  1800, '330 g',    false, null, false, 'Kpalimé'),
  ('vergers-kloto', 'alimentation',    'poudre-baobab',        'Poudre de fruit de baobab',         'Riche en vitamine C, à diluer.',                           'fixed',  2800, '200 g',    false, null, false, 'Kpalimé'),
  ('atelier-notse', 'mode',            'pagne-kente-6y',       'Pagne kenté tissé main, 6 yards',   'Coton teint et tissé sur métier traditionnel.',            'from',  25000, '6 yards',  true,    14, true,  'Notsé'),
  ('atelier-notse', 'mode',            'echarpe-kente',        'Écharpe kenté',                     'Motifs géométriques traditionnels, coton.',                'fixed',  7500, 'pièce',    false, null, false, 'Notsé'),
  ('perles-dahoue', 'bijoux',          'collier-perles-verre', 'Collier en perles de verre recyclé','Perles fondues à la main, fermoir laiton.',                'fixed',  8500, 'pièce',    false, null, true,  'Lomé'),
  ('perles-dahoue', 'bijoux',          'bracelets-laiton-set', 'Set de 3 bracelets en laiton',      'Laiton martelé, finition brossée.',                        'fixed',  6000, 'set de 3', false, null, false, 'Lomé'),
  ('perles-dahoue', 'bijoux',          'parure-mariage',       'Parure de mariage sur mesure',      'Collier, boucles et bracelet coordonnés.',                 'quote',  null, 'parure',   true,    21, true,  'Lomé'),
  ('flok-228',      'personnalisation','tshirt-personnalise',  'T-shirt personnalisé',              'Coton 180 g, impression une ou deux faces.',               'from',   6500, 'pièce',    true,     3, true,  'Lomé'),
  ('flok-228',      'personnalisation','mug-personnalise',     'Mug personnalisé',                  'Céramique blanche, impression sublimation.',               'fixed',  4000, 'pièce',    true,     2, true,  'Lomé'),
  ('flok-228',      'personnalisation','totebag-imprime',      'Tote bag imprimé',                  'Toile coton écru, impression sérigraphie.',                'from',   5000, 'pièce',    true,     4, true,  'Lomé'),
  ('terre-bassar',  'maison',          'canari-eau',           'Canari à eau en terre cuite',       'Garde l''eau fraîche naturellement.',                      'fixed',  6000, 'pièce',    false, null, false, 'Bassar'),
  ('terre-bassar',  'maison',          'set-bols-emailles',    'Set de 4 bols en terre cuite',      'Émaillage alimentaire, passe au four.',                    'fixed',  9000, 'set de 4', false, null, false, 'Bassar'),
  ('glaces-akwaba', 'alimentation',    'glace-corossol',       'Glace artisanale au corossol',      'Pulpe fraîche, sans colorant.',                            'fixed',  2500, '500 ml',   false, null, false, 'Lomé'),
  ('glaces-akwaba', 'alimentation',    'sorbet-bissap',        'Sorbet au bissap',                  'Infusion d''hibiscus et gingembre.',                       'fixed',  2200, '500 ml',   false, null, false, 'Lomé'),
  ('atelier-zogbe', 'art',             'toile-marche-lome',    'Toile « Marché de Lomé », 60x80',   'Acrylique sur toile, pièce unique.',                       'fixed', 45000, 'pièce',    false, null, false, 'Aného'),
  ('atelier-zogbe', 'art',             'portrait-commande',    'Portrait sur commande',             'À partir d''une photo, format au choix.',                  'quote',  null, 'pièce',    true,    10, true,  'Aného')
) as d(vendor_slug, cat_slug, slug, title, description, price_mode, price_cfa, unit, mto, lead, custom, city)
join public.vendors    v on v.slug = d.vendor_slug
join public.categories c on c.slug = d.cat_slug
on conflict (slug) do nothing;


-- >>>>>>>>>>>>>>>>>>>>  0009_recherche_sans_accents.sql  <<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- 0009 — Rendre la recherche insensible aux accents
-- =============================================================================
--
-- LE PROBLÈME
--   Chercher « kpalime » ne trouve pas « Kpalimé ». « karite » ne trouve pas
--   « Karité ». Sur un clavier Android d'entrée de gamme, personne ne tape les
--   accents : c'est donc la majorité des recherches qui échouent en silence,
--   et le visiteur en conclut que le catalogue est vide.
--
-- LA SOLUTION
--   Retirer les accents des DEUX côtés : du texte enregistré et du texte
--   cherché. « Kpalimé » est indexé comme « kpalime », et « kpalimé » comme
--   « kpalime » aussi — les deux se rejoignent.
--
-- POURQUOI UNE FONCTION SUPPLÉMENTAIRE
--   search_vector est une colonne calculée par la base. PostgreSQL n'accepte
--   dans ce calcul que des fonctions dont le résultat ne changera jamais pour
--   une même entrée. unaccent() ne donne pas cette garantie, parce qu'elle
--   dépend d'un dictionnaire modifiable. On l'enveloppe donc dans f_unaccent()
--   en nommant le dictionnaire explicitement, ce qui lève l'ambiguïté.
--
-- SANS RISQUE
--   search_vector ne contient aucune donnée propre : elle est recalculée à
--   partir du titre, de la description, de la ville et du nom du créateur.
--   La supprimer et la reconstruire ne perd rien.
-- =============================================================================

-- Dans Supabase, les extensions vivent par convention dans le schéma
-- « extensions », jamais dans « public ».
create extension if not exists unaccent with schema extensions;

create or replace function public.f_unaccent(texte text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, texte)
$$;

-- Reconstruction de la colonne de recherche.
drop index if exists public.offers_search_idx;
alter table public.offers drop column if exists search_vector;

alter table public.offers
  add column search_vector tsvector
  generated always as (
    to_tsvector(
      'french',
      public.f_unaccent(
        coalesce(title, '')               || ' ' ||
        coalesce(description, '')         || ' ' ||
        coalesce(origin_city, '')         || ' ' ||
        coalesce(vendor_display_name, '')
      )
    )
  ) stored;

create index offers_search_idx on public.offers using gin (search_vector);

-- =============================================================================
--  L'APPLICATION DOIT FAIRE LA MÊME CHOSE
-- =============================================================================
--
--  Retirer les accents à l'enregistrement ne suffit pas : le terme tapé par le
--  visiteur doit l'être aussi, sinon « karité » cherche « karité » dans un
--  index qui ne contient que « karite ».
--
--  C'est fait dans src/hooks/useRecherche.ts, fonction sansAccents().
--  Les deux vont ensemble : modifier l'un sans l'autre casse la recherche.
--
-- =============================================================================
--  VÉRIFICATION — les quatre doivent renvoyer au moins une ligne
-- =============================================================================
--
--  select count(*) from public.offers where search_vector @@ plainto_tsquery('french', public.f_unaccent('kpalime'));
--  select count(*) from public.offers where search_vector @@ plainto_tsquery('french', public.f_unaccent('Kpalimé'));
--  select count(*) from public.offers where search_vector @@ plainto_tsquery('french', public.f_unaccent('karite'));
--  select count(*) from public.offers where search_vector @@ plainto_tsquery('french', public.f_unaccent('flok'));
-- =============================================================================


-- >>>>>>>>>>>>>>>>>>>>  0010_expiration_planifiee.sql  <<<<<<<<<<<<<<<<<<<<

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
--
-- ATTENTION : « from public » est indispensable et vient EN PREMIER. PostgreSQL
-- accorde l'exécution au groupe public par défaut ; retirer le droit à anon
-- seul ne retire rien. Voir migration 0011, qui corrige cet oubli.
revoke all on function public.fiches_perimees(integer) from public;
revoke all on function public.fiches_perimees(integer) from anon, authenticated;
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

-- Même remarque que ci-dessus : « from public » d'abord, sinon rien n'est fermé.
revoke all on function public.expirer_fiches(integer) from public;
revoke all on function public.expirer_fiches(integer) from anon, authenticated;
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


-- >>>>>>>>>>>>>>>>>>>>  0011_ferme_acces_expiration.sql  <<<<<<<<<<<<<<<<<<<<

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
