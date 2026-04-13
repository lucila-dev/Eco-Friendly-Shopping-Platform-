-- Aggregate CO₂ savings per shopper for a public leaderboard (read via SECURITY DEFINER RPC).
-- RLS on orders/order_items/profiles blocks cross-user reads from the client; this function runs as postgres.

CREATE OR REPLACE FUNCTION public.get_carbon_leaderboard(
  p_limit integer DEFAULT 30,
  p_min_kg numeric DEFAULT 0.01
)
RETURNS TABLE (
  user_id uuid,
  display_label text,
  total_kg numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT
    o.user_id,
    COALESCE(NULLIF(TRIM(MAX(pr.display_name)), ''), 'EcoShop member') AS display_label,
    ROUND(SUM(oi.carbon_saving_kg)::numeric, 2) AS total_kg
  FROM public.order_items oi
  INNER JOIN public.orders o ON o.id = oi.order_id
  LEFT JOIN public.profiles pr ON pr.id = o.user_id
  WHERE o.status IS DISTINCT FROM 'cancelled'
  GROUP BY o.user_id
  HAVING COALESCE(SUM(oi.carbon_saving_kg), 0) >= p_min_kg
  ORDER BY SUM(oi.carbon_saving_kg) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 100));
$$;

REVOKE ALL ON FUNCTION public.get_carbon_leaderboard(integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_carbon_leaderboard(integer, numeric) TO authenticated;
