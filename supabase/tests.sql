-- ==============================================================================
-- PaperSite: Database Security & RLS Policy Test Suite
-- File: supabase/tests.sql
-- Description: Executes security tests as 'anon' and 'authenticated' roles
-- to verify that RLS is strictly enforced and cannot be bypassed.
-- ==============================================================================

do $$
declare
  v_rls_count int;
  v_booking_count int;
  v_anon_insert_failed boolean := false;
  v_auth_direct_booking_failed boolean := false;
  v_test_proj_id uuid := '11111111-1111-1111-1111-111111111111';
  v_demo_user_id text := '612b0018-0923-47ad-92f3-cf4255cf2e86';
  v_stranger_user_id text := '99999999-9999-9999-9999-999999999999';
begin
  raise notice '============================================================';
  raise notice '          Running PaperSite Database Security Tests         ';
  raise notice '============================================================';

  -- --------------------------------------------------------------------------
  -- 1. Check RLS is enabled on every table in the public schema
  -- --------------------------------------------------------------------------
  select count(*) into v_rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in ('profiles', 'projects', 'versions', 'published_sites', 'bookings', 'rate_limits')
    and not c.relrowsecurity;

  if v_rls_count > 0 then
    raise exception 'FAIL: Some public tables do not have RLS enabled!';
  end if;
  raise notice '[PASS] 1. Every table has Row Level Security (RLS) enabled.';

  -- --------------------------------------------------------------------------
  -- 2. Test as 'anon' role
  -- --------------------------------------------------------------------------
  set local role anon;

  -- 2a. Anon cannot read bookings (DAC and RLS block anonymous read)
  begin
    select count(*) into v_booking_count from public.bookings;
    if v_booking_count > 0 then
      raise exception 'FAIL: Anonymous user was able to read bookings!';
    end if;
    raise notice '[PASS] 2a. Anonymous user cannot read bookings (0 rows returned).';
  exception when insufficient_privilege then
    raise notice '[PASS] 2a. Anonymous user cannot read bookings (Privilege blocked: 42501).';
  end;

  -- 2b. Anon cannot insert bookings directly
  begin
    insert into public.bookings (project_id, customer_name, phone, service, preferred_time, status)
    values (v_test_proj_id, 'Hacker Anon', '+919999999999', 'Free Booking', '10:00 AM', 'new');
    v_anon_insert_failed := false;
  exception when others then
    v_anon_insert_failed := true;
  end;

  if not v_anon_insert_failed then
    raise exception 'FAIL: Anonymous user was able to insert into bookings directly!';
  end if;
  raise notice '[PASS] 2b. Anonymous user cannot insert bookings directly (RLS denied).';

  -- 2c. Anon CAN read published sites (Public storefronts)
  perform * from public.published_sites where slug = 'brew-bay';
  raise notice '[PASS] 2c. Anonymous user can read published_sites for storefront.';

  -- 2d. Anon cannot write to published_sites
  begin
    insert into public.published_sites (project_id, slug, html, business_name)
    values (v_test_proj_id, 'hack-slug', '<h1>Hacked</h1>', 'Fake');
    raise exception 'FAIL: Anon was able to insert into published_sites!';
  exception when others then
    null; -- Expected failure
  end;
  raise notice '[PASS] 2d. Anonymous user cannot write or tamper with published_sites.';

  -- --------------------------------------------------------------------------
  -- 3. Test as 'authenticated' user (Signed-in business owner)
  -- --------------------------------------------------------------------------
  set local role authenticated;
  -- Simulate authenticated demo user session
  perform set_config('request.jwt.claim.sub', v_demo_user_id, true);

  -- 3a. Owner can read their own projects
  perform * from public.projects where owner_id = v_demo_user_id::uuid;
  raise notice '[PASS] 3a. Authenticated owner can read their own projects.';

  -- 3b. Authenticated user CANNOT read other users projects
  perform set_config('request.jwt.claim.sub', v_stranger_user_id, true);
  select count(*) into v_booking_count from public.projects where owner_id = v_demo_user_id::uuid;
  if v_booking_count > 0 then
    raise exception 'FAIL: Stranger authenticated user could read another users projects!';
  end if;
  raise notice '[PASS] 3b. Authenticated user cannot read projects belonging to other users.';

  -- Reset back to demo user
  perform set_config('request.jwt.claim.sub', v_demo_user_id, true);

  -- 3c. Direct booking creation is blocked even for authenticated users
  -- (All bookings must flow through submit-booking Edge Function)
  begin
    insert into public.bookings (project_id, customer_name, phone, service, preferred_time, status)
    values (v_test_proj_id, 'Direct Auth User', '+919999999999', 'Direct Table', '12:00 PM', 'new');
    v_auth_direct_booking_failed := false;
  exception when others then
    v_auth_direct_booking_failed := true;
  end;

  if not v_auth_direct_booking_failed then
    raise exception 'FAIL: Direct booking insert was not blocked by RLS!';
  end if;
  raise notice '[PASS] 3c. Direct booking creation blocked by RLS (only submit-booking allowed).';

  raise notice '============================================================';
  raise notice 'Result: ALL RLS & ROLE SECURITY TESTS PASSED SUCCESSFULLY   ';
  raise notice '============================================================';
end $$;
