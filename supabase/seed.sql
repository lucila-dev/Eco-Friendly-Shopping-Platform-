-- Seed data: categories and products
-- Run after 001_initial_schema.sql. Replace category/product UUIDs if you need to reference them.

INSERT INTO categories (id, name, slug, description) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Fashion', 'fashion', 'Eco-friendly clothing and accessories'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Home', 'home', 'Sustainable home and living products'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Personal Care', 'personal-care', 'Natural and low-waste personal care')
ON CONFLICT (id) DO NOTHING;

-- Products with sustainability metrics (image_url can be placeholder or Supabase Storage path)
INSERT INTO products (category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Organic Cotton T-Shirt', 'organic-cotton-tshirt', 'Soft unisex t-shirt made from 100% GOTS certified organic cotton.', 24.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 9, 'Organic cotton', 3.2),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Recycled Ocean Plastic Jacket', 'recycled-ocean-plastic-jacket', 'Water-resistant jacket made from recycled ocean plastics.', 89.99, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', 8, 'Recycled polyester, recycled ocean plastic', 5.1),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Bamboo Cutlery Set', 'bamboo-cutlery-set', 'Portable reusable cutlery set in a hemp pouch.', 18.50, 'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=400', 10, 'Bamboo, hemp', 1.8),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Reusable Beeswax Wraps', 'beeswax-wraps', 'Set of 3 food wraps to replace single-use plastic.', 22.00, 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400', 9, 'Organic cotton, beeswax, tree resin', 2.0),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Solid Shampoo Bar', 'solid-shampoo-bar', 'Zero-waste shampoo bar, long-lasting and plastic-free.', 14.99, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', 9, 'Natural oils, essential oils', 0.5),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Refillable Deodorant', 'refillable-deodorant', 'Aluminum case with compostable refills.', 19.99, 'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400', 8, 'Aluminum, natural ingredients', 0.8)
ON CONFLICT (slug) DO NOTHING;
