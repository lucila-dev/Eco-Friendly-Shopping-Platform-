-- =============================================================================
-- Delete ALL “broken” orders for one shopper:
--   • no order_items, OR
--   • total_amount ≠ sum(qty × price_at_order) + shipping_amount (tolerance £0.05)
--
-- Edit target_email. Run in Supabase SQL Editor as postgres.
-- Ignores promos/gift wrap stored only in shipping_address — a rare order with
-- a big discount might look “mismatched” and be removed; preview first if unsure.
-- =============================================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_amount decimal(10,2) NOT NULL DEFAULT 0;

-- PREVIEW (uncomment): what will be deleted
-- WITH line_sum AS (
--   SELECT order_id,
--          SUM(quantity * price_at_order)::numeric(10,2) AS subtotal
--   FROM order_items
--   GROUP BY order_id
-- )
-- SELECT o.id,
--        o.created_at,
--        o.total_amount,
--        o.shipping_amount,
--        ls.subtotal,
--        NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id) AS is_empty,
--        CASE
--          WHEN NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id) THEN true
--          WHEN ls.subtotal IS NULL THEN false
--          ELSE ABS(o.total_amount - (ls.subtotal + COALESCE(o.shipping_amount, 0))) > 0.05
--        END AS will_delete
-- FROM orders o
-- LEFT JOIN line_sum ls ON ls.order_id = o.id
-- JOIN auth.users u ON u.id = o.user_id
-- WHERE lower(trim(u.email)) = lower(trim('luula.forno@gmail.com'))
--   AND (
--     NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
--     OR (
--       ls.subtotal IS NOT NULL
--       AND ABS(o.total_amount - (ls.subtotal + COALESCE(o.shipping_amount, 0))) > 0.05
--     )
--   )
-- ORDER BY o.created_at DESC;

DO $$
DECLARE
  target_email text := 'luula.forno@gmail.com';
  uid uuid;
  n int;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = lower(trim(target_email)) LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user for email %. Sign up or fix the email.', target_email;
  END IF;

  DELETE FROM orders o
  WHERE o.user_id = uid
    AND (
      NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
      OR EXISTS (
        SELECT 1
        FROM (
          SELECT order_id,
                 SUM(quantity * price_at_order)::numeric(10,2) AS subtotal
          FROM order_items
          GROUP BY order_id
        ) ls
        WHERE ls.order_id = o.id
          AND ABS(o.total_amount - (ls.subtotal + COALESCE(o.shipping_amount, 0))) > 0.05
      )
    );

  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Deleted % broken order(s) for %.', n, target_email;
END $$;
