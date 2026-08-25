-- ARVIND REDDY / ANEKAL — SUPABASE SETUP
-- Run this entire script in Supabase SQL Editor.

create table if not exists public.site_profile (
  id bigint primary key generated always as identity,
  name text not null default 'Arvind Reddy',
  party text not null default 'BJP',
  constituency text not null default 'Anekal',
  tagline_en text,
  tagline_kn text,
  about_en text,
  about_kn text,
  updated_at timestamptz not null default now()
);

create table if not exists public.news (
  id bigint primary key generated always as identity,
  title_en text not null,
  title_kn text,
  body_en text,
  body_kn text,
  publish_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigint primary key generated always as identity,
  title_en text not null,
  title_kn text,
  event_date date,
  location_en text,
  location_kn text,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id bigint primary key generated always as identity,
  storage_path text not null,
  caption_en text,
  caption_kn text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_contact (
  id bigint primary key generated always as identity,
  phone text,
  email text,
  whatsapp text,
  office text,
  instagram text,
  facebook text,
  youtube text,
  updated_at timestamptz not null default now()
);

alter table public.site_profile enable row level security;
alter table public.news enable row level security;
alter table public.events enable row level security;
alter table public.gallery enable row level security;
alter table public.site_contact enable row level security;

-- Public read access.
create policy "public read profile" on public.site_profile for select using (true);
create policy "public read news" on public.news for select using (true);
create policy "public read events" on public.events for select using (true);
create policy "public read gallery" on public.gallery for select using (true);
create policy "public read contact" on public.site_contact for select using (true);

-- Admin writes: authenticated users only.
create policy "authenticated manage profile" on public.site_profile
for all to authenticated using (true) with check (true);
create policy "authenticated manage news" on public.news
for all to authenticated using (true) with check (true);
create policy "authenticated manage events" on public.events
for all to authenticated using (true) with check (true);
create policy "authenticated manage gallery" on public.gallery
for all to authenticated using (true) with check (true);
create policy "authenticated manage contact" on public.site_contact
for all to authenticated using (true) with check (true);

insert into public.site_profile (name, party, constituency, tagline_en, tagline_kn)
select 'Arvind Reddy','BJP','Anekal','With the people. For Anekal.','ಜನರೊಂದಿಗೆ. ಆನೇಕಲ್‌ಗಾಗಿ.'
where not exists (select 1 from public.site_profile);

insert into public.site_contact default values
where not exists (select 1 from public.site_contact);

-- Storage bucket for public website media.
insert into storage.buckets (id, name, public)
values ('site-media','site-media',true)
on conflict (id) do nothing;

create policy "public read site media" on storage.objects
for select using (bucket_id = 'site-media');

create policy "authenticated upload site media" on storage.objects
for insert to authenticated
with check (bucket_id = 'site-media');

create policy "authenticated update site media" on storage.objects
for update to authenticated
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');

create policy "authenticated delete site media" on storage.objects
for delete to authenticated
using (bucket_id = 'site-media');


-- ============================================================
-- 18. DOCUMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.documents (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title_en text NOT NULL,
    title_kn text,
    description_en text,
    description_kn text,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read documents" ON public.documents;
DROP POLICY IF EXISTS "authenticated manage documents" ON public.documents;

CREATE POLICY "public read documents"
ON public.documents
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "authenticated manage documents"
ON public.documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- ============================================================
-- 19. INITIATIVES / DEVELOPMENT WORK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.initiatives (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title_en text,
    title_kn text,
    category_en text,
    category_kn text,
    summary_en text,
    summary_kn text,
    body_en text,
    body_kn text,
    impact_en text,
    impact_kn text,
    initiative_date date,
    location_en text,
    location_kn text,
    image_paths text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT initiatives_title_required CHECK (coalesce(nullif(trim(title_en),''), nullif(trim(title_kn),'')) IS NOT NULL)
);

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "authenticated manage initiatives" ON public.initiatives;

CREATE POLICY "public read initiatives"
ON public.initiatives
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "authenticated manage initiatives"
ON public.initiatives
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
