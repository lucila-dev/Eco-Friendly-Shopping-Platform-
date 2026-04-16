-- =============================================================================
-- Inserts 14 completed orders for one user, dated from 1 Feb (current year)
-- through now(), with realistic line items and totals.
--
-- Run in Supabase SQL Editor (postgres role). User must already exist in auth.users.
--
-- Set target email below, then execute the whole script.
-- =============================================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_amount decimal(10,2) NOT NULL DEFAULT 0;

DO $$
DECLARE
  target_email text := 's4301285@lsbu.ac.uk';
  range_start timestamptz :=
    make_date(EXTRACT(YEAR FROM now())::int, 2, 1)::timestamp AT TIME ZONE 'UTC';
  uid uuid;
  p_id uuid;
  p_price numeric;
  p_carbon numeric;
  oid uuid;
  i int;
  li int;
  line_count int;
  qty int;
  subtotal numeric;
  ship numeric;
  created_ts timestamptz;
  product_ids uuid[];
  n_products int;
  n_orders constant int := 14;
  span interval;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = lower(trim(target_email)) LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user for email %. Sign up / log in once in the app first.', target_email;
  END IF;

  SELECT coalesce(array_agg(id), ARRAY[]::uuid[])
  INTO product_ids
  FROM (SELECT id FROM products ORDER BY random() LIMIT 120) q;

  n_products := coalesce(array_length(product_ids, 1), 0);
  IF n_products < 1 THEN
    RAISE EXCEPTION 'No products found. Run supabase/seed.sql (or your catalog) first.';
  END IF;

  span := greatest(now() - range_start, interval '1 day');

  FOR i IN 1..n_orders LOOP
    created_ts :=
      range_start
      + ((i - 1)::numeric / greatest(n_orders - 1, 1)) * span
      + (random() * interval '18 hours')
      + ((random() * 120)::int * interval '1 minute');

    IF created_ts > now() THEN
      created_ts := now() - (random() * interval '2 hours');
    END IF;

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
      'LSBU — London',
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

  RAISE NOTICE 'Inserted % orders for % (user_id=%).', n_orders, target_email, uid;
END $$;
