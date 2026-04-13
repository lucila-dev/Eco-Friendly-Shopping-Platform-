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
