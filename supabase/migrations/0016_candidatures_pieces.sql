-- =============================================================================
-- 0016 — La candidature récolte aussi de quoi ouvrir la phase 2
-- =============================================================================
--
-- CE QUI MANQUAIT
--   Le formulaire de candidature ne collectait que l'atelier. Ouvrir la phase 2
--   — l'annuaire par objet — aurait obligé à recontacter chaque créateur pour
--   lui redemander ses pièces une par une.
--
-- LE COMPROMIS, ET POURQUOI IL COMPTE
--   Demander vingt fiches produits à l'inscription, c'est une heure de travail
--   et la moitié des candidats qui abandonnent en route. La section « pièces »
--   est donc FACULTATIVE et vient après l'essentiel : celui qui veut aller vite
--   s'arrête avant, celui qui a le temps remplit et sa fiche sera prête le jour
--   où la phase 2 ouvrira.
--
-- POURQUOI DU JSON PLUTÔT QU'UNE TABLE
--   Une pièce de candidature n'est pas encore une offre : elle n'a ni
--   identifiant d'adresse, ni statut, ni créateur rattaché, et elle peut être
--   refusée en bloc avec la candidature. Lui donner sa propre table
--   obligerait à gérer ce cycle de vie deux fois. Elle devient une vraie ligne
--   dans « offers » au moment de l'acceptation, pas avant.
-- =============================================================================

alter table public.candidatures
  add column if not exists phone text
    check (phone is null or phone ~ '^[0-9]{8,15}$'),
  add column if not exists accepts_custom boolean not null default false,
  add column if not exists pieces jsonb not null default '[]'::jsonb;

-- Garde-fous sur les pièces : un tableau, dix éléments au plus, et une taille
-- bornée. Le formulaire est ouvert à tous — sans limite, cette colonne est une
-- invitation à déverser n'importe quoi.
alter table public.candidatures
  drop constraint if exists candidatures_pieces_valides;

alter table public.candidatures
  add constraint candidatures_pieces_valides check (
    jsonb_typeof(pieces) = 'array'
    and jsonb_array_length(pieces) <= 10
    and length(pieces::text) <= 20000
  );

comment on column public.candidatures.pieces is
  'Pièces proposées par le créateur, en attente de devenir des lignes de « offers ». '
  'Chaque élément : titre, description, price_mode, price_cfa, unit, sur_commande, '
  'delai_jours, personnalisable, categorie_slug, photos[].';

-- --- Les photos des pièces ---------------------------------------------------
-- Elles vont dans le bucket des offres, sous un dossier « candidatures/ »
-- réservé — exactement comme les photos d'atelier (migration 0015). Une fois la
-- candidature acceptée, aucun fichier n'est à déplacer : il suffit de créer les
-- lignes qui pointent dessus.

create policy "depot de photos de piece candidate" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'offer-images'
    and (storage.foldername(name))[1] = 'candidatures'
  );

update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
 where id = 'offer-images';

-- =============================================================================
--  VÉRIFICATION
-- =============================================================================
--
--  Une candidature avec onze pièces doit être refusée :
--    select jsonb_array_length('[1,2,3,4,5,6,7,8,9,10,11]'::jsonb) <= 10;  -- false
--
--  Les candidatures qui apportent déjà des pièces :
--    select display_name, jsonb_array_length(pieces) as nb_pieces
--      from public.candidatures where jsonb_array_length(pieces) > 0;
-- =============================================================================
