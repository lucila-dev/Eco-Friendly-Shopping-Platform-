-- Allow catalog/demo reviews without auth.users (nullable user_id + display name).
-- Data is inserted in seed.sql (after products) and/or manual/seed_catalog_reviews.sql.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_display_name text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS catalog_seed boolean NOT NULL DEFAULT false;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_product_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_purchase_review_per_user
  ON reviews (product_id, user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;
