-- =============================================================================
--  TETU WONDU — CONTRÔLE DE LA BASE
-- =============================================================================
--
--  À exécuter dans Supabase -> SQL Editor -> New query -> Run.
--  Ne modifie rien : ne fait que lire et compter.
--
--  Résultat attendu : 12 lignes, toutes en « OK ».
--  Toute ligne marquée « >>> A VERIFIER <<< » doit être signalée.
--
-- =============================================================================

select
  v.ordre,
  v.libelle,
  v.attendu,
  v.obtenu,
  case when v.obtenu = v.attendu then 'OK' else '>>> A VERIFIER <<<' end as verdict
from (

  select 1 as ordre,
         'Offres dans le catalogue' as libelle,
         '20' as attendu,
         (select count(*)::text from public.offers) as obtenu

  union all select 2,
         'Createurs',
         '8',
         (select count(*)::text from public.vendors)

  union all select 3,
         'Categories (8 produits + 5 services)',
         '13',
         (select count(*)::text from public.categories)

  -- Si ce n'est pas 20, le declencheur du fichier 0004 n'est pas passe,
  -- et la recherche par createur ne fonctionnera pas.
  union all select 4,
         'Nom du createur recopie dans les offres',
         '20',
         (select count(*)::text from public.offers where vendor_display_name is not null)

  -- Les deux offres « sur devis » doivent avoir un prix VIDE, pas zero.
  -- C'est ce qui fera afficher « Sur devis » au lieu de « 0 FCFA ».
  union all select 5,
         'Offres sur devis, sans prix',
         '2',
         (select count(*)::text from public.offers
           where price_mode = 'quote' and price_cfa is null)

  union all select 6,
         'Offres fabriquees a la commande',
         '6',
         (select count(*)::text from public.offers where is_made_to_order)

  -- « Flok » n'apparait dans AUCUN titre d'offre : uniquement dans le nom du
  -- createur. Si cette ligne renvoie « oui », la recherche par createur marche.
  union all select 7,
         'Recherche par nom de createur',
         'oui',
         (select case when exists (
            select 1 from public.offers
             where search_vector @@ plainto_tsquery('french', 'flok')
          ) then 'oui' else 'non' end)

  -- « kpalime » sans accent doit trouver « Kpalimé ». C'est le controle de la
  -- migration 0009 : si cette ligne repasse a « non », le desaccentuage a saute.
  union all select 8,
         'Recherche sans accent (kpalime -> Kpalime)',
         'oui',
         (select case when exists (
            select 1 from public.offers
             where search_vector @@ plainto_tsquery('french', 'kpalime')
          ) then 'oui' else 'non' end)

  union all select 9,
         'Tables protegees par RLS',
         '8',
         (select count(*)::text from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity)

  -- Sans cela, n'importe qui disposant de la cle publique lirait les
  -- statistiques de tous les createurs.
  --
  -- ATTENTION au piege : PostgreSQL enregistre la valeur TELLE QU'ECRITE dans
  -- le CREATE VIEW. « security_invoker = on » est stocke « on », pas « true ».
  -- Comparer la chaine « security_invoker=true » donne un faux negatif.
  -- On lit donc la valeur par pg_options_to_table, et on accepte les quatre
  -- ecritures possibles du vrai.
  union all select 10,
         'Vue offer_stats en security_invoker',
         'oui',
         (select case when lower(coalesce((
            select o.option_value
              from pg_class c,
                   lateral pg_options_to_table(c.reloptions) o
             where c.relname = 'offer_stats'
               and o.option_name = 'security_invoker'
          ), '')) in ('on', 'true', '1', 'yes') then 'oui' else 'non' end)

  -- 3 sur offers, 3 sur vendors.
  union all select 11,
         'Declencheurs actifs sur offers et vendors',
         '6',
         (select count(*)::text from pg_trigger
           where not tgisinternal
             and tgrelid in ('public.offers'::regclass, 'public.vendors'::regclass))

  union all select 12,
         'Bucket offer-images',
         '1',
         (select count(*)::text from storage.buckets where id = 'offer-images')

) v
order by v.ordre;

-- =============================================================================
--  LA RECHERCHE SANS ACCENTS — CORRIGE LE 4 AOUT 2026 (migration 0009)
-- =============================================================================
--
--  « kpalime » trouve desormais « Kpalimé », « karite » trouve « Karité ».
--  Sur un clavier Android d'entree de gamme, personne ne tape les accents :
--  sans ce correctif, la majorite des recherches echouaient en silence et le
--  visiteur en concluait que le catalogue etait vide.
--
--  ATTENTION, LE CORRECTIF A DEUX MOITIES QUI VONT ENSEMBLE :
--    - cote base   : migration 0009 (extension unaccent + f_unaccent)
--    - cote code   : src/hooks/useRecherche.ts, fonction sansAccents()
--  Modifier l'une sans l'autre casse la recherche. Le controle numero 8
--  ci-dessus surveille la moitie « base ».
-- =============================================================================
