-- One-off: older order lines may have carbon_saving_kg = 0 while the product has footprint data.
-- Run in Supabase SQL editor if the leaderboard under-counts real shoppers.

UPDATE public.order_items oi
SET carbon_saving_kg = ROUND((COALESCE(p.carbon_footprint_saving_kg, 0) * oi.quantity)::numeric, 2)
FROM public.products p
WHERE oi.product_id = p.id
  AND COALESCE(oi.carbon_saving_kg, 0) = 0
  AND COALESCE(p.carbon_footprint_saving_kg, 0) > 0;
