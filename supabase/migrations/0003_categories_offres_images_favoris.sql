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
