-- Add 100,000 loyalty credits to an account by email.
-- Run in Supabase Dashboard → SQL Editor (uses service role; bypasses RLS).
-- Requires a matching row in auth.users (user must have signed up at least once).

-- Set credits for this email (edit if needed):
-- luula.forno@gmail.com

INSERT INTO public.profiles (id, display_name, loyalty_credits)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  100000
FROM auth.users u
WHERE lower(trim(u.email)) = lower(trim('luula.forno@gmail.com'))
ON CONFLICT (id) DO UPDATE
SET loyalty_credits = EXCLUDED.loyalty_credits;

-- Expect: "UPDATE 0" / "INSERT 0" if no user with that email exists yet.
-- Confirm:
-- SELECT p.id, u.email, p.loyalty_credits
-- FROM public.profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE lower(trim(u.email)) = lower(trim('luula.forno@gmail.com'));
