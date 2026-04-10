-- Dev tools allowlist table + RLS policies (products, categories, storage).
-- Also run 009_dev_tools_hybrid_access.sql so owner/developer/admin roles keep access without a row here.
-- After008: optionally insert team UUIDs, e.g.
--   INSERT INTO public.dev_tools_allowlist (user_id) VALUES ('uuid-1'), ('uuid-2') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dev_tools_allowlist (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dev_tools_allowlist IS 'Users who may use Dev tools. Rows are managed in the SQL Editor (service role), not from the app.';

ALTER TABLE public.dev_tools_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_tools_allowlist_select_own" ON public.dev_tools_allowlist;
CREATE POLICY "dev_tools_allowlist_select_own"
  ON public.dev_tools_allowlist
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Products: only allowlisted users
DROP POLICY IF EXISTS "Managers can insert products" ON products;
DROP POLICY IF EXISTS "Managers can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;

CREATE POLICY "Managers can insert products" ON products FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid()));

CREATE POLICY "Managers can update products" ON products FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid()));

CREATE POLICY "Managers can delete products" ON products FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid()));

-- Category hero images (Dev tools panel)
DROP POLICY IF EXISTS "Managers can update categories" ON categories;
CREATE POLICY "Managers can update categories" ON categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid()));

-- Storage: profile avatars for any signed-in user; products/ + categories/ only for allowlisted users
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
      AND EXISTS (SELECT 1 FROM public.dev_tools_allowlist d WHERE d.user_id = auth.uid())
    )
  )
);
