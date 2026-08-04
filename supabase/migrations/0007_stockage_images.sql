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
