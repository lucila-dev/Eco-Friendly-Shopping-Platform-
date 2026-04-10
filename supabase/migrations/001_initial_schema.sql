-- Eco-Friendly Shopping Platform – Initial schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Products
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

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews (one per user per product)
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

-- Cart items
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

-- Orders (mock checkout)
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

-- Order items (snapshot at order time)
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

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Categories: public read
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- Products: public read
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

-- Profiles: read own, update own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Reviews: everyone read; insert/update/delete own
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own review" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own review" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own review" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Cart: own only
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- Orders: own only (read + insert)
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order items: via order ownership
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users can insert order items for own orders" ON order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));

-- Trigger: create profile on signup
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
