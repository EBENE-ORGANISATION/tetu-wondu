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
