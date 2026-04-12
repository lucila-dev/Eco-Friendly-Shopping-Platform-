-- =============================================================================
-- START HERE — what to do (no database knowledge required)
-- =============================================================================
--
-- GOAL: Remove duplicate product rows so each product line appears once in the shop.
--
-- WHERE: In the browser, open Supabase → your project → left sidebar “SQL Editor”
--        → “New query”. Paste ONE block at a time (see below).
--
-- STEP 1 — See if you have duplicates (safe, does not delete anything)
--         Scroll to “BLOCK 1 — DIAGNOSTICS ONLY” below, copy that whole section,
--         paste in SQL Editor, click RUN (or press Ctrl/Cmd + Enter).
--         Look at the numbers. If both “would_drop” values are 0, this script
--         may not match how your data looks; ask someone with DB access.
--
-- STEP 2 — Actually remove duplicates
--         Scroll to “BLOCK 2 — DELETE (PERMANENT)” below, copy from BEGIN through COMMIT,
--         paste, click RUN once.
--         Then open your website and refresh the products page.
--
-- WARNING: Deleting products cannot be undone from here. Linked reviews/cart rows
--          follow your database rules (usually removed with the product).
--
-- =============================================================================

-- ##############################################################################
-- BLOCK 1 — DIAGNOSTICS ONLY (run this first; nothing is deleted)
-- ##############################################################################

-- How many extra rows would be removed by each rule (rough counts)
SELECT
  'by_similar_slug' AS rule,
  coalesce(sum(n) FILTER (WHERE n > 1) - count(*) FILTER (WHERE n > 1), 0) AS rows_would_drop
FROM (
  SELECT
    category_id,
    regexp_replace(lower(trim(coalesce(slug, ''))), '-[0-9]+$', '') AS stem,
    count(*) AS n
  FROM products
  GROUP BY category_id, regexp_replace(lower(trim(coalesce(slug, ''))), '-[0-9]+$', '')
) t

UNION ALL

SELECT
  'by_similar_name' AS rule,
  coalesce(sum(n) FILTER (WHERE n > 1) - count(*) FILTER (WHERE n > 1), 0) AS rows_would_drop
FROM (
  SELECT
    category_id,
    regexp_replace(
      regexp_replace(lower(trim(coalesce(name, ''))), '\s+', ' ', 'g'),
      '\s+(core|plus|premium)\s*$',
      '',
      'i'
    ) AS norm_name,
    count(*) AS n
  FROM products
  GROUP BY category_id,
    regexp_replace(
      regexp_replace(lower(trim(coalesce(name, ''))), '\s+', ' ', 'g'),
      '\s+(core|plus|premium)\s*$',
      '',
      'i'
    )
) t;

-- Sample duplicate groups (names + slugs) — optional, helps you check it looks right
SELECT
  regexp_replace(
    regexp_replace(lower(trim(coalesce(name, ''))), '\s+', ' ', 'g'),
    '\s+(core|plus|premium)\s*$',
    '',
    'i'
  ) AS normalized_name,
  count(*) AS how_many,
  array_agg(slug ORDER BY id) AS example_slugs
FROM products
GROUP BY category_id,
  regexp_replace(
    regexp_replace(lower(trim(coalesce(name, ''))), '\s+', ' ', 'g'),
    '\s+(core|plus|premium)\s*$',
    '',
    'i'
  )
HAVING count(*) > 1
ORDER BY count(*) DESC
LIMIT 15;


-- ##############################################################################
-- BLOCK 2 — DELETE DUPLICATES (PERMANENT). Run only after you are sure.
--         Copy from BEGIN down to COMMIT (inclusive), paste, run ONCE.
-- ##############################################################################

BEGIN;

DELETE FROM products p
USING (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        category_id,
        regexp_replace(lower(trim(coalesce(slug, ''))), '-[0-9]+$', '')
      ORDER BY
        CASE WHEN coalesce(trim(image_url), '') <> '' THEN 0 ELSE 1 END,
        created_at ASC NULLS LAST,
        id ASC
    ) AS rn
  FROM products
) d
WHERE p.id = d.id
  AND d.rn > 1;

DELETE FROM products p
USING (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        category_id,
        regexp_replace(
          regexp_replace(lower(trim(coalesce(name, ''))), '\s+', ' ', 'g'),
          '\s+(core|plus|premium)\s*$',
          '',
          'i'
        )
      ORDER BY
        CASE WHEN coalesce(trim(image_url), '') <> '' THEN 0 ELSE 1 END,
        created_at ASC NULLS LAST,
        id ASC
    ) AS rn
  FROM products
) d
WHERE p.id = d.id
  AND d.rn > 1;

COMMIT;

-- =============================================================================
-- TECHNICAL NOTES (optional)
-- Pass 1: merge rows whose slugs only differ by a trailing -number (e.g. …-1 vs …-8).
-- Pass 2: merge rows with the same normalized product name in the same category.
-- =============================================================================
