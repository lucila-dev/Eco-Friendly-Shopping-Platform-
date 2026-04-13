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
