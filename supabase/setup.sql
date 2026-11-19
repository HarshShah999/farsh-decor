-- =============================================================================
-- Farsh – The Decor Hub · catalogue database setup
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. It is safe to run more than once.
--
-- What it creates:
--   • admins       – the allow-list of people who may manage the catalogue
--   • categories   – product categories shown on the website
--   • products     – the product catalogue
--   • storage bucket "catalog" for category / product photos
--   • Row Level Security so that EVERYONE can read published items, but ONLY
--     people listed in `admins` can create, change or delete anything.
-- =============================================================================

-- ---------------------------------------------------------------- admins ----
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- A signed-in user may only see their own row (used to check "am I an admin?").
-- There are deliberately NO insert / update / delete policies: admins can only
-- be added from this SQL editor, never through the website or API.
drop policy if exists "Users can see their own admin row" on public.admins;
create policy "Users can see their own admin row" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- Helper used by every policy below. SECURITY DEFINER lets it read `admins`
-- regardless of the caller's own permissions.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ------------------------------------------------------- updated_at stamp ----
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------ categories ----
create table if not exists public.categories (
  id               text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  slug             text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name             text not null check (length(name) between 1 and 120),
  singular         text not null default '',
  tagline          text not null default '',
  description      text not null default '',
  image            text not null default '',
  visualizer_label text not null default '',
  -- where this category can be used in the visualizers:
  -- walls | floor | terrace | curtains | upholstery | cushions
  placements       text[] not null default '{}',
  sort_order       integer not null default 0,
  published        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------- products ----
create table if not exists public.products (
  id                  text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  category_id         text not null references public.categories (id) on update cascade on delete restrict,
  name                text not null check (length(name) between 1 and 160),
  collection          text not null default '',
  description         text not null default '',
  long_description    text not null default '',
  thumbnail           text,
  texture             jsonb not null,
  price               numeric check (price is null or price >= 0),
  unit                text not null default '',
  availability        text not null default 'in-stock' check (availability in ('in-stock', 'limited', 'on-order')),
  texture_scale       numeric not null default 1 check (texture_scale > 0),
  texture_repeat      jsonb not null default '[1, 1]',
  material_properties jsonb not null default '{"roughness": 0.8, "metalness": 0, "bumpScale": 0.6}',
  color_family        text not null default 'Neutral' check (color_family in ('Neutral', 'Warm', 'Cool', 'Green', 'Dark', 'Pattern')),
  tags                text[] not null default '{}',
  specs               jsonb not null default '[]', -- ordered list of {"label": "...", "value": "..."}
  featured            boolean not null default false,
  sort_order          integer not null default 0,
  published           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------ Row Level Security ----
alter table public.categories enable row level security;
alter table public.products   enable row level security;

grant select on public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant select on public.admins to authenticated;

drop policy if exists "Anyone can read published categories" on public.categories;
create policy "Anyone can read published categories" on public.categories
  for select using (published or public.is_admin());
drop policy if exists "Admins can add categories" on public.categories;
create policy "Admins can add categories" on public.categories
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can edit categories" on public.categories;
create policy "Admins can edit categories" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete categories" on public.categories;
create policy "Admins can delete categories" on public.categories
  for delete to authenticated using (public.is_admin());

drop policy if exists "Anyone can read published products" on public.products;
create policy "Anyone can read published products" on public.products
  for select using (published or public.is_admin());
drop policy if exists "Admins can add products" on public.products;
create policy "Admins can add products" on public.products
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can edit products" on public.products;
create policy "Admins can edit products" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products
  for delete to authenticated using (public.is_admin());

-- ------------------------------------------------------- photo storage ----
-- Public bucket: anyone can VIEW photos by URL; only admins can upload,
-- replace or delete them. Max 10 MB per file, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can list catalog photos" on storage.objects;
create policy "Admins can list catalog photos" on storage.objects
  for select to authenticated using (bucket_id = 'catalog' and public.is_admin());
drop policy if exists "Admins can upload catalog photos" on storage.objects;
create policy "Admins can upload catalog photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'catalog' and public.is_admin());
drop policy if exists "Admins can replace catalog photos" on storage.objects;
create policy "Admins can replace catalog photos" on storage.objects
  for update to authenticated using (bucket_id = 'catalog' and public.is_admin());
drop policy if exists "Admins can delete catalog photos" on storage.objects;
create policy "Admins can delete catalog photos" on storage.objects
  for delete to authenticated using (bucket_id = 'catalog' and public.is_admin());
