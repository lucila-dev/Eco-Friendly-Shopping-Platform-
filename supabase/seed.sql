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
        WHEN 'fashion' THEN (ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400','https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400','https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400','https://images.unsplash.com/photo-1445205170230-053b83016050?w=400','https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400','https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'])[((n - 1) % 6) + 1]
        WHEN 'home' THEN (ARRAY['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400','https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=400','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400','https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400','https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=400','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400'])[((n - 1) % 6) + 1]
        WHEN 'personal-care' THEN (ARRAY['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400','https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400','https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400','https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400','https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400'])[((n - 1) % 6) + 1]
        WHEN 'kitchen' THEN (ARRAY['https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=400','https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400','https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=400','https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400','https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400','https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400'])[((n - 1) % 6) + 1]
        WHEN 'beauty' THEN (ARRAY['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400','https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400','https://images.unsplash.com/photo-1617897903246-719242758050?w=400','https://images.unsplash.com/photo-1583241800698-d4b7f1d3e6b5?w=400','https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400','https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400'])[((n - 1) % 6) + 1]
        WHEN 'outdoors' THEN (ARRAY['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400','https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=400','https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400','https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=400','https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400','https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=400'])[((n - 1) % 6) + 1]
        WHEN 'kids' THEN (ARRAY['https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400','https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400','https://images.unsplash.com/photo-1542838132-92c53300491e?w=400','https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400','https://images.unsplash.com/photo-1519340333755-c6e9f6b88a45?w=400','https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400'])[((n - 1) % 6) + 1]
        WHEN 'office' THEN (ARRAY['https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400','https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400','https://images.unsplash.com/photo-1497366216548-37526070297c?w=400','https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=400','https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=400','https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400'])[((n - 1) % 6) + 1]
        WHEN 'tech' THEN (ARRAY['https://images.unsplash.com/photo-1518770660439-4636190af475?w=400','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400','https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=400','https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400','https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400','https://images.unsplash.com/photo-1580894908361-967195033215?w=400'])[((n - 1) % 6) + 1]
        WHEN 'garden' THEN (ARRAY['https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400','https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400','https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400','https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400','https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400','https://images.unsplash.com/photo-1492496913980-501348b61469?w=400'])[((n - 1) % 6) + 1]
      END AS image_url
  ) t
)
INSERT INTO products (category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg)
SELECT category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg
FROM generated
ON CONFLICT (slug) DO NOTHING;
