-- =============================================================================
-- Delete orders that have NO order_items for one user, then insert the SAME
-- number of new completed orders with real line items, dated across March.
--
-- Edit target_email and march_year, then run in Supabase SQL Editor (postgres).
-- Requires products in the catalog (seed.sql or your data).
-- =============================================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_amount decimal(10,2) NOT NULL DEFAULT 0;

DO $$
DECLARE
  target_email text := 'luula.forno@gmail.com';
  march_year int := 2026;
  uid uuid;
  n_deleted int;
  n_new int;
  i int;
  li int;
  p_id uuid;
  p_price numeric;
  p_carbon numeric;
  oid uuid;
  line_count int;
  qty int;
  subtotal numeric;
  ship numeric;
  created_ts timestamptz;
  product_ids uuid[];
  n_products int;
  day_of_month int;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = lower(trim(target_email)) LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user for email %. Sign up in the app first.', target_email;
  END IF;

  DELETE FROM orders o
  WHERE o.user_id = uid
    AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id);

  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  n_new := n_deleted;

  IF n_new < 1 THEN
    RAISE NOTICE 'No empty orders found for %. Nothing inserted.', target_email;
    RETURN;
  END IF;

  SELECT coalesce(array_agg(id), ARRAY[]::uuid[])
  INTO product_ids
  FROM (SELECT id FROM products ORDER BY random() LIMIT 120) q;

  n_products := coalesce(array_length(product_ids, 1), 0);
  IF n_products < 1 THEN
    RAISE EXCEPTION 'No products found. Run supabase/seed.sql (or your catalog) first.';
  END IF;

  FOR i IN 1..n_new LOOP
    IF n_new = 1 THEN
      day_of_month := 15;
    ELSE
      day_of_month := 1 + floor((i - 1) * 30.0 / (n_new - 1))::int;
    END IF;
    IF day_of_month > 31 THEN
      day_of_month := 31;
    END IF;

    created_ts :=
      make_timestamptz(
        march_year,
        3,
        day_of_month,
        (random() * 23)::int,
        (random() * 59)::int,
        (random() * 59)::numeric,
        'UTC'
      );

    INSERT INTO orders (
      user_id,
      status,
      total_amount,
      shipping_amount,
      shipping_name,
      shipping_address,
      shipping_email,
      created_at
    ) VALUES (
      uid,
      'completed',
      0,
      0,
      'EcoShop customer',
      '1 Sustainable Street',
      target_email,
      created_ts
    )
    RETURNING id INTO oid;

    line_count := 1 + (random() * 2)::int;
    subtotal := 0;

    FOR li IN 1..line_count LOOP
      p_id := product_ids[1 + (random() * (n_products - 1))::int];
      SELECT price, coalesce(carbon_footprint_saving_kg, 0)
      INTO p_price, p_carbon
      FROM products WHERE id = p_id;

      qty := 1 + (random() * 2)::int;
      INSERT INTO order_items (
        order_id,
        product_id,
        selected_size,
        quantity,
        price_at_order,
        carbon_saving_kg
      ) VALUES (
        oid,
        p_id,
        NULL,
        qty,
        p_price,
        round(coalesce(p_carbon, 0) * qty, 2)
      );
      subtotal := subtotal + round(p_price * qty, 2);
    END LOOP;

    ship := CASE WHEN subtotal >= 100 THEN 0::numeric ELSE 4.99::numeric END;

    UPDATE orders
    SET
      total_amount = round(subtotal + ship, 2),
      shipping_amount = ship
    WHERE id = oid;
  END LOOP;

  RAISE NOTICE 'Removed % empty orders; inserted % March % orders with line items for %.',
    n_deleted, n_new, march_year, target_email;
END $$;
