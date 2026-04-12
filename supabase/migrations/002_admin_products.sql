ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_credits numeric(10,2) NOT NULL DEFAULT 1000;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'developer', 'owner', 'admin'));

DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;
DROP POLICY IF EXISTS "Managers can insert products" ON products;
DROP POLICY IF EXISTS "Managers can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;

CREATE POLICY "Managers can insert products" ON products FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'developer', 'admin'));
CREATE POLICY "Managers can update products" ON products FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'developer', 'admin'));
CREATE POLICY "Managers can delete products" ON products FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'developer', 'admin'));
