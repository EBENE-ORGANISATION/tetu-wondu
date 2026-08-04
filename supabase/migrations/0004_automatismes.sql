-- =============================================================================
-- 0004 — Automatismes
-- =============================================================================
--
-- Correspond à guide-miato-v2.md section 1.4 — qui ne figurait dans AUCUN des
-- six blocs listés dans CLAUDE.md. Sans ce fichier, updated_at ne bouge jamais
-- et l'inscription d'un nouvel utilisateur ne crée ni profil ni rôle.
--
-- S'y ajoute l'entretien automatique de vendor_display_name (voir 0003).
-- =============================================================================

-- --- Horodatage des modifications -------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger t_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger t_vendors_touch  before update on public.vendors
  for each row execute function public.touch_updated_at();
create trigger t_offers_touch   before update on public.offers
  for each row execute function public.touch_updated_at();

-- --- Création du profil et du rôle à l'inscription ---------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.user_roles (user_id, role) values (new.id, 'visitor');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Recopie du nom du créateur dans offers ----------------------------------
-- Permet la recherche « par créateur » depuis l'accueil (voir 0003).

-- Cas 1 : une offre est créée, ou change de créateur.
create or replace function public.sync_offer_vendor_name()
returns trigger language plpgsql set search_path = public as $$
begin
  select display_name into new.vendor_display_name
  from public.vendors where id = new.vendor_id;
  return new;
end;
$$;

create trigger t_offers_sync_vendor_name
  before insert or update of vendor_id on public.offers
  for each row execute function public.sync_offer_vendor_name();

-- Cas 2 : un créateur est renommé — toutes ses offres suivent.
create or replace function public.propagate_vendor_name()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.offers
     set vendor_display_name = new.display_name
   where vendor_id = new.id
     and vendor_display_name is distinct from new.display_name;
  return null;
end;
$$;

create trigger t_vendors_propagate_name
  after update of display_name on public.vendors
  for each row
  when (old.display_name is distinct from new.display_name)
  execute function public.propagate_vendor_name();
