-- Many sample orders + line items for YOUR account (Track orders + dashboard).
-- Run in Supabase Dashboard → SQL Editor (uses postgres; bypasses RLS).
--
-- 1) Change target_email to the address you use to log into EcoShop.
-- 2) Run the whole script once.
-- 3) Optional: to avoid duplicates, delete your existing orders first:
--    DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = (SELECT id FROM auth.users WHERE lower(trim(email)) = lower(trim('YOUR_EMAIL'))));
--    DELETE FROM orders WHERE user_id = (SELECT id FROM auth.users WHERE lower(trim(email)) = lower(trim('YOUR_EMAIL')));

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

  FOR i IN 1..36 LOOP
    created_ts := CASE
      WHEN i <= 12 THEN
        now() - (i * interval '50 minutes') - (random() * interval '25 minutes')
      WHEN i <= 24 THEN
        now() - ((i - 6) * interval '5 hours') - (random() * interval '2 hours')
      ELSE
        now() - ((10 + (i * 3) + random() * 20)::int * interval '1 day')
    END;

    ship := CASE WHEN random() < 0.38 THEN 0::numeric ELSE 4.99::numeric END;

    INSERT INTO orders (
      user_id,
      status,
      total_amount,
      shipping_amount,
      shipping_name,
      shipping_address,
      shipping_email
    ) VALUES (
      uid,
      'completed',
      0,
      ship,
      'EcoShop customer',
      '1 Sustainable Street',
      target_email
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

    UPDATE orders
    SET total_amount = round(subtotal + ship, 2)
    WHERE id = oid;
  END LOOP;
END $$;
