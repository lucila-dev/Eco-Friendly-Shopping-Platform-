DO $$
DECLARE
  target_email text := 'luula.forno@gmail.com';
  keep_n int := 12;
  uid uuid;
  removed int;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = lower(trim(target_email)) LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user for email %.', target_email;
  END IF;

  DELETE FROM order_items
  WHERE order_id IN (
    SELECT id
    FROM (
      SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
      FROM orders
      WHERE user_id = uid
    ) ranked
    WHERE rn > keep_n
  );

  DELETE FROM orders
  WHERE id IN (
    SELECT id
    FROM (
      SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
      FROM orders
      WHERE user_id = uid
    ) ranked
    WHERE rn > keep_n
  );

  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'Trimmed orders for %; rows removed beyond newest %.', target_email, keep_n;
END $$;
