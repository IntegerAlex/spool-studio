begin;

-- Auth users (public.users rows are created via handle_new_user trigger)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ava.admin@contentops.com',
    crypt('ChangeMeAdmin123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ava Patel","role":"admin","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Ava"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'noah.designer@contentops.com',
    crypt('ChangeMeDesigner123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Noah Rivera","role":"designer","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Noah"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'mia.approver@contentops.com',
    crypt('ChangeMeApprover123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mia Chen","role":"approver","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Mia"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'leo.uploader@contentops.com',
    crypt('ChangeMeUploader123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Leo Foster","role":"uploader","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Leo"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider_id,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"ava.admin@contentops.com"}'::jsonb,
    'ava.admin@contentops.com',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"noah.designer@contentops.com"}'::jsonb,
    'noah.designer@contentops.com',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"mia.approver@contentops.com"}'::jsonb,
    'mia.approver@contentops.com',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    '{"sub":"44444444-4444-4444-4444-444444444444","email":"leo.uploader@contentops.com"}'::jsonb,
    'leo.uploader@contentops.com',
    'email',
    now(),
    now(),
    now()
  );

-- Clients
insert into public.clients (
  id,
  name,
  slug,
  instagram_handle,
  brand_color,
  monthly_reels_target,
  monthly_posts_target,
  created_by
)
values
  (
    '55555555-5555-5555-5555-555555555555',
    'Stellar Fitness',
    'stellar-fitness',
    '@stellarfitness',
    '#FF6B6B',
    12,
    8,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'Urban Cafe',
    'urban-cafe',
    '@urbancafelife',
    '#4ECDC4',
    8,
    6,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    'TechStart Hub',
    'techstart-hub',
    '@techstart_hub',
    '#6C5CE7',
    10,
    10,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '88888888-8888-8888-8888-888888888888',
    'Luxe Goods Co',
    'luxe-goods',
    '@luxegoods',
    '#FFD93D',
    6,
    12,
    '11111111-1111-1111-1111-111111111111'
  );

-- Content assets
insert into public.content_assets (
  id,
  client_id,
  title,
  type,
  status,
  drive_file_url,
  thumbnail_url,
  assigned_to,
  created_by,
  scheduled_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '55555555-5555-5555-5555-555555555555',
    'Summer Workout Challenge',
    'reel',
    'approved',
    'https://drive.google.com/file/d/stellar-reel-01',
    'https://images.example.com/stellar-reel-01.jpg',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '55555555-5555-5555-5555-555555555555',
    'New Membership Promo',
    'poster',
    'revision_requested',
    'https://drive.google.com/file/d/stellar-poster-02',
    'https://images.example.com/stellar-poster-02.jpg',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    null
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '66666666-6666-6666-6666-666666666666',
    'Espresso Spring Menu',
    'poster',
    'ready_for_review',
    'https://drive.google.com/file/d/urbancafe-poster-01',
    'https://images.example.com/urbancafe-poster-01.jpg',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    null
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '66666666-6666-6666-6666-666666666666',
    'Latte Art Reel',
    'reel',
    'scheduled',
    'https://drive.google.com/file/d/urbancafe-reel-02',
    'https://images.example.com/urbancafe-reel-02.jpg',
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    now() + interval '5 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '77777777-7777-7777-7777-777777777777',
    'Product Launch Teaser',
    'reel',
    'in_design',
    'https://drive.google.com/file/d/techstart-reel-01',
    'https://images.example.com/techstart-reel-01.jpg',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    null
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '77777777-7777-7777-7777-777777777777',
    'Founder Spotlight',
    'poster',
    'draft',
    'https://drive.google.com/file/d/techstart-poster-02',
    'https://images.example.com/techstart-poster-02.jpg',
    null,
    '22222222-2222-2222-2222-222222222222',
    null
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    '88888888-8888-8888-8888-888888888888',
    'Summer Collection Drop',
    'poster',
    'uploaded',
    'https://drive.google.com/file/d/luxegoods-poster-01',
    'https://images.example.com/luxegoods-poster-01.jpg',
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    null
  ),
  (
    '10101010-1010-1010-1010-101010101010',
    '88888888-8888-8888-8888-888888888888',
    'Behind the Atelier',
    'reel',
    'approved',
    'https://drive.google.com/file/d/luxegoods-reel-02',
    'https://images.example.com/luxegoods-reel-02.jpg',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    null
  );

commit;
