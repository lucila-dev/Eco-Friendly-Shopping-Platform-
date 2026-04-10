-- Remove duplicate product rows (same category + same name, case/whitespace-insensitive).
-- Keeps one row per group: prefers a non-empty image_url, then earliest created_at, then smallest id.
-- Child rows (reviews, cart_items, order_items) for removed products are CASCADE-deleted.
--
-- 1) Run the preview query below and confirm the listed ids look like true duplicates.
-- 2) Uncomment and run the DELETE block.

-- ========== PREVIEW (optional): rows that would be removed ==========
/*
SELECT p.id, p.slug, p.name, p.category_id, p.created_at
FROM products p
JOIN (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY category_id, lower(trim(name))
           ORDER BY
             CASE WHEN image_url IS NOT NULL AND trim(image_url) <> '' THEN 0 ELSE 1 END,
             created_at ASC NULLS LAST,
             id ASC
         ) AS rn
  FROM products
) d ON d.id = p.id
WHERE d.rn > 1
ORDER BY lower(trim(p.name)), p.category_id, p.created_at;
*/

-- ========== DELETE duplicates ==========
DELETE FROM products p
USING (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY category_id, lower(trim(name))
           ORDER BY
             CASE WHEN image_url IS NOT NULL AND trim(image_url) <> '' THEN 0 ELSE 1 END,
             created_at ASC NULLS LAST,
             id ASC
         ) AS rn
  FROM products
) d
WHERE p.id = d.id
  AND d.rn > 1;
