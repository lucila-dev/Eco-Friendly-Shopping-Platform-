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

DROP POLICY IF EXISTS "Managers can insert products" ON products;
DROP POLICY IF EXISTS "Managers can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;
CREATE POLICY "Managers can insert products" ON products FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'developer', 'admin'));
CREATE POLICY "Managers can update products" ON products FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'developer', 'admin'));
CREATE POLICY "Managers can delete products" ON products FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'developer', 'admin'));

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
-- Seed data: categories and products
-- Run after 001_initial_schema.sql.

INSERT INTO categories (id, name, slug, description) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Fashion', 'fashion', 'Eco-friendly clothing and accessories'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Home', 'home', 'Sustainable home and living products'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Personal Care', 'personal-care', 'Natural and low-waste personal care'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Kitchen', 'kitchen', 'Low-waste and reusable kitchen essentials'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Beauty', 'beauty', 'Clean beauty and sustainable cosmetics'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Outdoors', 'outdoors', 'Sustainable products for outdoor lifestyles'),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Kids', 'kids', 'Eco-friendly items for babies and children'),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'Office', 'office', 'Sustainable office and study supplies'),
  ('a1b2c3d4-0009-4000-8000-000000000009', 'Tech', 'tech', 'Energy-efficient and responsible tech accessories'),
  ('a1b2c3d4-0010-4000-8000-000000000010', 'Garden', 'garden', 'Eco-conscious gardening products')
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

-- Generate 210 category-specific products across 10 categories (21 per category)
WITH category_map AS (
  SELECT id, slug,
    CASE slug
      WHEN 'fashion' THEN 'Organic cotton, hemp blend'
      WHEN 'home' THEN 'Recycled glass, FSC wood'
      WHEN 'personal-care' THEN 'Plant oils, natural extracts'
      WHEN 'kitchen' THEN 'Bamboo, stainless steel'
      WHEN 'beauty' THEN 'Vegan waxes, mineral pigments'
      WHEN 'outdoors' THEN 'Recycled nylon, cork'
      WHEN 'kids' THEN 'Organic cotton, natural rubber'
      WHEN 'office' THEN 'Recycled paper, bamboo fiber'
      WHEN 'tech' THEN 'Recycled aluminum, bio-plastic'
      WHEN 'garden' THEN 'Compostable fiber, reclaimed wood'
      ELSE 'Recycled materials'
    END AS materials
  FROM categories
  WHERE slug IN ('fashion','home','personal-care','kitchen','beauty','outdoors','kids','office','tech','garden')
), generated AS (
  SELECT
    c.id AS category_id,
    t.item_name AS name,
    c.slug || '-' || regexp_replace(lower(t.item_name), '[^a-z0-9]+', '-', 'g') || '-' || n AS slug,
    t.item_description AS description,
    round((9 + (n % 50) * 1.35)::numeric, 2) AS price,
    t.image_url,
    (5 + (n % 6))::smallint AS sustainability_score,
    c.materials,
    round((0.6 + (n % 15) * 0.35)::numeric, 2) AS carbon_footprint_saving_kg
  FROM category_map c
  CROSS JOIN generate_series(1, 21) AS n
  CROSS JOIN LATERAL (
    SELECT
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY['Organic Cotton Tee','Recycled Denim Jacket','Hemp Blend Hoodie','Linen Everyday Shirt','Recycled Knit Sweater','Bamboo Lounge Pants','Vegan Canvas Sneakers'])[((n - 1) % 7) + 1]
        WHEN 'home' THEN (ARRAY['Recycled Glass Vase','FSC Wood Side Table','Natural Fiber Rug','Low Energy LED Lamp','Reusable Storage Jars','Organic Cotton Throw','Upcycled Decor Basket'])[((n - 1) % 7) + 1]
        WHEN 'personal-care' THEN (ARRAY['Natural Toothpaste Tabs','Compostable Floss Kit','Refillable Hand Wash','Plant-Based Face Cleanser','Bamboo Toothbrush Set','Eco Body Lotion','Solid Conditioner Bar'])[((n - 1) % 7) + 1]
        WHEN 'kitchen' THEN (ARRAY['Stainless Steel Straw Set','Bamboo Cooking Utensils','Reusable Silicone Food Bags','Compost Bin Caddy','Glass Meal Prep Containers','Cotton Produce Bags','Beeswax Food Wrap Kit'])[((n - 1) % 7) + 1]
        WHEN 'beauty' THEN (ARRAY['Refillable Lip Balm','Vegan Mascara Tube','Eco Makeup Brush Set','Reusable Cotton Rounds','Natural Tint Moisturizer','Plastic-Free Face Mask','Mineral Blush Compact'])[((n - 1) % 7) + 1]
        WHEN 'outdoors' THEN (ARRAY['Recycled Trail Backpack','Insulated Steel Bottle','Solar Camp Lantern','Reusable Travel Cutlery','Eco Picnic Blanket','Cork Yoga Mat','Compostable Wet Wipes'])[((n - 1) % 7) + 1]
        WHEN 'kids' THEN (ARRAY['Organic Baby Onesie','Natural Rubber Teether','Bamboo Kids Plate Set','Eco Story Book Set','Reusable Snack Pouch','Wooden Learning Blocks','Organic Cotton Blanket'])[((n - 1) % 7) + 1]
        WHEN 'office' THEN (ARRAY['Recycled Notebook Pack','Bamboo Desk Organizer','Refillable Pen Set','Cork Mouse Pad','Eco Sticky Notes','FSC Paper Planner','Reusable Cable Ties'])[((n - 1) % 7) + 1]
        WHEN 'tech' THEN (ARRAY['Recycled Phone Case','Solar Power Bank','Bamboo Keyboard Wrist Rest','Eco Cable Organizer','Bioplastic Earbud Case','Energy Saving Smart Plug','Recycled Laptop Sleeve'])[((n - 1) % 7) + 1]
        WHEN 'garden' THEN (ARRAY['Compost Starter Kit','Biodegradable Seed Pots','Reclaimed Wood Planter','Rainwater Collection Barrel','Organic Herb Grow Set','Natural Coir Mulch Mat','Bamboo Plant Labels'])[((n - 1) % 7) + 1]
      END || ' ' || (ARRAY['Core', 'Plus', 'Premium'])[((n - 1) / 7) + 1] AS item_name,
      'Category-specific sustainable product designed for lower-impact everyday use.' AS item_description,
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY[
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
          'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
          'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
          'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'home' THEN (ARRAY[
          'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=400',
          'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400',
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400',
          'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400',
          'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=400',
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400',
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'personal-care' THEN (ARRAY[
          'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400',
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
          'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
          'https://images.unsplash.com/photo-1559591935-c6c23a6f3bce?w=400',
          'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400',
          'https://images.unsplash.com/photo-1607006483224-5340f1e9d2b7?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'kitchen' THEN (ARRAY[
          'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=400',
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
          'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=400',
          'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=400',
          'https://images.unsplash.com/photo-1525328437458-0c4d4db7cab4?w=400',
          'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400',
          'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'beauty' THEN (ARRAY[
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
          'https://images.unsplash.com/photo-1583241800698-d4b7f1d3e6b5?w=400',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
          'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
          'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
          'https://images.unsplash.com/photo-1617897903246-719242758050?w=400',
          'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'outdoors' THEN (ARRAY[
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400',
          'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=400',
          'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
          'https://images.unsplash.com/photo-1499696010181-529a2df2828b?w=400',
          'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400',
          'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=400',
          'https://images.unsplash.com/photo-1455218873509-8097305ee378?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'kids' THEN (ARRAY[
          'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400',
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
          'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400',
          'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400',
          'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400',
          'https://images.unsplash.com/photo-1519340333755-c6e9f6b88a45?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'office' THEN (ARRAY[
          'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400',
          'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400',
          'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
          'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=400',
          'https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=400',
          'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400',
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'tech' THEN (ARRAY[
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
          'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
          'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=400',
          'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400',
          'https://images.unsplash.com/photo-1580894908361-967195033215?w=400',
          'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'garden' THEN (ARRAY[
          'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400',
          'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400',
          'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
          'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400',
          'https://images.unsplash.com/photo-1492496913980-501348b61469?w=400',
          'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400',
          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400'
        ])[((n - 1) % 7) + 1]
      END AS image_url
  ) t
)
INSERT INTO products (category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg)
SELECT category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg
FROM generated
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  materials = EXCLUDED.materials,
  sustainability_score = EXCLUDED.sustainability_score,
  carbon_footprint_saving_kg = EXCLUDED.carbon_footprint_saving_kg;

-- Enforce stronger name-to-image matching for generated catalog items
UPDATE products
SET image_url = CASE
  WHEN name ILIKE '%Backpack%' THEN 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200'
  WHEN name ILIKE '%Onesie%' THEN 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=1200'
  WHEN name ILIKE '%Jacket%' THEN 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200'
  WHEN name ILIKE '%Tee%' OR name ILIKE '%Shirt%' THEN 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200'
  WHEN name ILIKE '%Sneakers%' THEN 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200'
  WHEN name ILIKE '%Bottle%' THEN 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=1200'
  WHEN name ILIKE '%Lantern%' THEN 'https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=1200'
  WHEN name ILIKE '%Yoga Mat%' THEN 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=1200'
  WHEN name ILIKE '%Toothbrush%' THEN 'https://images.unsplash.com/photo-1559591935-c6c23a6f3bce?w=1200'
  WHEN name ILIKE '%Toothpaste%' THEN 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=1200'
  WHEN name ILIKE '%Shampoo%' OR name ILIKE '%Conditioner%' THEN 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200'
  WHEN name ILIKE '%Straw%' THEN 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=1200'
  WHEN name ILIKE '%Utensils%' OR name ILIKE '%Cutlery%' THEN 'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=1200'
  WHEN name ILIKE '%Vase%' THEN 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1200'
  WHEN name ILIKE '%Planter%' OR name ILIKE '%Pots%' OR name ILIKE '%Garden%' THEN 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200'
  WHEN name ILIKE '%Notebook%' OR name ILIKE '%Planner%' OR name ILIKE '%Pen%' THEN 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1200'
  WHEN name ILIKE '%Phone Case%' OR name ILIKE '%Laptop Sleeve%' OR name ILIKE '%Power Bank%' THEN 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200'
  WHEN name ILIKE '%Lip Balm%' OR name ILIKE '%Mascara%' OR name ILIKE '%Blush%' OR name ILIKE '%Makeup%' THEN 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200'
  ELSE image_url
END
WHERE slug LIKE '%-core-%' OR slug LIKE '%-plus-%' OR slug LIKE '%-premium-%';
