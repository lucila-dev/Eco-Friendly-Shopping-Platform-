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
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'developer', 'owner', 'admin')),
  loyalty_credits numeric(10,2) NOT NULL DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dev_tools_allowlist (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
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
  size text NOT NULL DEFAULT '',
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id, size)
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
  selected_size text,
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
ALTER TABLE dev_tools_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers can insert products" ON products;
DROP POLICY IF EXISTS "Managers can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;
CREATE POLICY "Managers can insert products" ON products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE((SELECT p.role FROM profiles p WHERE p.id = auth.uid()), 'user') IN ('owner', 'developer', 'admin')
  );
CREATE POLICY "Managers can update products" ON products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE((SELECT p.role FROM profiles p WHERE p.id = auth.uid()), 'user') IN ('owner', 'developer', 'admin')
  );
CREATE POLICY "Managers can delete products" ON products FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE((SELECT p.role FROM profiles p WHERE p.id = auth.uid()), 'user') IN ('owner', 'developer', 'admin')
  );

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "dev_tools_allowlist_select_own" ON dev_tools_allowlist;
CREATE POLICY "dev_tools_allowlist_select_own"
  ON dev_tools_allowlist FOR SELECT TO authenticated
  USING (user_id = auth.uid());

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
-- Seed data: categories and products
-- Run after 001_initial_schema.sql.

INSERT INTO categories (id, name, slug, description) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Fashion', 'fashion', 'Eco-friendly clothing and accessories'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Home & Office', 'home', 'Sustainable home, living, and workspace essentials'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Personal Care', 'personal-care', 'Natural and low-waste personal care'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Kitchen', 'kitchen', 'Low-waste and reusable kitchen essentials'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Beauty', 'beauty', 'Clean beauty and sustainable cosmetics'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Garden & Outdoors', 'outdoors', 'Gear for trails and yards—low-impact choices for outside the home'),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Kids', 'kids', 'Eco-friendly items for babies and children'),
  ('a1b2c3d4-0009-4000-8000-000000000009', 'Tech', 'tech', 'Energy-efficient and responsible tech accessories'),
  ('a1b2c3d4-000a-4000-8000-00000000000a', 'Food & Drink', 'food-drink', 'Organic pantry staples, low-waste beverages, and ethical treats')
ON CONFLICT (id) DO NOTHING;

-- Starter products
INSERT INTO products (category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Organic Cotton T-Shirt', 'organic-cotton-tshirt', 'Soft unisex t-shirt made from 100% GOTS certified organic cotton.', 24.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 9, 'Organic cotton', 3.2),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Recycled Ocean Plastic Jacket', 'recycled-ocean-plastic-jacket', 'Water-resistant jacket made from recycled ocean plastics.', 89.99, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', 8, 'Recycled polyester, recycled ocean plastic', 5.1),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Bamboo Cutlery Set', 'bamboo-cutlery-set', 'Portable reusable cutlery set in a hemp pouch.', 18.50, 'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=400', 10, 'Bamboo, hemp', 1.8),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Reusable Beeswax Wraps', 'beeswax-wraps', 'Set of 3 food wraps to replace single-use plastic.', 22.00, 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400', 9, 'Organic cotton, beeswax, tree resin', 2.0),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Solid Shampoo Bar', 'solid-shampoo-bar', 'Zero-waste shampoo bar, long-lasting and plastic-free.', 14.99, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', 9, 'Natural oils, essential oils', 0.5),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Refillable Deodorant', 'refillable-deodorant', 'Aluminum case with compostable refills.', 19.99, 'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400', 8, 'Aluminum, natural ingredients', 0.8)
ON CONFLICT (slug) DO NOTHING;

-- Remove old generic generated products from previous seed versions
DELETE FROM products
WHERE slug LIKE '%-eco-product-%';

-- Generate 252 category-specific products across 9 categories (28 per category)
WITH category_map AS (
  SELECT id, slug
  FROM categories
  WHERE slug IN ('fashion','home','personal-care','kitchen','beauty','outdoors','kids','food-drink','tech')
), generated AS (
  SELECT
    c.id AS category_id,
    t.item_name AS name,
    c.slug || '-' || regexp_replace(lower(t.item_name), '[^a-z0-9]+', '-', 'g') || '-' || n AS slug,
    t.item_description AS description,
    round((
      (CASE c.slug
        WHEN 'fashion' THEN (ARRAY[
          18.99, 64.99, 42.99, 34.99, 46.99, 28.99, 54.99, 48.99, 32.99, 22.99, 39.99, 36.99, 44.99, 29.99, 14.99, 49.99, 72.99, 31.99, 16.99, 58.99, 59.99, 34.99, 24.99, 19.99, 89.99, 52.99, 69.99, 21.99
        ])[n]
        WHEN 'home' THEN (ARRAY[
          22.99, 72.99, 54.99, 28.99, 16.99, 34.99, 26.99, 11.99, 18.99, 14.49, 9.99, 6.49, 12.99, 7.49, 24.99, 18.99, 12.99, 36.99, 21.99, 14.99, 19.99, 44.99, 16.99, 48.99, 11.49, 32.99, 28.99, 15.99
        ])[n]
        WHEN 'personal-care' THEN (ARRAY[
          8.49, 6.99, 9.99, 11.99, 8.99, 13.99, 8.49, 24.99, 9.49, 7.99, 14.99, 12.99, 10.99, 11.49, 8.99, 6.99, 9.99, 18.99, 11.99, 7.49, 12.49, 5.99, 13.49, 8.99, 10.49, 9.99, 7.99, 6.49
        ])[n]
        WHEN 'kitchen' THEN (ARRAY[
          7.49, 14.99, 17.99, 22.99, 18.99, 9.99, 14.99, 42.99, 16.99, 12.99, 24.99, 8.99, 11.99, 28.99, 14.49, 9.99, 7.99, 32.99, 19.99, 13.99, 11.49, 14.99, 22.99, 17.99, 39.99, 12.99, 26.99, 8.49
        ])[n]
        WHEN 'beauty' THEN (ARRAY[
          8.99, 14.99, 18.99, 9.99, 14.99, 11.99, 13.99, 12.49, 16.99, 11.99, 15.99, 6.99, 13.49, 17.99, 9.99, 8.49, 12.99, 14.49, 10.99, 18.49, 16.99, 9.99, 7.99, 11.49, 12.99, 5.99, 14.99, 13.99
        ])[n]
        WHEN 'outdoors' THEN (ARRAY[
          44.99, 21.99, 24.99, 15.99, 32.99, 29.99, 6.99, 12.99, 9.99, 49.99, 69.99, 16.99, 11.99, 8.99, 54.99, 18.99, 42.99, 34.99, 14.49, 22.99, 59.99, 8.99, 39.99, 24.99, 28.99, 89.99, 19.99, 12.49
        ])[n]
        WHEN 'kids' THEN (ARRAY[
          14.99, 8.99, 17.99, 11.99, 9.99, 22.99, 26.99, 16.99, 12.49, 9.99, 79.99, 18.99, 14.99, 24.99, 19.99, 21.99, 22.99, 11.99, 27.99, 19.99, 16.99, 12.99, 28.99, 32.99, 7.99, 15.99, 8.49, 14.49
        ])[n]
        WHEN 'food-drink' THEN (ARRAY[
          8.49, 6.49, 3.49, 9.99, 3.49, 2.79, 5.49, 6.49, 5.49, 18.99, 3.99, 4.79, 3.89, 8.49, 12.99, 14.99, 5.49, 7.99, 8.99, 4.49, 6.99, 9.99, 5.99, 11.99, 4.99, 7.49, 3.29, 8.99
        ])[n]
        WHEN 'tech' THEN (ARRAY[
          16.99, 28.99, 16.99, 11.99, 14.99, 17.99, 32.99, 12.99, 8.99, 42.99, 34.99, 24.99, 18.99, 9.99, 36.99, 45.99, 22.99, 38.99, 14.49, 11.99, 12.99, 8.99, 6.99, 29.99, 49.99, 16.99, 24.99, 7.99
        ])[n]
        ELSE 12.99
      END)::numeric
      + ((n - 1) % 4) * 0.25
    ), 2) AS price,
    (ARRAY[
          'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
          'https://images.unsplash.com/photo-1423784346385-c1d4dac9893a?w=400',
          'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
          'https://images.unsplash.com/photo-1440186347098-386b7459ad6b?w=400',
          'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400',
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
          'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
          'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
          'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400',
          'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400',
          'https://images.unsplash.com/photo-1455218873509-8097305ee378?w=400',
          'https://images.unsplash.com/photo-1455778977533-4a3ef39091c6?w=400',
          'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400',
          'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
          'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400',
          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
          'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
          'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400',
          'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400',
          'https://images.unsplash.com/photo-1470116945706-e6bf5d5a53ca?w=400',
          'https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?w=400',
          'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400',
          'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400',
          'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400',
          'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=400',
          'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=400',
          'https://images.unsplash.com/photo-1476979735039-2fdea9e9e407?w=400',
          'https://images.unsplash.com/photo-1480694313141-fce5e697ee25?w=400',
          'https://images.unsplash.com/photo-1480985041486-c65b20c01d1f?w=400',
          'https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?w=400',
          'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
          'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400',
          'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=400',
          'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400',
          'https://images.unsplash.com/photo-1486887396153-fa416526c108?w=400',
          'https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=400',
          'https://images.unsplash.com/photo-1487015307662-6ce6210680f1?w=400',
          'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
          'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400',
          'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400',
          'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
          'https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=400',
          'https://images.unsplash.com/photo-1492496913980-501348b61469?w=400',
          'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400',
          'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=400',
          'https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?w=400',
          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
          'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
          'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400',
          'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400',
          'https://images.unsplash.com/photo-1499696010181-529a2df2828b?w=400',
          'https://images.unsplash.com/photo-1499914485622-a88fac536970?w=400',
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400',
          'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400',
          'https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=400',
          'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400',
          'https://images.unsplash.com/photo-1502126324834-38f8e02d7160?w=400',
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400',
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400',
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400',
          'https://images.unsplash.com/photo-1505816014357-96b5ff457e9a?w=400',
          'https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?w=400',
          'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400',
          'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=400',
          'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
          'https://images.unsplash.com/photo-1510154221590-ff63e90a136f?w=400',
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
          'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400',
          'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400',
          'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=400',
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400',
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
          'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400',
          'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=400',
          'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400',
          'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=400',
          'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400',
          'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400',
          'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=400',
          'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400',
          'https://images.unsplash.com/photo-1518057111178-44a106bad636?w=400',
          'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=400',
          'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
          'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=400',
          'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=400',
          'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400',
          'https://images.unsplash.com/photo-1519340333755-c6e9f6b88a45?w=400',
          'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
          'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400',
          'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400',
          'https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=400',
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
          'https://images.unsplash.com/photo-1522125670776-3c7abb882bc2?w=400',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
          'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400',
          'https://images.unsplash.com/photo-1522850067562-a4c60453058d?w=400',
          'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400',
          'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400',
          'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=400',
          'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=400',
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400',
          'https://images.unsplash.com/photo-1525328437458-0c4d4db7cab4?w=400',
          'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400',
          'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400',
          'https://images.unsplash.com/photo-1527212986666-4d2d47a80d5f?w=400',
          'https://images.unsplash.com/photo-1529720317453-c8da503f2051?w=400',
          'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400',
          'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=400',
          'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=400',
          'https://images.unsplash.com/photo-1533321942807-08e4008b2025?w=400',
          'https://images.unsplash.com/photo-1533483595632-c5f0e57a1936?w=400',
          'https://images.unsplash.com/photo-1533782654613-826a072dd6f3?w=400',
          'https://images.unsplash.com/photo-1534620808146-d33bb39128b2?w=400',
          'https://images.unsplash.com/photo-1534709153997-d6659469f951?w=400',
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
          'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=400',
          'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400',
          'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
          'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400',
          'https://images.unsplash.com/photo-1542744095-291d1f67b221?w=400',
          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
          'https://images.unsplash.com/photo-1544441893-675973e31985?w=400',
          'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=400',
          'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=400',
          'https://images.unsplash.com/photo-1549413468-cd78edb7e75c?w=400',
          'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400',
          'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
          'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
          'https://images.unsplash.com/photo-1552046122-03184de85e08?w=400',
          'https://images.unsplash.com/photo-1552788960-65fcafe071a5?w=400',
          'https://images.unsplash.com/photo-1552819289-824d37ca69d2?w=400',
          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
          'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400',
          'https://images.unsplash.com/photo-1555820585-c5ae44394b79?w=400',
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
          'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400',
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
          'https://images.unsplash.com/photo-1556740767-414a9c4860c1?w=400',
          'https://images.unsplash.com/photo-1556742526-795a8eac090e?w=400',
          'https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=400',
          'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=400',
          'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400',
          'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=400',
          'https://images.unsplash.com/photo-1556983852-43bf21186b2a?w=400',
          'https://images.unsplash.com/photo-1557844352-761f2565b576?w=400',
          'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400',
          'https://images.unsplash.com/photo-1559591935-c6c23a6f3bce?w=400',
          'https://images.unsplash.com/photo-1559811814-e2c57b5e69df?w=400',
          'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
          'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400',
          'https://images.unsplash.com/photo-1566004100631-35d015d6a491?w=400',
          'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400',
          'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=400',
          'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400',
          'https://images.unsplash.com/photo-1567042661848-7161ce446f85?w=400',
          'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400',
          'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400',
          'https://images.unsplash.com/photo-1568454537842-d933259bb258?w=400',
          'https://images.unsplash.com/photo-1569163139500-66446e2926ca?w=400',
          'https://images.unsplash.com/photo-1569227997603-33b9f12af927?w=400',
          'https://images.unsplash.com/photo-1570101945621-945409a6370f?w=400',
          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400',
          'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
          'https://images.unsplash.com/photo-1572016047668-5b5e909e1605?w=400',
          'https://images.unsplash.com/photo-1573152143286-0c422b4d2175?w=400',
          'https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?w=400',
          'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400',
          'https://images.unsplash.com/photo-1578681994506-b8f463449011?w=400',
          'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=400',
          'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=400',
          'https://images.unsplash.com/photo-1580894908361-967195033215?w=400',
          'https://images.unsplash.com/photo-1581182800629-7d90925ad072?w=400',
          'https://images.unsplash.com/photo-1581182815808-b6eb627a8798?w=400',
          'https://images.unsplash.com/photo-1582486225644-aeacf6aa0b1b?w=400',
          'https://images.unsplash.com/photo-1583209814683-c023dd293cc6?w=400',
          'https://images.unsplash.com/photo-1583241800698-d4b7f1d3e6b5?w=400',
          'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400',
          'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400',
          'https://images.unsplash.com/photo-1585945037805-5fd82c2e60b1?w=400',
          'https://images.unsplash.com/photo-1586022045497-31fcf76fa6cc?w=400',
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
          'https://images.unsplash.com/photo-1586765501019-cbe3973ef8fa?w=400',
          'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=400',
          'https://images.unsplash.com/photo-1588410670460-cdab54625253?w=400',
          'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?w=400',
          'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=400',
          'https://images.unsplash.com/photo-1590301157172-7ba48dd1c2b2?w=400',
          'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=400',
          'https://images.unsplash.com/photo-1590868309235-ea34bed7bd7f?w=400',
          'https://images.unsplash.com/photo-1591807105152-594ed605cc58?w=400',
          'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400',
          'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=400',
          'https://images.unsplash.com/photo-1592890288564-76628a30a657?w=400',
          'https://images.unsplash.com/photo-1594058573823-d8edf1ad3380?w=400',
          'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=400',
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
          'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400',
          'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400',
          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400',
          'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=400',
          'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
          'https://images.unsplash.com/photo-1598826867442-9ef9e2527b1e?w=400',
          'https://images.unsplash.com/photo-1598965402089-897ce52e8355?w=400',
          'https://images.unsplash.com/photo-1599696848652-f0ff23bc911f?w=400',
          'https://images.unsplash.com/photo-1599819055803-717bba43890f?w=400',
          'https://images.unsplash.com/photo-1599847987657-881f11b92a75?w=400',
          'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=400',
          'https://images.unsplash.com/photo-1600659911670-7831fad053ee?w=400',
          'https://images.unsplash.com/photo-1600684388091-627109f3cd60?w=400',
          'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=400',
          'https://images.unsplash.com/photo-1603184017968-953f59cd2e37?w=400',
          'https://images.unsplash.com/photo-1604917621956-10dfa7cce2e7?w=400',
          'https://images.unsplash.com/photo-1607006483224-5340f1e9d2b7?w=400',
          'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400',
          'https://images.unsplash.com/photo-1608068811588-3a67006b7489?w=400',
          'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400',
          'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400',
          'https://images.unsplash.com/photo-1609357912334-e96886c0212b?w=400',
          'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400',
          'https://images.unsplash.com/photo-1610632380989-680fe40816c6?w=400',
          'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400',
          'https://images.unsplash.com/photo-1612442058361-178007e5e498?w=400',
          'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400',
          'https://images.unsplash.com/photo-1613396874083-2d5fbe59ae79?w=400',
          'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400',
          'https://images.unsplash.com/photo-1617228069096-4638a7ffc906?w=400',
          'https://images.unsplash.com/photo-1617331140180-e8262094733a?w=400',
          'https://images.unsplash.com/photo-1617548862871-4e46c1c81b45?w=400',
          'https://images.unsplash.com/photo-1617778368431-f97343a411ac?w=400',
          'https://images.unsplash.com/photo-1617897903246-719242758050?w=400',
          'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400',
          'https://images.unsplash.com/photo-1619451427882-6aaaded0cc61?w=400',
          'https://images.unsplash.com/photo-1620464003286-a5b0d79f32c2?w=400',
          'https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=400',
          'https://images.unsplash.com/photo-1622372738946-62e02505feb3?w=400',
          'https://images.unsplash.com/photo-1628797285815-453c1d0d21e3?w=400',
          'https://images.unsplash.com/photo-1629185752152-fe65698ddee4?w=400',
          'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400',
          'https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=400',
          'https://images.unsplash.com/photo-1632583824020-937ae9564495?w=400',
          'https://images.unsplash.com/photo-1634403665481-74948d815f03?w=400',
          'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400',
          'https://images.unsplash.com/photo-1662370761575-05ff1ee40d7d?w=400'
        ])[( CASE c.slug
          WHEN 'fashion' THEN 0
          WHEN 'home' THEN 28
          WHEN 'personal-care' THEN 56
          WHEN 'kitchen' THEN 84
          WHEN 'beauty' THEN 112
          WHEN 'outdoors' THEN 140
          WHEN 'kids' THEN 168
          WHEN 'food-drink' THEN 196
          WHEN 'tech' THEN 224
        END ) + n] AS image_url,
    (5 + (n % 6))::smallint AS sustainability_score,
    t.item_materials AS materials,
    round((0.6 + (n % 15) * 0.35)::numeric, 2) AS carbon_footprint_saving_kg
  FROM category_map c
  CROSS JOIN generate_series(1, 28) AS n
  CROSS JOIN LATERAL (
    SELECT
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY[
          'Organic Cotton Tee', 'Recycled Denim Jacket', 'Hemp Blend Hoodie', 'Linen Everyday Shirt',
          'Recycled Knit Sweater', 'Bamboo Lounge Pants', 'Vegan Canvas Sneakers', 'Recycled Fleece Zip Hoodie',
          'Linen Summer Shorts', 'Fair Trade Merino Beanie', 'Cork Strap Sandals', 'RPET Active Leggings',
          'Tencel Camp Shirt', 'Upcycled Banner Tote', 'Organic Crew Socks Pack', 'Seaqual Swim Shorts',
          'Alpaca Wool Cardigan', 'Pinatex Waist Belt', 'Plant Dyed Bandana', 'GOTS Pajama Set',
          'Ripstop Windbreaker', 'Cork Sole Slippers', 'Hemp Market Tote', 'Tie-Dye Scarf',
          'Recycled Cashmere Wrap', 'Linen Pinafore Dress', 'Banner Fabric Windcoat', 'Bamboo Rib Tank'
        ])[n]
        WHEN 'home' THEN (ARRAY[
          'Recycled Glass Vase', 'FSC Wood Side Table', 'Natural Fiber Rug', 'Low Energy LED Lamp',
          'Reusable Storage Jars', 'Organic Cotton Throw', 'Upcycled Decor Basket', 'Recycled Notebook Pack',
          'Bamboo Desk Organizer', 'Refillable Pen Set', 'Cork Mouse Pad', 'Eco Sticky Notes',
          'FSC Paper Planner', 'Reusable Cable Ties', 'Hemp Cushion Cover Set', 'Wool Dryer Balls',
          'Bamboo Coaster Set', 'Glass Infuser Teapot', 'Linen Napkin Quartet', 'Beeswax Pillar Candle',
          'Terracotta Planter Pair', 'Rattan Laundry Hamper', 'Cork Bulletin Tiles', 'Recycled Wool Throw',
          'Soy Wax Melts Tin', 'Jute Entry Mat', 'Stainless Bento Lunch Box', 'Ceramic Salt Cellar Duo'
        ])[n]
        WHEN 'personal-care' THEN (ARRAY[
          'Natural Toothpaste Tabs', 'Compostable Floss Kit', 'Refillable Hand Wash', 'Plant-Based Face Cleanser',
          'Bamboo Toothbrush Set', 'Eco Body Lotion', 'Solid Conditioner Bar', 'Aluminum Safety Razor',
          'Konjac Sponge Duo', 'Shea Lip Balm Tin', 'Dry Shampoo Powder', 'Reusable Cotton Swabs',
          'Mineral Deodorant Stick', 'Aloe Shaving Cream', 'Glass Pump Dispenser', 'Pumice Stone Brush',
          'Tea Tree Foot Spray', 'Rosehip Facial Oil', 'Charcoal Dental Powder', 'Silk Dental Tape',
          'Oat Hand Cream', 'Bamboo Cotton Buds', 'Citrus Shower Steamers', 'SPF Lip Shield',
          'Lavender Pillow Mist', 'Cornstarch Body Powder', 'Peppermint Mouthwash Tabs', 'Biodegradable Bandage Roll'
        ])[n]
        WHEN 'kitchen' THEN (ARRAY[
          'Stainless Steel Straw Set', 'Bamboo Cooking Utensils', 'Reusable Silicone Food Bags', 'Compost Bin Caddy',
          'Glass Meal Prep Containers', 'Cotton Produce Bags', 'Beeswax Food Wrap Kit', 'Cast Iron Skillet',
          'Cork Trivet Set', 'Glass Oil Cruet', 'Hemp Apron', 'Stainless Pasta Measure',
          'Silicone Baking Mat', 'Ceramic Mortar Pestle', 'Wooden Salad Servers', 'Tea Infuser Basket',
          'Compostable Sponge Pack', 'Bamboo Cutting Board', 'Glass Spice Jars', 'Silicone Lids Universal',
          'Linen Bread Bag', 'Steel Ice Cube Tray', 'Coconut Bowl Set', 'Reusable Bowl Covers',
          'Stovetop Kettle', 'Cotton Dish Cloths', 'Fermentation Jar Kit', 'Wooden Dish Brush'
        ])[n]
        WHEN 'beauty' THEN (ARRAY[
          'Refillable Lip Balm', 'Vegan Mascara Tube', 'Eco Makeup Brush Set', 'Reusable Cotton Rounds',
          'Natural Tint Moisturizer', 'Plastic-Free Face Mask', 'Mineral Blush Compact', 'Brow Pomade Pot',
          'Setting Powder Refill', 'Gel Eyeliner Pencil', 'Duo Eyeshadow Pan', 'Nail Buffer Block',
          'Micellar Water Glass', 'Jojoba Cleansing Oil', 'Overnight Lip Mask', 'Konjac Face Sponge',
          'Tinted Brow Gel', 'Highlighter Stick', 'Matte Lip Crayon', 'Makeup Remover Balm',
          'Kabuki Brush Short', 'Sheer Nail Polish', 'Cuticle Oil Pen', 'Face Mist Spray',
          'Biodegradable Glitter Gel', 'Bamboo Cotton Swabs', 'SPF Face Stick', 'Eyeshadow Brush Duo'
        ])[n]
        WHEN 'outdoors' THEN (ARRAY[
          'Recycled Trail Backpack', 'Insulated Steel Bottle', 'Solar Camp Lantern', 'Reusable Travel Cutlery',
          'Eco Picnic Blanket', 'Cork Yoga Mat', 'Compostable Wet Wipes', 'Compost Starter Kit',
          'Biodegradable Seed Pots', 'Reclaimed Wood Planter', 'Rainwater Collection Barrel', 'Organic Herb Grow Set',
          'Natural Coir Mulch Mat', 'Bamboo Plant Labels', 'Hiking Pole Pair', 'Recycled Fleece Beanie',
          'Packable Hammock', 'Solar String Lights', 'Collapsible Silicone Bowl', 'Trail Gaiters',
          'Waxed Canvas Tarp', 'Fire Starter Cubes', 'Portable Water Filter', 'Recycled Rope Dog Leash',
          'Bird Feeder Cedar', 'Stacking Rain Barrel Kit', 'Foldable Camp Stool', 'Organic Potting Soil Bag'
        ])[n]
        WHEN 'kids' THEN (ARRAY[
          'Organic Baby Onesie', 'Natural Rubber Teether', 'Bamboo Kids Plate Set', 'Eco Story Book Set',
          'Reusable Snack Pouch', 'Wooden Learning Blocks', 'Organic Cotton Blanket', 'Muslin Burp Cloths',
          'Wheat Straw Sippy Cup', 'Crayon Rock Set', 'Balance Bike Wood', 'Sun Hat Organic',
          'Bath Toy Boats', 'Night Light Owl', 'Puzzle Floor Farm', 'Stroller Organizer Hemp',
          'Wool Booties', 'Silicone Bib Pocket', 'Growth Chart Canvas', 'Plush Bunny Recycled',
          'Snack Container Steel', 'Finger Paint Powder', 'Crib Fitted Sheet', 'Backpack Mini',
          'Bubble Wand Wood', 'Sound Book Nature', 'Training Chopsticks', 'Sunscreen Baby Stick'
        ])[n]
        WHEN 'food-drink' THEN (ARRAY[
          'Fair-Trade Organic Coffee', 'Loose Leaf Herbal Tea', 'Small-Batch Probiotic Kombucha', 'Raw Wildflower Honey',
          'Single-Origin Dark Chocolate Bar', 'Bronze-Cut Organic Durum Pasta', 'Sprouted Grain Breakfast Granola', 'Home-Compostable Coffee Pods',
          'Sea Salt Oven-Roasted Nut Mix', 'Plant Protein Smoothie Blend', 'Unsweetened Apple Sauce Pouches', 'Hearty Lentil Vegetable Soup Mix',
          'Ancient Grains and Wild Rice Blend', 'Sparkling Mineral Water Glass Pack', 'Cold-Pressed Olive Oil', 'Organic Maple Syrup Grade A',
          'Stone-Ground Whole Wheat Flour', 'Coconut Aminos Seasoning', 'Chia Pudding Mix Vanilla', 'Roasted Seaweed Snack Pack',
          'Pickled Fermented Vegetables', 'Almond Butter Crunchy', 'Herbal Rooibos Chai Bags', 'Freeze-Dried Berry Mix',
          'Sourdough Bread Mix', 'Spiced Apple Cider Concentrate', 'Brown Rice Noodles', 'Mineral Electrolyte Tablets'
        ])[n]
        WHEN 'tech' THEN (ARRAY[
          'Recycled Phone Case', 'Solar Power Bank', 'Bamboo Keyboard Wrist Rest', 'Eco Cable Organizer',
          'Bioplastic Earbud Case', 'Energy Saving Smart Plug', 'Recycled Laptop Sleeve', 'USB-C Charging Cable Braided',
          'Webcam Privacy Slider', 'Desk Lamp LED Wooden', 'Bluetooth Speaker Hemp', 'Wireless Mouse Recycled',
          'Tablet Stand Bamboo', 'Screen Cleaning Kit Plant', 'Portable SSD Enclosure', 'Laptop Stand Aluminum',
          'USB Hub Powered', 'Monitor Riser Cork', 'Phone Tripod Mini', 'RFID Blocking Card Sleeve',
          'Stylus Pen Bamboo', 'Over-Ear Headphones Repair Kit', 'Cable Label Set', 'Surge Protector Strip',
          'Webcam 1080p Clip', 'Mouse Pad Cork', 'Travel Adapter Universal', 'Battery Recycling Mailer'
        ])[n]
      END AS item_name,
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY[
          'Soft daily tee in GOTS-certified organic cotton with a relaxed fit.', 'Classic-fit jacket in denim woven with recycled cotton and polyester.', 'Midweight hoodie blending organic cotton and hemp for year-round wear.', 'Breathable shirt in European linen with organic cotton trim.',
          'Cozy sweater spun with recycled fibers to cut virgin wool use.', 'Loungewear jersey from bamboo viscose blended with organic cotton.', 'Low-profile sneakers with organic cotton canvas and natural rubber soles.', 'Warm zip hoodie in recycled polyester fleece with ribbed cuffs.',
          'Lightweight linen shorts with drawcord waist for warm days.', 'Soft merino beanie from fair-trade wool with minimal itch.', 'Sandals with cork footbed and adjustable straps.', 'High-rise leggings from recycled PET with four-way stretch.',
          'Camp collar shirt in Tencel lyocell with corozo buttons.', 'Tote stitched from upcycled banner fabric with cotton lining.', 'Three-pack crew socks in organic cotton with reinforced heels.', 'Swim shorts lined with fabric made from ocean-bound plastic.',
          'Open cardigan in alpaca blend with patch pockets.', 'Vegan belt from pineapple leaf fiber with brass buckle.', 'Square bandana dyed with plant extracts; color may vary.', 'Two-piece pajama set in GOTS cotton with elastic waist.',
          'Packable windbreaker in recycled ripstop with hood.', 'Indoor slippers with cork sole and wool felt upper.', 'Large market tote in heavy hemp canvas with long handles.', 'Lightweight scarf with natural tie-dye pattern.',
          'Soft wrap in recycled cashmere blend for cool evenings.', 'Pinafore dress in linen blend with side pockets.', 'Statement coat from upcycled event banners; each piece is unique.', 'Ribbed tank in bamboo viscose for layering.'
        ])[n]
        WHEN 'home' THEN (ARRAY[
          'Hand-blown vase from recycled glass with a soft green tint.', 'Side table in FSC-certified solid wood with low-VOC finish.', 'Area rug in undyed jute and wool for living spaces.', 'LED lamp with warm dimming and recycled aluminum heat sink.',
          'Glass storage jars with bamboo lids for pantry staples.', 'Throw blanket woven from GOTS organic cotton.', 'Decor basket upcycled from textile offcuts and cotton rope.', 'Notebook trio with recycled-card covers and dot-grid pages.',
          'Bamboo desk organizer with trays for pens and accessories.', 'Refillable pen set with compostable ink cartridges.', 'Cork desk mat sized for mouse and compact keyboard.', 'Sticky notes made from sugarcane paper with gentle adhesive.',
          'Weekly planner on FSC paper with lay-flat binding.', 'Reusable cable ties for laptop and charger cords.', 'Two cushion covers in heavy hemp blend with hidden zippers.', 'Set of six wool dryer balls to soften laundry without sheets.',
          'Round coasters in laminated bamboo with cork backing.', 'Borosilicate teapot with stainless infuser and bamboo handle.', 'Four hemstitched napkins in stone-washed linen.', 'Pillar candle with cotton wick in recycled glass holder.',
          'Two unglazed terracotta pots with drainage saucers.', 'Hand-woven rattan hamper with cotton liner and lid.', 'Six cork tiles for pinning notes; adhesive squares included.', 'Throw in recycled wool with fringed edges.',
          'Tin of soy wax melts with botanical essential oils.', 'Dense jute mat with latex backing for doorways.', 'Leak-proof stainless bento with bamboo lid and divider.', 'Two small ceramic cellars for salt and pepper.'
        ])[n]
        WHEN 'personal-care' THEN (ARRAY[
          'Fluoride-free toothpaste tablets with peppermint polish.', 'Compostable floss on a refillable glass spool.', 'Concentrated hand wash; mix with water in a reusable dispenser.', 'Gentle face cleanser with aloe and coconut-derived surfactants.',
          'Bamboo toothbrush set with soft plant-based bristles.', 'Body lotion with shea butter and fast-absorbing plant oils.', 'Solid conditioner bar to skip plastic bottles in the shower.', 'Weighted safety razor with replaceable steel blades.',
          'Two konjac sponges for gentle daily exfoliation.', 'Rich lip balm in a sliding tin; unscented option.', 'Talc-free powder refreshes hair between washes.', 'Silicone-tipped swabs you wash and reuse.',
          'Baking soda and mineral stick with push-up paper tube.', 'Brushless cream with aloe for wet shaving.', 'Empty amber glass bottle fits standard pumps.', 'Natural pumice on bamboo handle for heels.',
          'Cooling spray with tea tree and witch hazel.', 'Cold-pressed rosehip oil for evening routine.', 'Activated charcoal polish for weekly whitening.', 'Silk floss in a refillable metal dispenser.',
          'Rich oat and calendula cream for dry hands.', 'Cotton buds on bamboo sticks in recycled box.', 'Fizzing tablets with essential oils for spa showers.', 'Mineral SPF lip balm in paper tube.',
          'Linen spray with lavender for pillows and linens.', 'Absorbent powder with chamomile; talc-free.', 'Mouthwash tablets dissolve in water in a jar.', 'Flexible fabric bandage on a compostable spool.'
        ])[n]
        WHEN 'kitchen' THEN (ARRAY[
          'Set of metal straws plus a slender cleaning brush and pouch.', 'Five-piece bamboo utensil set for cooking and serving.', 'Leak-proof silicone bags for freezer, lunch, and sous-vide.', 'Countertop compost caddy with replaceable charcoal filter.',
          'Glass meal-prep containers with snap lids for leftovers.', 'GOTS organic cotton mesh bags for produce runs.', 'Reusable food wraps using beeswax on organic cotton.', 'Pre-seasoned cast iron skillet sized for daily cooking.',
          'Three cork trivets that protect counters from hot pans.', 'Borosilicate cruet with pourer for oils and vinegars.', 'Adjustable neck apron in heavy hemp with pockets.', 'Portion rings for spaghetti in brushed stainless.',
          'Half-sheet silicone mat; oven safe to high heat.', 'Stone mortar with pestle for spices and pastes.', 'Pair of carved wood servers for greens.', 'Fine mesh basket for loose leaf in mugs or pots.',
          'Plant-fiber sponges; compost when worn.', 'Reversible board with juice groove.', 'Six square jars with shaker lids and chalk labels.', 'Stretch lids for bowls and cans in multiple sizes.',
          'Drawstring bag keeps bread crusty longer.', 'Metal tray makes large slow-melting cubes.', 'Two polished coconut shells for smoothie bowls.', 'Cotton covers with elastic for leftovers.',
          'Enamel-coated steel kettle for gas and electric.', 'Pack of waffle-weave cloths for drying dishes.', 'Wide-mouth jar with airlock for kraut and kimchi.', 'Tampico bristles on beech handle for pots.'
        ])[n]
        WHEN 'beauty' THEN (ARRAY[
          'Tinted lip balm in a refillable aluminum slider.', 'Mascara built with plant waxes and mineral pigment.', 'Twelve makeup brushes with bamboo handles and vegan fibers.', 'Washable cotton rounds for toner and makeup removal.',
          'Tinted moisturizer with non-nano mineral SPF.', 'Clay face mask powder you mix fresh with water.', 'Pressed mineral blush in a compact paper sleeve.', 'Water-resistant brow pomade in a glass jar.',
          'Loose powder refill for your existing magnetic compact.', 'Gel pencil with smudger tip; sharpener included.', 'Two complementary shades in a paper palette.', 'Four-sided buffer for natural nail shine.',
          'Micellar in returnable glass with aluminum cap.', 'Light oil removes sunscreen and long-wear makeup.', 'Rich overnight treatment for cracked lips.', 'Heart-shaped konjac for cheeks and T-zone.',
          'Fibrous gel shapes brows without flaking.', 'Cream stick highlighter with subtle pearl.', 'Twist-up crayon with plant waxes.', 'Solid balm melts away makeup; rinse clean.',
          'Dense kabuki for mineral foundation buffing.', 'Water-based polish in earth-tone shades.', 'Brush-on cuticle oil with vitamin E.', 'Rose hydrosol mist for setting and refresh.',
          'Plant-based glitter for festival looks.', 'Precision swabs for makeup fixes.', 'Broad-spectrum stick for nose and ears.', 'Shader and crease brushes in travel sleeve.'
        ])[n]
        WHEN 'outdoors' THEN (ARRAY[
          'Daypack with recycled ripstop shell and breathable harness.', 'Insulated steel bottle that keeps drinks cold or hot for hours.', 'Rechargeable camp lantern with dimmable warm LED.', 'Travel cutlery set in a roll: knife, fork, spoon, chopsticks.',
          'Picnic blanket with recycled-fiber backing and cotton top.', 'Cork and natural rubber yoga mat for studio or trail.', 'Plant-based wet wipes for quick cleanup; compost where accepted.', 'Compost starter mix with brown and green balance tips.',
          'Biodegradable seedling pots that break down in garden soil.', 'Planter box from reclaimed wood with drainage tray.', 'Rain barrel kit with food-grade liner and diverter.', 'Herb growing kit with organic soil discs and seed sachets.',
          'Coir mulch mat to hold moisture and block weeds.', 'Bamboo plant labels you can write on for rows and beds.', 'Lightweight aluminum poles with cork grips.', 'Warm beanie in recycled PET fleece.',
          'Tree-friendly straps and stuff sack included.', 'Warm-white LEDs on copper wire; solar charged.', '1.2 L bowl folds flat for backpacking meals.', 'Ankle gaiters keep debris out of boots.',
          'Treated canvas tarp for shelter or ground cover.', 'Sawdust and wax cubes for damp wood.', 'Squeeze filter rated for trail bacteria.', 'Climbing rope construction with locking carabiner.',
          'Cedar feeder with plexi windows.', 'Modular barrels link for more capacity.', 'Alloy frame with recycled PET seat.', 'OMRI-listed blend for containers and beds.'
        ])[n]
        WHEN 'kids' THEN (ARRAY[
          'Organic cotton onesie with snap shoulders for easy changes.', 'Teething ring molded from natural rubber without BPA.', 'Bamboo kids plate and cup set with divided sections.', 'Storybook set printed on FSC paper with soy inks.',
          'Silicone snack pouch for purees and finger foods.', 'Wooden blocks with water-based paints for toddlers.', 'Muslin swaddle blanket in breathable organic cotton.', 'Three-layer burp cloths with snap for shoulder.',
          'Sippy cup with wheat-straw composite and silicone spout.', 'Chunky rock-shaped crayons easy for small hands.', 'No-pedal balance bike from birch plywood.', 'Wide-brim hat with chin strap; UPF rated fabric.',
          'Three floating boats in natural rubber.', 'LED owl with warm dimmer and timer.', 'Large foam puzzle pieces with farm animals.', 'Stroller caddy in hemp canvas with cup holders.',
          'Infant booties in merino wool blend.', 'Wide pocket catches spills; rolls for travel.', 'Canvas chart with non-toxic ink markers.', 'Soft toy stuffed with recycled PET fiber.',
          'Insulated snack jar keeps food warm or cold.', 'Mix-with-water finger paints from plant pigments.', 'Fitted sheet in jersey knit organic cotton.', 'Mini backpack with chest clip and reflective trim.',
          'Bubble solution in paper bottle; wood wand.', 'Sound buttons with bird and forest recordings.', 'Silicone helper attaches to regular chopsticks.', 'Mineral SPF in push-up paper tube for babies.'
        ])[n]
        WHEN 'food-drink' THEN (ARRAY[
          'Whole-bean arabica coffee roasted medium; sourced from grower cooperatives with transparent farm-gate pricing.', 'Loose-leaf herbal infusion: caffeine-free botanical blend in a steel caddy—steep three to five minutes in hot water.', 'Small-batch kombucha: live cultures, light carbonation, and organic cane sugar; sold in returnable glass where the refill program operates.', 'Raw wildflower honey with minimal filtration; traceable to regional apiaries that prioritize hive health and forage diversity.',
          'Dark chocolate bar with a high-cocoa recipe; cocoa mass and butter from fair-trade certified farms and a short ingredient list.', 'Bronze-cut organic durum pasta, slow-dried so sauces cling; pantry staple for quick weeknight bowls and bakes.', 'Sprouted-grain granola: oven-toasted clusters of oats, seeds, and coconut chips with maple sweetness—crunchy, not dusty.', 'Specialty-grade coffee sealed in home- or industrially compostable pods where local rules allow; check your compost service.',
          'Savory snack mix of almonds, cashews, and peanuts, oven-roasted with sea salt and packed in a paper pouch with plant-based liner.', 'Vegan protein powder blending pea and rice protein with coconut sugar; stirs smoothly into smoothies and plant milks.', 'Unsweetened apple sauce in squeeze pouches: apples and a touch of vitamin C only; pouches recyclable via participating drop-off schemes.', 'Hearty dry soup mix: red lentils, pearl barley, dehydrated vegetables, and spices—simmer twenty-five minutes with water or broth.',
          'Side-dish grain mix of brown rice, wild rice, and red quinoa; rinse, then simmer until tender and fluffy.', 'Sparkling mineral water from a protected spring, bottled in glass with aluminum caps; variety pack of plain and light natural essences.', 'Extra-virgin oil from single-estate olives; cold-pressed within hours of harvest.', 'Dark amber syrup from certified sugar bush; great on oatmeal and baking.',
          'Stone-milled whole wheat for hearty loaves and pancakes.', 'Soy-free alternative to soy sauce; coconut sap and sea salt.', 'Add plant milk overnight for ready chia pudding.', 'Lightly salted nori sheets roasted in batches.',
          'Probiotic-rich kraut and kimchi in glass jars.', 'Single-ingredient almonds, lightly roasted.', 'Caffeine-free spiced blend in compostable tea bags.', 'No sugar added; crunchy snack or cereal topper.',
          'Dry mix with dehydrated starter culture instructions.', 'Concentrate dilutes into hot spiced cider for gatherings.', 'Rice and water only; quick-cooking gluten-free noodles.', 'Dissolve in water after exercise; light citrus flavor.'
        ])[n]
        WHEN 'tech' THEN (ARRAY[
          'Phone case molded from recycled handset plastics where noted.', 'Solar-assisted power bank for phones on multi-day trips.', 'Keyboard wrist rest with laminated bamboo and cork base.', 'Cable organizer kit with silicone ties and printed labels.',
          'Earbud case in a bio-based polymer shell.', 'Smart plug with scheduling to trim standby energy use.', 'Laptop sleeve with recycled nylon shell and fleece lining.', 'Braided sleeve from recycled PET; supports fast charge.',
          'Stick-on slider covers laptop camera when not in use.', 'Warm LED desk lamp with solid wood base and dimmer.', 'Compact speaker with hemp fabric grill and recycled housing.', 'Ergonomic mouse with shell from recycled ABS.',
          'Foldable stand for tablets up to eleven inches.', 'Spray and cloth safe for coated screens; refillable bottle.', 'Aluminum enclosure for NVMe drives; tool-free latch.', 'Raises laptop eye level; ventilated for cooling.',
          'Four USB-A ports with BC charging and LED indicator.', 'Elevates monitor with storage nook; cork feet.', 'Flexible legs wrap around poles or stand on desk.', 'Slim sleeve blocks RFID skimming in wallet.',
          'Passive stylus with bamboo barrel for touch screens.', 'Screws, pads, and headband parts to extend headphone life.', 'Color-coded labels for home and office cable runs.', 'Seven outlets with master switch and joule protection.',
          'Autofocus HD webcam with privacy shutter.', 'Natural cork surface with nonslip backing.', 'Type-C and USB-A ports for EU UK US plugs.', 'Prepaid mailer recycles small batteries responsibly.'
        ])[n]
      END AS item_description,
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY[
          '100% GOTS organic cotton jersey', 'Recycled cotton, recycled polyester denim', 'Organic cotton, hemp, elastane', 'European linen, organic cotton trim',
          'Recycled wool blend, recycled acrylic', 'Bamboo viscose, organic cotton', 'Organic cotton canvas, natural rubber', 'Recycled polyester fleece, organic cotton rib',
          'European linen, coconut-button fly', 'Fair-trade merino wool', 'Cork, vegetable-tanned leather alternative', 'Recycled PET, elastane',
          'Tencel lyocell, corozo nut buttons', 'Upcycled PVC banner, organic cotton lining', 'GOTS organic cotton, elastane', 'Recycled ocean plastic blend, mesh liner',
          'Alpaca, recycled nylon', 'Pinafiber, brass buckle', 'Organic cotton, plant dyes', 'GOTS organic cotton twill',
          'Recycled nylon ripstop, DWR finish', 'Cork, wool felt, natural rubber', 'Hemp canvas, cotton webbing', 'Organic cotton, natural dyes',
          'Recycled cashmere, wool', 'Linen, viscose lining', 'Upcycled synthetic banner, cotton trim', 'Bamboo viscose, elastane'
        ])[n]
        WHEN 'home' THEN (ARRAY[
          'Recycled glass', 'FSC-certified solid hardwood, low-VOC finish', 'Jute, undyed wool', 'LED module, recycled aluminum, steel base',
          'Borosilicate glass, bamboo lid', 'GOTS organic cotton', 'Recycled cotton rope, pine frame', 'Recycled paper, kraft cover',
          'Bamboo ply, steel hardware', 'Recycled plastic barrel, plant-based ink', 'Natural cork', 'Sugarcane paper, low-tack adhesive',
          'FSC paper, linen thread', 'Recycled PET hook-and-loop, elastic', 'Hemp, organic cotton', 'New Zealand wool',
          'Moso bamboo, cork', 'Borosilicate glass, stainless steel', 'European linen', 'Soy wax, cotton wick, glass',
          'Terracotta clay', 'Rattan, cotton liner', 'Natural cork, adhesive', 'Recycled wool, acrylic blend',
          'Soy wax, essential oils, tin', 'Jute, natural rubber backing', '18/8 stainless steel, bamboo', 'Stoneware ceramic'
        ])[n]
        WHEN 'personal-care' THEN (ARRAY[
          'Sorbitol, calcium carbonate, peppermint oil', 'Corn PLA filament, candelilla wax, glass spool', 'Coconut-derived surfactants, glycerin, essential oils', 'Aloe juice, chamomile extract, mild surfactants',
          'Bamboo, castor-oil based bristles', 'Shea butter, sunflower oil, vitamin E', 'Coconut oil, BTMS, essential oils', 'Brass alloy, steel blades',
          'Konjac root fiber', 'Shea butter, beeswax, vitamin E', 'Arrowroot, kaolin clay, cocoa powder', 'Medical-grade silicone, stainless case',
          'Coconut oil, magnesium, essential oils', 'Aloe, glycerin, plant stearic acid', 'Soda-lime glass', 'Pumice stone, bamboo',
          'Witch hazel, tea tree oil, water', 'Rosa canina seed oil', 'Charcoal, bentonite clay, mint oil', 'Peace silk, stainless steel case',
          'Oat kernel oil, shea butter', 'Organic cotton, bamboo stem', 'Citric acid, baking soda, oils', 'Zinc oxide, coconut oil, beeswax',
          'Lavender hydrosol, alcohol from grain', 'Cornstarch, kaolin, chamomile', 'Sodium bicarbonate, xylitol, oils', 'Bamboo fiber, natural latex adhesive'
        ])[n]
        WHEN 'kitchen' THEN (ARRAY[
          '18/8 stainless steel, nylon brush', 'Moso bamboo, food-grade oil', 'Platinum silicone, BPA-free', 'Recycled plastic, activated charcoal filter',
          'Tempered glass, polypropylene lid', 'GOTS organic cotton mesh', 'Organic cotton, beeswax, tree resin', 'Cast iron, vegetable oil seasoning',
          'Agglomerated cork', 'Borosilicate glass, stainless pourer', 'Hemp canvas, cotton straps', 'Stainless steel',
          'Silicone embedded with fiberglass', 'Granite stone, wood pestle', 'Olive wood', 'Stainless steel mesh, silicone handle',
          'Cellulose, plant fiber', 'Bamboo, mineral oil finish', 'Soda-lime glass, stainless cap', 'Platinum silicone',
          'Organic cotton, beeswax lining', 'Stainless steel', 'Coconut shell, plant lacquer', 'Organic cotton, elastic',
          'Enameled steel, beech handle', 'Organic cotton', 'Glass, silicone airlock, steel spring', 'Beech wood, tampico fiber'
        ])[n]
        WHEN 'beauty' THEN (ARRAY[
          'Castor oil, candelilla wax, refill pod', 'Plant waxes, iron oxide pigments', 'Bamboo, synthetic taklon (vegan)', 'Organic cotton flannel',
          'Zinc oxide, shea butter, jojoba', 'Kaolin clay, aloe, green tea extract', 'Mica, jojoba oil, vitamin E', 'Castor wax, pigments, glass',
          'Mica, rice starch, refill pouch', 'Plant oils, mineral pigments', 'Mica, shea, paper compact', 'Sandpaper grits, recycled paper',
          'Micellar water, glass, aluminum', 'Simmondsia chinensis oil', 'Shea, squalane, berry wax', 'Konjac, charcoal infusion',
          'Cellulose fibers, glycerin', 'Mica, coconut oil, candelilla', 'Candelilla, pigments, paper', 'Sunflower oil, emulsifying wax',
          'Dense synthetic, bamboo handle', 'Water base, mineral pigments', 'Jojoba, vitamin E, brush', 'Rose water, glycerin, glass',
          'Cellulose glitter, aloe base', 'Bamboo, organic cotton tips', 'Zinc oxide, shea, paper tube', 'Synthetic taklon, aluminum ferrule'
        ])[n]
        WHEN 'outdoors' THEN (ARRAY[
          'Recycled polyester ripstop, nylon webbing', '18/8 stainless steel, polypropylene lid', 'ABS housing, lithium cell, LED', 'Stainless steel, bamboo, cotton roll',
          'Recycled PET fleece, organic cotton', 'Natural cork, natural rubber', 'Wood pulp viscose, aloe extract', 'Coconut coir, alfalfa meal, gypsum',
          'Recycled paper pulp, natural latex binder', 'Reclaimed pine, natural oil finish', 'Recycled HDPE, brass hardware', 'Organic coir, non-GMO seeds',
          'Natural coconut coir fiber', 'Moso bamboo', '7075 aluminum, cork', 'Recycled polyester fleece',
          'Parachute nylon, polyester strap', 'Monocrystalline panel, copper wire', 'Platinum silicone, nylon rim', 'Recycled polyester, elastic',
          'Cotton canvas, beeswax', 'Wood fiber, natural wax', 'Hollow-fiber membrane, BPA-free housing', 'Recycled climbing rope, aluminum',
          'Western red cedar, acrylic', 'Recycled PE barrel, brass spigot', 'Aluminum alloy, recycled fabric', 'Peat-free compost, coco coir, perlite'
        ])[n]
        WHEN 'kids' THEN (ARRAY[
          'GOTS organic cotton', 'Hevea natural rubber', 'Bamboo fiber, plant-based lacquer', 'FSC paper, soy ink',
          'Platinum silicone', 'Beech wood, water-based paint', 'Organic cotton muslin', 'Organic cotton, bamboo rayon',
          'Wheat straw composite, silicone', 'Natural wax pigments, soy', 'Birch plywood, rubber tires', 'Organic cotton canvas',
          'Natural rubber', 'ABS, LED, recycled plastic base', 'EVA foam, soy ink print', 'Hemp canvas, recycled polyester lining',
          'Merino wool, elastane', 'Platinum silicone', 'Organic cotton canvas', 'Recycled PET plush, organic cotton shell',
          '18/8 stainless steel', 'Corn starch, mineral pigments', 'GOTS organic cotton jersey', 'Recycled PET, nylon straps',
          'Beech wood, castile soap base', 'FSC board, soy ink, electronics', 'Silicone, BPA-free', 'Zinc oxide, coconut oil, beeswax'
        ])[n]
        WHEN 'food-drink' THEN (ARRAY[
          'Arabica coffee, kraft bag, plant-based liner', 'Organic herbs, steel tin', 'Brewed tea, organic cane sugar, live cultures, glass bottle', 'Raw honey, glass jar, metal lid',
          'Cocoa mass, cocoa butter, coconut sugar', 'Organic durum wheat semolina', 'Sprouted oats, sunflower seeds, maple syrup, coconut oil', 'Bio-based capsule, specialty arabica',
          'Almonds, cashews, peanuts, sea salt', 'Pea protein, rice protein, coconut sugar, natural flavors', 'Organic apples, ascorbic acid, recyclable pouch film', 'Red lentils, pearl barley, dried vegetables, spices, glass jar',
          'Brown rice, wild rice, red quinoa', 'Natural mineral water, glass, aluminum cap', 'Organic olives, dark glass bottle', 'Pure maple syrup, glass',
          'Organic hard red wheat', 'Coconut sap, sea salt', 'Chia seeds, coconut sugar, vanilla', 'Nori, sesame oil, sea salt',
          'Cabbage, chili, garlic, salt, glass', 'Roasted almonds, glass jar', 'Rooibos, spices, compostable filter paper', 'Strawberry, blueberry, raspberry, nothing else',
          'Wheat flour, dehydrated starter, salt', 'Apple juice concentrate, spices, citric acid', 'Brown rice flour, water', 'Sodium, potassium, magnesium, citric acid, stevia'
        ])[n]
        WHEN 'tech' THEN (ARRAY[
          'Recycled polycarbonate blend', 'Lithium cells, monocrystalline solar strip', 'Bamboo laminate, cork', 'Silicone, recycled PET tags',
          'Bio-based polymer', 'Fire-rated ABS, Wi-Fi radio', 'Recycled nylon, recycled polyester fleece', 'Recycled PET braid, copper conductors',
          'ABS, adhesive pad', 'Solid ash, LED module, steel', 'Hemp fabric, recycled plastic housing', 'Recycled ABS, PTFE feet',
          'Bamboo ply, steel hinge', 'Plant surfactants, microfiber, glass bottle', 'Aluminum, USB 3.2 controller', 'Recycled aluminum, silicone pads',
          'ABS, copper ports, steel housing', 'Cork, steel frame', 'ABS, silicone, rubber feet', 'Recycled PET, copper mesh',
          'Bamboo, conductive rubber tip', 'Steel screws, protein leather pads', 'Recycled paper, soy ink', 'Steel, MOV, copper busbar',
          'Glass lens, ABS, CMOS sensor', 'Natural cork, recycled rubber', 'Polycarbonate, brass pins', 'Cardboard, prepaid postage'
        ])[n]
      END AS item_materials
  ) t
)
INSERT INTO products (category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg)
SELECT category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg
FROM generated
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  materials = EXCLUDED.materials,
  sustainability_score = EXCLUDED.sustainability_score,
  carbon_footprint_saving_kg = EXCLUDED.carbon_footprint_saving_kg;



-- ========== STORAGE: product-images bucket (Profile avatars + Admin product uploads) ==========
-- If avatar or admin image upload fails in the app, run this section (or migration 003) once.

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
        EXISTS (SELECT 1 FROM dev_tools_allowlist d WHERE d.user_id = auth.uid())
        OR COALESCE((SELECT p.role FROM profiles p WHERE p.id = auth.uid()), 'user') IN ('owner', 'developer', 'admin')
      )
    )
  )
);

-- ========== CATEGORY IMAGES (Home cards) ==========
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
    EXISTS (SELECT 1 FROM dev_tools_allowlist d WHERE d.user_id = auth.uid())
    OR COALESCE((SELECT p.role FROM profiles p WHERE p.id = auth.uid()), 'user') IN ('owner', 'developer', 'admin')
  );
