-- Single storefront category: Garden & Outdoors (canonical slug: outdoors).
-- Run after categories exist. Reassigns garden products, removes duplicate category row.

UPDATE products p
SET category_id = o.id
FROM categories o
WHERE o.slug = 'outdoors'
  AND p.category_id IN (SELECT id FROM categories WHERE slug = 'garden');

UPDATE categories
SET
  name = 'Garden & Outdoors',
  description = 'Gear for trails and yards—low-impact choices for outside the home'
WHERE slug = 'outdoors';

DELETE FROM categories WHERE slug = 'garden';
