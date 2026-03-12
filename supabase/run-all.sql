-- Run this entire file once in Supabase Dashboard → SQL Editor → New query
-- https://supabase.com/dashboard/project/cmsbfkknffqudxvcebne/sql/new

-- ========== SCHEMA ==========
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  sustainability_score smallint CHECK (sustainability_score >= 1 AND sustainability_score <= 10),
  materials text,
  carbon_footprint_saving_kg decimal(10,2) CHECK (carbon_footprint_saving_kg >= 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  shipping_name text,
  shipping_address text,
  shipping_email text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  price_at_order decimal(10,2) NOT NULL,
  carbon_saving_kg decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Users can insert own review" ON reviews;
DROP POLICY IF EXISTS "Users can update own review" ON reviews;
DROP POLICY IF EXISTS "Users can delete own review" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own review" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own review" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own review" ON reviews FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items for own orders" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users can insert order items for own orders" ON order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== SEED ==========
INSERT INTO categories (id, name, slug, description) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Fashion', 'fashion', 'Eco-friendly clothing and accessories'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Home', 'home', 'Sustainable home and living products'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Personal Care', 'personal-care', 'Natural and low-waste personal care')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Organic Cotton T-Shirt', 'organic-cotton-tshirt', 'Soft unisex t-shirt made from 100% GOTS certified organic cotton.', 24.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 9, 'Organic cotton', 3.2),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Recycled Ocean Plastic Jacket', 'recycled-ocean-plastic-jacket', 'Water-resistant jacket made from recycled ocean plastics.', 89.99, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', 8, 'Recycled polyester, recycled ocean plastic', 5.1),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Bamboo Cutlery Set', 'bamboo-cutlery-set', 'Portable reusable cutlery set in a hemp pouch.', 18.50, 'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=400', 10, 'Bamboo, hemp', 1.8),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Reusable Beeswax Wraps', 'beeswax-wraps', 'Set of 3 food wraps to replace single-use plastic.', 22.00, 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400', 9, 'Organic cotton, beeswax, tree resin', 2.0),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Solid Shampoo Bar', 'solid-shampoo-bar', 'Zero-waste shampoo bar, long-lasting and plastic-free.', 14.99, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', 9, 'Natural oils, essential oils', 0.5),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Refillable Deodorant', 'refillable-deodorant', 'Aluminum case with compostable refills.', 19.99, 'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400', 8, 'Aluminum, natural ingredients', 0.8)
ON CONFLICT (slug) DO NOTHING;
