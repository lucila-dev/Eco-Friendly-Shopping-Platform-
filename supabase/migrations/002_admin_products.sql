-- Run in SQL Editor to enable admin product management.
-- Then set a user as admin: UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Allow admins to insert, update, delete products
CREATE POLICY "Admins can insert products" ON products FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins can update products" ON products FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins can delete products" ON products FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
