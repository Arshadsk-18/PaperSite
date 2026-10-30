-- ==============================================================================
-- PaperSite: Row Level Security (RLS) Policies [HEART FILE: < 35 lines of code]
-- File: 0002_policies.sql
-- Description: Strict owner-isolation and public publication rules.
-- ==============================================================================

-- 1. Reset existing public policies and enable RLS on every table
do $$ begin
  execute (select coalesce(string_agg('drop policy if exists ' || quote_ident(policyname) || ' on ' || quote_ident(tablename) || ';', ' '), '') from pg_policies where schemaname = 'public');
end $$;

alter table profiles enable row level security;
alter table projects enable row level security;
alter table versions enable row level security;
alter table published_sites enable row level security;
alter table bookings enable row level security;
alter table rate_limits enable row level security;

-- 2. Profiles: Users can only select and update their own profile row
create policy "profiles_manage_own" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- 3. Projects: Business owners have full read/write access to their own projects
create policy "projects_owner_all" on projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 4. Versions: Business owners have full read/write access to versions of their projects
create policy "versions_owner_all" on versions for all 
  using (exists (select 1 from projects where id = project_id and owner_id = auth.uid()))
  with check (exists (select 1 from projects where id = project_id and owner_id = auth.uid()));

-- 5. Bookings: Owners can view and update booking statuses. No anonymous or direct inserts.
create policy "bookings_owner_select" on bookings for select using (exists (select 1 from projects where id = project_id and owner_id = auth.uid()));
create policy "bookings_owner_update" on bookings for update using (exists (select 1 from projects where id = project_id and owner_id = auth.uid()));
create policy "bookings_owner_delete" on bookings for delete using (exists (select 1 from projects where id = project_id and owner_id = auth.uid()));

-- 6. Published Sites: Public read access for customers; owners can insert, update, or unpublish
create policy "published_sites_public_read" on published_sites for select using (true);
create policy "published_sites_owner_write" on published_sites for all 
  using (exists (select 1 from projects where id = project_id and owner_id = auth.uid()))
  with check (exists (select 1 from projects where id = project_id and owner_id = auth.uid()));

-- 7. Rate Limits: RLS is enabled with zero policies so only the backend service role can access it.

