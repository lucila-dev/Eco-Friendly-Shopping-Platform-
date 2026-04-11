-- Wipe EVERY order (all users), then insert fresh sample orders for ONE account.
-- Run in Supabase Dashboard → SQL Editor as postgres (bypasses RLS).
--
-- 1) Set target_email to the account that should get the new orders.
-- 2) Run the entire script once.
--
-- WARNING: TRUNCATE removes all rows from orders and order_items for the whole project.

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_amount decimal(10,2) NOT NULL DEFAULT 0;

TRUNCATE TABLE order_items, orders CASCADE;

DO $$
DECLARE
  target_email text := 'luula.forno@gmail.com';
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
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = lower(trim(target_email)) LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user for email %. Sign up in the app first.', target_email;
  END IF;

  SELECT coalesce(array_agg(id), ARRAY[]::uuid[])
  INTO product_ids
  FROM (SELECT id FROM products ORDER BY random() LIMIT 120) q;

  n_products := coalesce(array_length(product_ids, 1), 0);
  IF n_products < 1 THEN
    RAISE EXCEPTION 'No products found. Run supabase/seed.sql (or your catalog) first.';
  END IF;

  /*12 orders over ~90 days — enough for demos without crowding the daily CO₂ chart */
  FOR i IN 1..12 LOOP
    created_ts :=
      now()
      - (((i - 1)::numeric / 11.0) * interval '90 days')
      - (random() * interval '20 hours')
      - ((random() * 90)::int * interval '1 minute');

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
    SET      total_amount = round(subtotal + ship, 2),
      shipping_amount = ship
    WHERE id = oid;
  END LOOP;

  RAISE NOTICE 'Inserted 12 orders for %.', target_email;
END $$;
