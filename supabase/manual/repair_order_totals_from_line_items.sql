-- =============================================================================
-- Snap orders.total_amount to: sum(order_items qty × price_at_order) + shipping_amount
--
-- Fixes cards where lines + delivery don’t match the header (missing lines, bad
-- totals, or old bugs). Does not add missing products — only corrects the header.
--
-- Ignores promos / gift wrap stored in shipping_address (same limitation as bulk
-- preview in cleanup_incomplete_or_mismatched_orders.sql). If you use those,
-- spot-check after running.
-- =============================================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_amount decimal(10,2) NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- A) PREVIEW — mismatched orders for one user (set email)
-- -----------------------------------------------------------------------------
-- WITH agg AS (
--   SELECT order_id,
--          SUM(quantity * price_at_order)::numeric(10,2) AS subtotal
--   FROM order_items
--   GROUP BY order_id
-- )
-- SELECT o.id,
--        o.created_at,
--        o.total_amount AS stored_total,
--        o.shipping_amount,
--        a.subtotal,
--        (a.subtotal + COALESCE(o.shipping_amount, 0))::numeric(10,2) AS new_total,
--        u.email
-- FROM orders o
-- JOIN agg a ON a.order_id = o.id
-- JOIN auth.users u ON u.id = o.user_id
-- WHERE lower(trim(u.email)) = lower(trim('your@email.com'))
--   AND ABS(o.total_amount - (a.subtotal + COALESCE(o.shipping_amount, 0))) > 0.05
-- ORDER BY o.created_at DESC;

-- -----------------------------------------------------------------------------
-- B) REPAIR — all mismatched orders for that user (run A first)
-- -----------------------------------------------------------------------------
-- WITH agg AS (
--   SELECT order_id,
--          SUM(quantity * price_at_order)::numeric(10,2) AS subtotal
--   FROM order_items
--   GROUP BY order_id
-- )
-- UPDATE orders o
-- SET total_amount = (a.subtotal + COALESCE(o.shipping_amount, 0))::numeric(10,2)
-- FROM agg a
-- INNER JOIN auth.users u ON u.id = o.user_id
-- WHERE o.id = a.order_id
--   AND lower(trim(u.email)) = lower(trim('your@email.com'))
--   AND ABS(o.total_amount - (a.subtotal + COALESCE(o.shipping_amount, 0))) > 0.05;

-- -----------------------------------------------------------------------------
-- C) REPAIR — one order by full UUID (from Supabase Table Editor or API)
--    Example: deodorant-only row with total £100.54 → becomes £19.99 + shipping
-- -----------------------------------------------------------------------------
-- WITH agg AS (
--   SELECT order_id,
--          SUM(quantity * price_at_order)::numeric(10,2) AS subtotal
--   FROM order_items
--   WHERE order_id = 'PASTE-FULL-ORDER-UUID'::uuid
--   GROUP BY order_id
-- )
-- UPDATE orders o
-- SET total_amount = (a.subtotal + COALESCE(o.shipping_amount, 0))::numeric(10,2)
-- FROM agg a
-- WHERE o.id = a.order_id
--   AND o.id = 'PASTE-FULL-ORDER-UUID'::uuid;

-- After repair, optional carbon backfill:
-- \i supabase/manual/backfill_order_item_carbon_from_products.sql

-- -----------------------------------------------------------------------------
-- D) DELETE — remove one order (and its line items cascade)
--    Copy the full id from Supabase → Table Editor → orders (not only 6ec52db0…).
-- -----------------------------------------------------------------------------
-- DELETE FROM orders WHERE id = 'PASTE-FULL-ORDER-UUID'::uuid;
