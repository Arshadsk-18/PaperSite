-- ==============================================================================
-- PaperSite: Seed Data
-- File: seed.sql
-- Description: Demo project ("Brew Bay Café") and 3 sample customer bookings.
-- All records are clearly marked as demo data.
-- ==============================================================================

do $$
declare
  demo_user_id uuid := '00000000-0000-0000-0000-000000000001';
  demo_project_id uuid := '11111111-1111-1111-1111-111111111111';
  demo_version_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  -- 1. Create Demo User in auth.users if not present
  if not exists (select 1 from auth.users where id = demo_user_id) then
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) values (
      demo_user_id,
      '00000000-0000-0000-0000-000000000000',
      'demo.owner@papersite.test',
      '',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Brew Bay Owner","preferred_language":"en"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  end if;

  -- 2. Upsert Demo Profile
  insert into public.profiles (id, full_name, preferred_language)
  values (demo_user_id, 'Brew Bay Owner [DEMO]', 'en')
  on conflict (id) do update set
    full_name = excluded.full_name;

  -- 3. Upsert Demo Project ("Brew Bay Café")
  insert into public.projects (
    id,
    owner_id,
    business_name,
    business_type,
    slug,
    whatsapp_number,
    language,
    is_published,
    address,
    opening_hours
  ) values (
    demo_project_id,
    demo_user_id,
    'Brew Bay Café',
    'cafe',
    'brew-bay',
    '+919876543210',
    'en',
    true,
    'Shop 4, Promenade Walk, Bandra West, Mumbai 400050',
    '[
      {"day": "Monday", "open": "08:00 AM", "close": "09:00 PM"},
      {"day": "Tuesday", "open": "08:00 AM", "close": "09:00 PM"},
      {"day": "Wednesday", "open": "08:00 AM", "close": "09:00 PM"},
      {"day": "Thursday", "open": "08:00 AM", "close": "09:00 PM"},
      {"day": "Friday", "open": "08:00 AM", "close": "10:00 PM"},
      {"day": "Saturday", "open": "09:00 AM", "close": "10:00 PM"},
      {"day": "Sunday", "open": "09:00 AM", "close": "08:00 PM"}
    ]'::jsonb
  )
  on conflict (id) do update set
    business_name = excluded.business_name,
    is_published = excluded.is_published;

  -- 4. Create Initial Version
  insert into public.versions (
    id,
    project_id,
    sketch_url,
    layout_json,
    html,
    prompt_text,
    language
  ) values (
    demo_version_id,
    demo_project_id,
    null,
    '{
      "theme": {
        "primaryColor": "#b45309",
        "font": "Inter",
        "businessName": "Brew Bay Café"
      },
      "sections": [
        {
          "id": "hero",
          "type": "hero",
          "title": "Brew Bay Café",
          "subtitle": "Artisanal Coffee & Freshly Baked Sourdough Pastries in Bandra",
          "content": "Crafted with passion using single-origin beans."
        },
        {
          "id": "services",
          "type": "services",
          "title": "Popular Brews",
          "items": [
            {"title": "Signature Cold Brew", "description": "Steeped for 18 hours with notes of dark chocolate", "price": "₹220"},
            {"title": "Classic Flat White", "description": "Velvety micro-foamed milk over double ristretto", "price": "₹190"},
            {"title": "Almond Croissant", "description": "Twice baked with almond frangipane filling", "price": "₹160"}
          ]
        },
        {
          "id": "booking",
          "type": "booking",
          "title": "Reserve a Table",
          "subtitle": "Book ahead for cozy corners & weekend brunch"
        }
      ]
    }'::jsonb,
    '<!-- [DEMO] Pre-rendered HTML for Brew Bay Cafe -->',
    'Create an artisanal cafe landing page with menu items and booking',
    'en'
  )
  on conflict (id) do nothing;

  -- Link current_version_id on demo project
  update public.projects set current_version_id = demo_version_id where id = demo_project_id;

  -- 5. Upsert Published Site for brew-bay
  insert into public.published_sites (
    project_id,
    slug,
    html,
    business_name,
    whatsapp_number,
    language
  ) values (
    demo_project_id,
    'brew-bay',
    '<!-- [DEMO] Published static site for brew-bay -->',
    'Brew Bay Café',
    '+919876543210',
    'en'
  )
  on conflict (project_id) do update set
    business_name = excluded.business_name;

  -- 6. Insert 3 Sample Bookings (Clearly marked demo data)
  insert into public.bookings (
    id,
    project_id,
    customer_name,
    phone,
    service,
    preferred_time,
    message,
    status
  ) values 
  (
    '33333333-3333-3333-3333-333333333301',
    demo_project_id,
    'Aarav Sharma [DEMO]',
    '+919876543210',
    'Reserved Table for 4',
    'Tomorrow 6:00 PM',
    '[DEMO DATA] Window seating preferred if available',
    'confirmed'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    demo_project_id,
    'Priya Patel [DEMO]',
    '+919876543211',
    'Brew Tasting Session',
    'Saturday 4:00 PM',
    '[DEMO DATA] Bringing two friends for the roast tour',
    'new'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    demo_project_id,
    'Rahul Verma [DEMO]',
    '+919876543212',
    'Cold Brew Growler Pickup',
    'Today 5:30 PM',
    '[DEMO DATA] Hazelnut cold brew roast',
    'done'
  )
  on conflict (id) do nothing;

end $$;
