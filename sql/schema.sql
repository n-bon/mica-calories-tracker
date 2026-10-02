-- Mica — schéma Supabase
-- Script idempotent : peut être relancé sans erreur dans l'éditeur SQL Supabase.

-- ---------------------------------------------------------------------------
-- Table repas
-- ---------------------------------------------------------------------------

create table if not exists public.repas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type_repas  text check (type_repas in ('petit_dejeuner', 'dejeuner', 'collation', 'diner', 'boisson')),
  nom         text not null check (char_length(nom) between 1 and 100),
  pris_le     timestamptz not null,
  calories    numeric(7,1) not null check (calories >= 0),
  proteines   numeric(6,1) not null check (proteines >= 0),
  glucides    numeric(6,1) not null check (glucides >= 0),
  lipides     numeric(6,1) not null check (lipides >= 0),
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz
);

-- Sert au calendrier (plage de dates) et à la pagination de l'historique.
create index if not exists repas_user_id_pris_le_idx
  on public.repas (user_id, pris_le desc);

-- ---------------------------------------------------------------------------
-- Table objectifs
-- ---------------------------------------------------------------------------

create table if not exists public.objectifs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date_effet      date not null,
  mode            text not null default 'perte_masse_grasse',
  poids_actuel    numeric(5,1) not null check (poids_actuel > 0),
  poids_cible     numeric(5,1) not null check (poids_cible > 0),
  coef_calories   numeric(5,2) not null check (coef_calories > 0),
  coef_proteines  numeric(5,2) not null check (coef_proteines > 0),
  coef_glucides   numeric(5,2) not null check (coef_glucides > 0),
  coef_lipides    numeric(5,2) not null check (coef_lipides > 0),
  obj_calories    numeric(7,1) not null,
  obj_proteines   numeric(7,1) not null,
  obj_glucides    numeric(7,1) not null,
  obj_lipides     numeric(7,1) not null,
  cree_le         timestamptz not null default now(),
  -- Un enregistrement le même jour remplace la version du jour (upsert).
  -- L'index unique associé sert aussi à la recherche de la version en vigueur.
  constraint objectifs_user_id_date_effet_key unique (user_id, date_effet)
);

-- ---------------------------------------------------------------------------
-- Trigger modifie_le
-- ---------------------------------------------------------------------------

create or replace function public.maj_modifie_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.modifie_le = now();
  return new;
end;
$$;

drop trigger if exists repas_maj_modifie_le on public.repas;
create trigger repas_maj_modifie_le
  before update on public.repas
  for each row execute function public.maj_modifie_le();

-- ---------------------------------------------------------------------------
-- RLS : chaque utilisateur ne voit et ne modifie que ses propres lignes
-- ---------------------------------------------------------------------------

alter table public.repas enable row level security;

drop policy if exists "repas_select_own" on public.repas;
create policy "repas_select_own" on public.repas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "repas_insert_own" on public.repas;
create policy "repas_insert_own" on public.repas
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "repas_update_own" on public.repas;
create policy "repas_update_own" on public.repas
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "repas_delete_own" on public.repas;
create policy "repas_delete_own" on public.repas
  for delete to authenticated using (user_id = auth.uid());

alter table public.objectifs enable row level security;

drop policy if exists "objectifs_select_own" on public.objectifs;
create policy "objectifs_select_own" on public.objectifs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "objectifs_insert_own" on public.objectifs;
create policy "objectifs_insert_own" on public.objectifs
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "objectifs_update_own" on public.objectifs;
create policy "objectifs_update_own" on public.objectifs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "objectifs_delete_own" on public.objectifs;
create policy "objectifs_delete_own" on public.objectifs
  for delete to authenticated using (user_id = auth.uid());
