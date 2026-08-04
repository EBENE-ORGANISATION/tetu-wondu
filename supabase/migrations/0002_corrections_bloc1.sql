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
