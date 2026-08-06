-- =============================================================================
-- 0012 — L'atelier devient l'unité affichée   (PHASE 1)
-- =============================================================================
--
-- CE QUI CHANGE, ET POURQUOI
--   Jusqu'ici le site présentait des objets. La phase 1 présente des ateliers :
--   un nom de marque, une description, quelques photos, un prix de départ, et
--   un lien vers le catalogue.
--
--   La raison est pratique, pas esthétique. Demander vingt fiches produits à
--   un créateur — titre, prix, délai, photos pour chacune — c'est une heure de
--   travail par personne, et beaucoup renoncent. Lui demander son nom, trois
--   photos et un prix de départ prend cinq minutes. Le recrutement devient
--   possible à l'échelle du terrain.
--
-- CE QUI N'EST PAS DÉTRUIT
--   Les tables offers et offer_images restent intactes, avec leurs 22 lignes.
--   Un créateur qui a déjà ses objets saisis les garde : sa fiche renverra
--   vers eux. C'est le même principe que les services, présents dans le schéma
--   depuis le premier jour sans être affichés.
-- =============================================================================

-- --- Ce qu'un atelier expose désormais ---------------------------------------

alter table public.vendors
  add column if not exists price_from_cfa integer
    check (price_from_cfa is null or price_from_cfa >= 0),
  add column if not exists catalog_url text
    check (catalog_url is null or catalog_url ~* '^https?://.+');

comment on column public.vendors.price_from_cfa is
  'Prix de départ affiché « À partir de X FCFA ». NULL si le créateur préfère ne pas en donner.';

comment on column public.vendors.catalog_url is
  'Lien vers un catalogue existant : Instagram, catalogue WhatsApp Business, dossier de photos. '
  'NULL si le créateur n''en a pas — on montre alors ses offres saisies dans l''application.';

-- --- Les photos de l'atelier -------------------------------------------------
-- Table à part plutôt que colonnes photo_1, photo_2, photo_3 : le nombre de
-- photos varie d'un atelier à l'autre, et on ne veut pas d'une limite arbitraire
-- inscrite dans le schéma.

create table if not exists public.vendor_images (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendors(id) on delete cascade,
  storage_path text not null,
  alt_text     text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists vendor_images_vendor_idx
  on public.vendor_images (vendor_id, sort_order);

alter table public.vendor_images enable row level security;

-- Mêmes règles que pour les photos d'offres : visibles de tous, gérées par
-- l'administrateur et par le créateur propriétaire le jour où il aura un compte.
create policy "photos d'atelier visibles publiquement" on public.vendor_images
  for select using (true);

create policy "createur et admin gerent les photos d'atelier" on public.vendor_images
  for all using (
    vendor_id in (select id from public.vendors where user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin'))
  with check (
    vendor_id in (select id from public.vendors where user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin'));

-- --- Le stockage des photos d'atelier ----------------------------------------
-- Bucket distinct de « offer-images » : y ranger des photos de créateurs
-- rendrait le nom mensonger, et on vit longtemps avec ce genre de confusion.

insert into storage.buckets (id, name, public)
values ('atelier-images', 'atelier-images', true)
on conflict (id) do nothing;

create policy "photos d'atelier lisibles publiquement" on storage.objects
  for select using (bucket_id = 'atelier-images');

create policy "envoi de photos d'atelier reserve aux createurs et admins" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'atelier-images'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'vendor')));

create policy "suppression de photos d'atelier reservee aux admins" on storage.objects
  for delete to authenticated using (
    bucket_id = 'atelier-images' and public.has_role(auth.uid(), 'admin'));

-- --- Un nouvel événement à mesurer -------------------------------------------
-- Un visiteur qui part voir le catalogue Instagram d'un créateur sort de nos
-- statistiques : on ne saura jamais ce qu'il y fait. Au moins saura-t-on
-- combien partent, et vers quels ateliers.

-- Si cette ligne provoque une erreur du type « ALTER TYPE ... cannot run inside
-- a transaction block », exécutez-la SEULE dans une requête à part : certaines
-- versions de PostgreSQL refusent d'ajouter une valeur d'énumération au milieu
-- d'un script. Le reste du fichier aura déjà été appliqué.
alter type public.event_type add value if not exists 'catalog_click';
