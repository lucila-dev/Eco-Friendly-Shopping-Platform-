-- Dev tools: explicit allowlist OR legacy profiles.role (owner / developer / admin).

DROP POLICY IF EXISTS "Managers can insert products" ON products;
DROP POLICY IF EXISTS "Managers can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;

CREATE POLICY "Managers can insert products" ON products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE(
      (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()),
      'user'
    ) IN ('owner', 'developer', 'admin')
  );

CREATE POLICY "Managers can update products" ON products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE(
      (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()),
      'user'
    ) IN ('owner', 'developer', 'admin')
  );

CREATE POLICY "Managers can delete products" ON products FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE(
      (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()),
      'user'
    ) IN ('owner', 'developer', 'admin')
  );

DROP POLICY IF EXISTS "Managers can update categories" ON categories;
CREATE POLICY "Managers can update categories" ON categories FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE(
      (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()),
      'user'
    ) IN ('owner', 'developer', 'admin')
  );

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
        OR COALESCE(
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()),
          'user'
        ) IN ('owner', 'developer', 'admin')
      )
    )
  )
);
