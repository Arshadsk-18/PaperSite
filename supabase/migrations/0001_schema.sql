-- ==============================================================================
-- PaperSite: Database Schema Migration
-- File: 0001_schema.sql
-- Description: Core tables, foreign keys, triggers, indexes, and realtime config.
-- ==============================================================================

-- 1. Profiles Table (1 row per authenticated user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'te', 'hi')),
  created_at timestamptz not null default now()
);

-- 2. Projects Table (1 row per business site)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  business_type text not null check (length(trim(business_type)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  whatsapp_number text not null check (whatsapp_number ~ '^\+?[0-9]{7,15}$'),
  language text not null default 'en' check (language in ('en', 'te', 'hi')),
  is_published boolean not null default false,
  current_version_id uuid,
  address text,
  opening_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Versions Table (Saved history states of the sketch layout and generated HTML)
create table if not exists public.versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sketch_url text,
  layout_json jsonb,
  html text,
  prompt_text text,
  language text not null default 'en' check (language in ('en', 'te', 'hi')),
  created_at timestamptz not null default now()
);

-- Foreign key linking current_version_id to versions
alter table public.projects 
  drop constraint if exists fk_projects_current_version;

alter table public.projects
  add constraint fk_projects_current_version 
  foreign key (current_version_id) 
  references public.versions(id) 
  on delete set null;

-- 4. Published Sites Table (Publicly accessible copies of websites)
create table if not exists public.published_sites (
  project_id uuid primary key references public.projects(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  html text not null,
  business_name text not null,
  whatsapp_number text not null,
  language text not null default 'en' check (language in ('en', 'te', 'hi')),
  published_at timestamptz not null default now()
);

-- 5. Bookings Table (Customer appointments/inquiries)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  service text,
  preferred_time text,
  message text,
  status text not null default 'new' check (status in ('new', 'confirmed', 'done', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 6. Rate Limits Table (IP-based rate limiting counters for submit-booking)
create table if not exists public.rate_limits (
  ip text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (ip, window_start)
);

-- ==============================================================================
-- TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Trigger: Automatically create a profile when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: Update updated_at column on projects table
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_projects_updated on public.projects;
create trigger on_projects_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- ==============================================================================
-- INDEXES
-- ==============================================================================
create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_versions_project_id on public.versions(project_id);
create index if not exists idx_bookings_project_id on public.bookings(project_id);
create index if not exists idx_published_sites_slug on public.published_sites(slug);

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- ==============================================================================
-- Enable realtime publication for instant live booking updates in owner dashboard
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end $$;

-- ==============================================================================
-- ROLE PRIVILEGES
-- ==============================================================================
grant usage on schema public to anon, authenticated;
grant select on public.published_sites to anon;
grant select, insert, update, delete on public.profiles, public.projects, public.versions, public.bookings, public.published_sites to authenticated;

