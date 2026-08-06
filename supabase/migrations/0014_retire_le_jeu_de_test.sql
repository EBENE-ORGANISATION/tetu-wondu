-- =============================================================================
-- 0014 — Retirer le jeu de données fictives   ⚠️ IRRÉVERSIBLE
-- =============================================================================
--
-- CE QUE CE FICHIER DÉTRUIT
--   Les 8 créateurs inventés du fichier 0008, et leurs 20 offres. Leurs
--   numéros WhatsApp (22890000001 à 22890000008) n'existent pas : tant qu'ils
--   sont en ligne, un visiteur qui clique tombe dans le vide, et le site n'est
--   montrable à personne.
--
--   Aucune photo n'y est attachée — vérifié avant écriture. Il ne restera donc
--   aucun fichier orphelin dans le stockage.
--
-- CE QUI N'EST PAS TOUCHÉ
--   Vos vrais ateliers et leurs photos. La liste de suppression est nominative :
--   elle ne peut atteindre qu'un créateur dont l'identifiant figure ci-dessous.
--
-- CE QUI ARRIVE AUX STATISTIQUES
--   Les événements déjà enregistrés survivent : la colonne pointant vers le
--   créateur passe simplement à vide (« on delete set null »). Vos totaux ne
--   bougent pas, mais ces vues ne seront plus rattachées à un atelier — ce qui
--   est correct, puisqu'il n'existe plus.
--
-- REJOUABLE
--   Sur une base reconstruite depuis zéro, ce fichier annule proprement le jeu
--   de test inséré par 0008. Pour garder les données de démonstration lors
--   d'une reconstruction, il suffit de ne pas exécuter ce fichier.
-- =============================================================================

delete from public.vendors
 where slug in (
   'karite-kara',
   'vergers-kloto',
   'atelier-notse',
   'perles-dahoue',
   'flok-228',
   'terre-bassar',
   'glaces-akwaba',
   'atelier-zogbe'
 );

-- L'événement de test créé le 3 août pour vérifier que l'écriture dans events
-- fonctionnait. Il n'a rien à faire dans vos chiffres.
delete from public.events where session_id = 'TEST-BRANCHEMENT';

-- =============================================================================
--  VÉRIFICATION — à exécuter juste après
-- =============================================================================
--
--  Ce qui reste, avec ses photos :
--    select v.display_name, v.city, v.whatsapp_number,
--           (select count(*) from public.vendor_images i where i.vendor_id = v.id) as photos,
--           (select count(*) from public.offers o where o.vendor_id = v.id) as offres
--      from public.vendors v
--     order by v.display_name;
--
--  Aucun faux numéro ne doit subsister :
--    select count(*) from public.vendors where whatsapp_number like '2289000000%';
--    -- doit renvoyer 0
-- =============================================================================
