-- =============================================================================
-- 0015 — Les créateurs déposent eux-mêmes leur candidature
-- =============================================================================
--
-- POURQUOI UNE TABLE À PART, ET NON UNE INSERTION DIRECTE DANS vendors
--   Ce formulaire est ouvert à tout le monde, sans compte. Y brancher la table
--   des ateliers reviendrait à laisser des inconnus écrire dans vos données
--   publiées. Ici, une candidature est un courrier posé dans une boîte : elle
--   n'existe pour personne d'autre que vous tant que vous ne l'avez pas
--   acceptée, et vous recopiez ce que vous voulez.
--
-- LE CONSENTEMENT EST LA RAISON D'ÊTRE DE CET ÉCRAN
--   Publier la fiche d'un créateur qui n'a rien demandé casse le produit : il
--   ne répondra pas sur WhatsApp, et le visiteur qui a cliqué se retrouve dans
--   le vide. La colonne « consentement » est donc obligatoire ET contrainte à
--   vrai : la base refuse une candidature sans accord explicite.
--
-- CE QUI RESTE OUVERT
--   N'importe qui peut déposer, donc n'importe qui peut déposer n'importe quoi.
--   C'est assumé : rien n'est publié sans votre validation, et une candidature
--   indésirable se supprime d'un clic. La rançon de l'ouverture est une boîte
--   à trier, pas un site abîmé.
-- =============================================================================

create table if not exists public.candidatures (
  id              uuid primary key default gen_random_uuid(),

  display_name    text not null check (length(trim(display_name)) between 2 and 80),
  contact_name    text check (contact_name is null or length(contact_name) <= 80),
  whatsapp_number text not null check (whatsapp_number ~ '^[0-9]{8,15}$'),
  city            text not null check (length(trim(city)) between 2 and 60),
  neighborhood    text check (neighborhood is null or length(neighborhood) <= 60),
  vendor_type     public.vendor_type not null default 'maker',

  tagline         text check (tagline is null or length(tagline) <= 160),
  description     text check (description is null or length(description) <= 2000),
  price_from_cfa  integer check (price_from_cfa is null or price_from_cfa between 0 and 100000000),
  catalog_url     text check (catalog_url is null or catalog_url ~* '^https?://.+'),
  instagram       text check (instagram is null or length(instagram) <= 60),

  -- Les chemins des photos déposées, dans le bucket atelier-images.
  photos          text[] not null default '{}' check (array_length(photos, 1) is null or array_length(photos, 1) <= 8),

  -- Sans accord explicite, pas de candidature. La contrainte le garantit au
  -- niveau de la base, pas seulement dans le formulaire.
  consentement    boolean not null check (consentement = true),

  statut          text not null default 'nouvelle'
                  check (statut in ('nouvelle', 'acceptee', 'refusee')),
  note_admin      text,
  vendor_id       uuid references public.vendors(id) on delete set null,

  created_at      timestamptz not null default now()
);

create index if not exists candidatures_statut_idx
  on public.candidatures (statut, created_at desc);

alter table public.candidatures enable row level security;

-- Dépôt ouvert à tous, y compris sans compte : c'est le principe même.
-- Le « with check » interdit de se déclarer déjà accepté.
create policy "depot de candidature ouvert" on public.candidatures
  for insert to anon, authenticated
  with check (consentement = true and statut = 'nouvelle' and vendor_id is null);

-- Lecture et gestion réservées aux administrateurs. Un candidat ne peut donc
-- pas relire les candidatures des autres — elles contiennent des numéros.
create policy "candidatures lues par les admins" on public.candidatures
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "candidatures gerees par les admins" on public.candidatures
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- Les photos des candidatures ---------------------------------------------
-- Elles vont dans le bucket des ateliers, mais sous un dossier « candidatures/ »
-- réservé. Ainsi, une fois la candidature acceptée, il n'y a aucun fichier à
-- déplacer : il suffit de créer les lignes qui pointent dessus.

create policy "depot de photos de candidature" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'atelier-images'
    and (storage.foldername(name))[1] = 'candidatures'
  );

-- Garde-fous sur le bucket : une image, et pas plus de 2 Mo. La compression
-- côté navigateur produit environ 150 Ko — cette limite ne gêne personne de
-- bonne foi, et empêche d'y déverser des vidéos.
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
 where id = 'atelier-images';

-- =============================================================================
--  VÉRIFICATION
-- =============================================================================
--
--  Une candidature sans consentement doit être refusée par la base :
--    insert into public.candidatures (display_name, whatsapp_number, city, consentement)
--    values ('Test', '22890000999', 'Lomé', false);
--    -- doit échouer sur la contrainte candidatures_consentement_check
--
--  La file d'attente :
--    select display_name, city, whatsapp_number, created_at
--      from public.candidatures where statut = 'nouvelle' order by created_at;
-- =============================================================================
