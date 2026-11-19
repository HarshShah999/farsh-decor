-- =============================================================================
-- Give a person access to the admin panel.
--
-- 1. First create their login: Supabase dashboard → Authentication → Users →
--    "Add user" → "Create new user" (tick "Auto Confirm User").
-- 2. Replace the email below with theirs, then run this in the SQL Editor.
-- =============================================================================
insert into public.admins (user_id, email)
select id, email from auth.users where lower(email) = lower('owner@example.com')
on conflict (user_id) do nothing;

-- Check who has access:
select email, created_at from public.admins order by created_at;

-- To REMOVE someone's admin access, run:
--   delete from public.admins where lower(email) = lower('person@example.com');
