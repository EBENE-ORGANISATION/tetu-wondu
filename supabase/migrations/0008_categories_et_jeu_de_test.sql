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
