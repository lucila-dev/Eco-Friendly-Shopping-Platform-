DO $$
DECLARE
  target_email text := 'luula.forno@gmail.com';
  uid uuid;
  dup_count int;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = lower(trim(target_email)) LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user for email %.', target_email;
  END IF;

  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY user_id, created_at
        ORDER BY id
      ) AS rn
    FROM orders
    WHERE user_id = uid
  ),
  to_delete AS (
    SELECT id FROM ranked WHERE rn > 1
  )
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS dup_count = ROW_COUNT;

  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY user_id, created_at
        ORDER BY id
      ) AS rn
    FROM orders
    WHERE user_id = uid
  )
  DELETE FROM orders WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  RAISE NOTICE 'Removed duplicate orders (extra rows per identical created_at). Order lines deleted in first pass: %', dup_count;
END $$;
