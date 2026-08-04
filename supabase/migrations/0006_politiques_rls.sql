-- =============================================================================
-- 0006 — Sécurité : RLS et colonnes protégées   (= « Bloc 4 »)
-- =============================================================================
--
-- Tout ce qui touche à la sécurité est réuni ici.
--
-- Deux écarts avec guide-miato-v2.md section 1.5, issus de la revue :
--
--   1. Les politiques UPDATE avaient un « using » sans « with check ».
--      « using » dit qui a le droit de toucher à la ligne ; « with check » dit
--      à quoi la ligne a le droit de ressembler APRÈS. Sans le second, la
--      vérification d'après-modification n'existe pas.
--
--   2. La revue proposait de retirer le droit de modifier is_verified via des
--      droits colonne par colonne. Écarté : dans Supabase, l'administrateur est
--      lui aussi un utilisateur « authenticated ». Ce correctif l'aurait empêché
--      de cocher « Vérifié » et de publier une offre depuis son back-office.
--      Remplacé par les déclencheurs de fin de fichier, qui distinguent
--      l'administrateur du créateur.
--
-- C'est dormant au lancement : les créateurs n'ont pas de compte, vendors.user_id
-- est NULL. Cela s'active le jour où un créateur réclame sa fiche.
-- =============================================================================

alter table public.profiles     enable row level security;
alter table public.user_roles   enable row level security;
alter table public.vendors      enable row level security;
alter table public.categories   enable row level security;
alter table public.offers       enable row level security;
alter table public.offer_images enable row level security;
alter table public.favorites    enable row level security;
alter table public.events       enable row level security;

-- --- PROFILES ----------------------------------------------------------------

create policy "profil visible par son propriétaire" on public.profiles
  for select using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

create policy "profil modifiable par son propriétaire" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);   -- interdit de réattribuer son profil à autrui

-- --- USER_ROLES --------------------------------------------------------------
-- Les rôles vivent ici et nulle part ailleurs. Aucune écriture depuis le client.

create policy "lecture de ses propres rôles" on public.user_roles
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "seuls les admins gèrent les rôles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- CATEGORIES --------------------------------------------------------------

create policy "catégories publiques" on public.categories
  for select using (true);

create policy "admins gèrent les catégories" on public.categories
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- VENDORS -----------------------------------------------------------------

create policy "créateurs actifs visibles publiquement" on public.vendors
  for select using (
    is_active = true or user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "créateur modifie sa fiche" on public.vendors
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());   -- interdit de céder sa fiche à un autre compte

create policy "admins gèrent les créateurs" on public.vendors
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- OFFERS ------------------------------------------------------------------

create policy "offres publiées visibles publiquement" on public.offers
  for select using (
    status = 'published'
    or public.has_role(auth.uid(), 'admin')
    or vendor_id in (select id from public.vendors where user_id = auth.uid()));

create policy "créateur gère ses offres" on public.offers
  for all using (vendor_id in (select id from public.vendors where user_id = auth.uid()))
  with check (vendor_id in (select id from public.vendors where user_id = auth.uid()));

create policy "admins gèrent toutes les offres" on public.offers
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- --- OFFER_IMAGES ------------------------------------------------------------

create policy "images visibles avec l'offre" on public.offer_images
  for select using (true);

create policy "créateur gère les images de ses offres" on public.offer_images
  for all using (
    offer_id in (
      select o.id from public.offers o
      join public.vendors v on v.id = o.vendor_id
      where v.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin'))
  with check (
    offer_id in (
      select o.id from public.offers o
      join public.vendors v on v.id = o.vendor_id
      where v.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin'));

-- --- FAVORITES ---------------------------------------------------------------

create policy "favoris privés" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- EVENTS ------------------------------------------------------------------
-- Tout le monde écrit (y compris les visiteurs anonymes), seuls les admins lisent.

create policy "écriture d'événement ouverte" on public.events
  for insert to anon, authenticated with check (true);

create policy "lecture des événements réservée aux admins" on public.events
  for select using (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- Colonnes réservées à l'administrateur
-- =============================================================================
--
-- Le badge « Vérifié » est le principal signal de confiance de la plateforme.
-- Le statut « publié » est ce qui court-circuite ou non la modération.
-- Ni l'un ni l'autre ne doit être auto-attribuable par un créateur.
--
-- Les règles RLS ne suffisent pas ici : elles ne savent pas comparer la valeur
-- d'avant et la valeur d'après. Un déclencheur, si.
--
-- Fonctionnement : si un créateur tente de modifier une colonne réservée, la
-- valeur d'origine est silencieusement remise. Pas d'erreur, pas d'écran cassé.
-- L'éditeur SQL de Supabase et les Edge Functions (expiration hebdomadaire des
-- fiches) ne sont pas concernés.

create or replace function public.protect_vendor_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Éditeur SQL (rôle postgres) et Edge Functions (rôle service_role) : libre.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  new.is_verified := old.is_verified;
  new.is_active   := old.is_active;
  new.slug        := old.slug;
  new.user_id     := old.user_id;
  return new;
end;
$$;

create trigger t_vendors_protect
  before update on public.vendors
  for each row execute function public.protect_vendor_columns();

create or replace function public.protect_offer_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  new.status    := old.status;
  new.slug      := old.slug;
  new.vendor_id := old.vendor_id;
  return new;
end;
$$;

create trigger t_offers_protect
  before update on public.offers
  for each row execute function public.protect_offer_columns();
