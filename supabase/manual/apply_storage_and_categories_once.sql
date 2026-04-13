INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_authenticated_upload" ON storage.objects;
CREATE POLICY "product_images_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    (name LIKE 'avatars/%')
    OR (
      (name LIKE 'products/%' OR name LIKE 'categories/%')
      AND (
        EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid())
        OR COALESCE((SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()), 'user') IN ('owner', 'developer', 'admin')
      )
    )
  )
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_focus_y smallint DEFAULT 50;

UPDATE categories SET image_focus_y = 50 WHERE image_focus_y IS NULL;

ALTER TABLE categories ALTER COLUMN image_focus_y SET DEFAULT 50;
ALTER TABLE categories ALTER COLUMN image_focus_y SET NOT NULL;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_image_focus_y_chk;
ALTER TABLE categories ADD CONSTRAINT categories_image_focus_y_chk
  CHECK (image_focus_y >= 0 AND image_focus_y <= 100);

DROP POLICY IF EXISTS "Managers can update categories" ON categories;
CREATE POLICY "Managers can update categories" ON categories FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE((SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()), 'user') IN ('owner', 'developer', 'admin')
  );
