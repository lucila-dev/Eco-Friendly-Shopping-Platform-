-- Merge Office into Home (single storefront category, slug stays `home`).
-- Add Food & Drink category. Safe to re-run.

UPDATE products
SET category_id = 'a1b2c3d4-0002-4000-8000-000000000002'
WHERE category_id = 'a1b2c3d4-0008-4000-8000-000000000008';

UPDATE categories
SET
  name = 'Home & Office',
  description = 'Sustainable home, living, and workspace essentials'
WHERE id = 'a1b2c3d4-0002-4000-8000-000000000002';

DELETE FROM categories
WHERE id = 'a1b2c3d4-0008-4000-8000-000000000008';

INSERT INTO categories (id, name, slug, description) VALUES
  (
    'a1b2c3d4-000a-4000-8000-00000000000a',
    'Food & Drink',
    'food-drink',
    'Organic pantry staples, low-waste beverages, and ethical treats'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description;
