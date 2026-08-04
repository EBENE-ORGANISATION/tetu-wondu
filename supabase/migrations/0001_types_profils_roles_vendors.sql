-- =============================================================================
-- 0001 — Types, profils, rôles, créateurs
-- =============================================================================
--
--   ⚠️  CE FICHIER A DÉJÀ ÉTÉ EXÉCUTÉ dans Supabase. NE PAS LE REJOUER.
--
-- Il est ici uniquement pour que la base soit reconstructible à l'identique
-- (nouveau projet Supabase, environnement de test, restauration).
-- Le rejouer sur la base actuelle produirait des erreurs « type already exists »
-- et « relation already exists » — sans dégât, mais sans intérêt.
--
-- Correspond au « Bloc 1 » de guide-miato-v2.md, section 1.1.
-- =============================================================================

create extension if not exists "pgcrypto";

create type public.app_role     as enum ('visitor', 'vendor', 'admin');
create type public.vendor_type  as enum ('maker', 'transformer', 'creator', 'service');
create type public.offer_type   as enum ('product', 'service');
create type public.offer_status  as enum ('draft', 'pending', 'published', 'archived');
create type public.price_mode   as enum ('fixed', 'from', 'quote');

-- PROFILES : un enregistrement par compte utilisateur.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  city       text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- USER_ROLES : séparé de profiles, pour qu'un utilisateur ne puisse jamais
-- se promouvoir administrateur en modifiant son propre profil.
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- SECURITY DEFINER : la fonction s'exécute avec les droits de son créateur.
-- Sans cela, l'appeler depuis une politique RLS sur user_roles provoquerait
-- une récursion infinie (la politique appelle la fonction qui lit la table
-- protégée par la politique).
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

-- VENDORS : le créateur, entité centrale du projet.
-- user_id est NULLABLE : au lancement les créateurs n'ont pas de compte,
-- leur fiche est saisie par l'administrateur et sera rattachée plus tard.
create table public.vendors (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  slug              text not null unique,
  display_name      text not null,
  vendor_type       public.vendor_type not null default 'maker',
  contact_name      text,
  whatsapp_number   text not null,
  phone             text,
  instagram_handle  text,
  city              text not null,
  neighborhood      text,
  service_areas     text[],
  tagline           text,
  bio               text,
  story             text,
  logo_url          text,
  cover_url         text,
  accepts_custom    boolean not null default false,
  is_verified       boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index vendors_city_idx   on public.vendors (city);
create index vendors_active_idx on public.vendors (is_active);
create index vendors_type_idx   on public.vendors (vendor_type);
