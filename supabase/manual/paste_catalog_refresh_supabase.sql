-- Copy ALL of this file into Supabase → SQL Editor → Run once.
-- Refreshes generated product names, descriptions, prices, image_url, materials, scores, and carbon for matching slugs.

-- Generate 189 category-specific products across 9 categories (21 per category)
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
        WHEN 'food-drink' THEN (ARRAY[
          8.49, 6.49, 3.49, 9.99, 3.49, 2.79, 5.49, 6.49, 5.49, 18.99, 3.99, 4.79, 3.89, 8.49
        ])[((n - 1) % 14) + 1]
        WHEN 'kids' THEN (ARRAY[14.99, 8.99, 17.99, 11.99, 9.99, 22.99, 26.99])[((n - 1) % 7) + 1]
        WHEN 'personal-care' THEN (ARRAY[8.49, 6.99, 9.99, 11.99, 8.99, 13.99, 8.49])[((n - 1) % 7) + 1]
        WHEN 'kitchen' THEN (ARRAY[7.49, 14.99, 17.99, 22.99, 18.99, 9.99, 14.99])[((n - 1) % 7) + 1]
        WHEN 'beauty' THEN (ARRAY[8.99, 14.99, 18.99, 9.99, 14.99, 11.99, 13.99])[((n - 1) % 7) + 1]
        WHEN 'outdoors' THEN (ARRAY[
          44.99, 21.99, 24.99, 15.99, 32.99, 29.99, 6.99, 12.99, 9.99, 49.99, 69.99, 16.99, 11.99, 8.99
        ])[((n - 1) % 14) + 1]
        WHEN 'home' THEN (ARRAY[
          22.99, 72.99, 54.99, 28.99, 16.99, 34.99, 26.99, 11.99, 18.99, 14.49, 9.99, 6.49, 12.99, 7.49
        ])[((n - 1) % 14) + 1]
        WHEN 'tech' THEN (ARRAY[16.99, 28.99, 16.99, 11.99, 14.99, 17.99, 32.99])[((n - 1) % 7) + 1]
        WHEN 'fashion' THEN (ARRAY[18.99, 64.99, 42.99, 34.99, 46.99, 28.99, 54.99])[((n - 1) % 7) + 1]
        ELSE 12.99
      END)::numeric
      + ((n - 1) % 4) * 0.25
    ), 2) AS price,
    t.image_url,
    (5 + (n % 6))::smallint AS sustainability_score,
    t.item_materials AS materials,
    round((0.6 + (n % 15) * 0.35)::numeric, 2) AS carbon_footprint_saving_kg
  FROM category_map c
  CROSS JOIN generate_series(1, 21) AS n
  CROSS JOIN LATERAL (
    SELECT
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY['Organic Cotton Tee','Recycled Denim Jacket','Hemp Blend Hoodie','Linen Everyday Shirt','Recycled Knit Sweater','Bamboo Lounge Pants','Vegan Canvas Sneakers'])[((n - 1) % 7) + 1]
        WHEN 'home' THEN (ARRAY[
          'Recycled Glass Vase','FSC Wood Side Table','Natural Fiber Rug','Low Energy LED Lamp','Reusable Storage Jars','Organic Cotton Throw','Upcycled Decor Basket',
          'Recycled Notebook Pack','Bamboo Desk Organizer','Refillable Pen Set','Cork Mouse Pad','Eco Sticky Notes','FSC Paper Planner','Reusable Cable Ties'
        ])[((n - 1) % 14) + 1]
        WHEN 'personal-care' THEN (ARRAY['Natural Toothpaste Tabs','Compostable Floss Kit','Refillable Hand Wash','Plant-Based Face Cleanser','Bamboo Toothbrush Set','Eco Body Lotion','Solid Conditioner Bar'])[((n - 1) % 7) + 1]
        WHEN 'kitchen' THEN (ARRAY['Stainless Steel Straw Set','Bamboo Cooking Utensils','Reusable Silicone Food Bags','Compost Bin Caddy','Glass Meal Prep Containers','Cotton Produce Bags','Beeswax Food Wrap Kit'])[((n - 1) % 7) + 1]
        WHEN 'beauty' THEN (ARRAY['Refillable Lip Balm','Vegan Mascara Tube','Eco Makeup Brush Set','Reusable Cotton Rounds','Natural Tint Moisturizer','Plastic-Free Face Mask','Mineral Blush Compact'])[((n - 1) % 7) + 1]
        WHEN 'outdoors' THEN (ARRAY[
          'Recycled Trail Backpack','Insulated Steel Bottle','Solar Camp Lantern','Reusable Travel Cutlery','Eco Picnic Blanket','Cork Yoga Mat','Compostable Wet Wipes',
          'Compost Starter Kit','Biodegradable Seed Pots','Reclaimed Wood Planter','Rainwater Collection Barrel','Organic Herb Grow Set','Natural Coir Mulch Mat','Bamboo Plant Labels'
        ])[((n - 1) % 14) + 1]
        WHEN 'kids' THEN (ARRAY['Organic Baby Onesie','Natural Rubber Teether','Bamboo Kids Plate Set','Eco Story Book Set','Reusable Snack Pouch','Wooden Learning Blocks','Organic Cotton Blanket'])[((n - 1) % 7) + 1]
        WHEN 'food-drink' THEN (ARRAY[
          'Fair-Trade Organic Coffee','Loose Leaf Herbal Tea','Small-Batch Probiotic Kombucha','Raw Wildflower Honey','Single-Origin Dark Chocolate Bar','Bronze-Cut Organic Durum Pasta','Sprouted Grain Breakfast Granola',
          'Home-Compostable Coffee Pods','Sea Salt Oven-Roasted Nut Mix','Plant Protein Smoothie Blend','Unsweetened Apple Sauce Pouches','Hearty Lentil Vegetable Soup Mix','Ancient Grains and Wild Rice Blend','Sparkling Mineral Water Glass Pack'
        ])[((n - 1) % 14) + 1]
        WHEN 'tech' THEN (ARRAY['Recycled Phone Case','Solar Power Bank','Bamboo Keyboard Wrist Rest','Eco Cable Organizer','Bioplastic Earbud Case','Energy Saving Smart Plug','Recycled Laptop Sleeve'])[((n - 1) % 7) + 1]
      END AS item_name,
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY[
          'Soft daily tee in GOTS-certified organic cotton with a relaxed fit.',
          'Classic-fit jacket in denim woven with recycled cotton and polyester.',
          'Midweight hoodie blending organic cotton and hemp for year-round wear.',
          'Breathable shirt in European linen with organic cotton trim.',
          'Cozy sweater spun with recycled fibers to cut virgin wool use.',
          'Loungewear jersey from bamboo viscose blended with organic cotton.',
          'Low-profile sneakers with organic cotton canvas and natural rubber soles.'
        ])[((n - 1) % 7) + 1]
        WHEN 'home' THEN (ARRAY[
          'Hand-blown vase from recycled glass with a soft green tint.',
          'Side table in FSC-certified solid wood with low-VOC finish.',
          'Area rug in undyed jute and wool for living spaces.',
          'LED lamp with warm dimming and recycled aluminum heat sink.',
          'Glass storage jars with bamboo lids for pantry staples.',
          'Throw blanket woven from GOTS organic cotton.',
          'Decor basket upcycled from textile offcuts and cotton rope.',
          'Notebook trio with recycled-card covers and dot-grid pages.',
          'Bamboo desk organizer with trays for pens and accessories.',
          'Refillable pen set with compostable ink cartridges.',
          'Cork desk mat sized for mouse and compact keyboard.',
          'Sticky notes made from sugarcane paper with gentle adhesive.',
          'Weekly planner on FSC paper with lay-flat binding.',
          'Reusable cable ties for laptop and charger cords.'
        ])[((n - 1) % 14) + 1]
        WHEN 'personal-care' THEN (ARRAY[
          'Fluoride-free toothpaste tablets with peppermint polish.',
          'Compostable floss on a refillable glass spool.',
          'Concentrated hand wash; mix with water in a reusable dispenser.',
          'Gentle face cleanser with aloe and coconut-derived surfactants.',
          'Bamboo toothbrush set with soft plant-based bristles.',
          'Body lotion with shea butter and fast-absorbing plant oils.',
          'Solid conditioner bar to skip plastic bottles in the shower.'
        ])[((n - 1) % 7) + 1]
        WHEN 'kitchen' THEN (ARRAY[
          'Set of metal straws plus a slender cleaning brush and pouch.',
          'Five-piece bamboo utensil set for cooking and serving.',
          'Leak-proof silicone bags for freezer, lunch, and sous-vide.',
          'Countertop compost caddy with replaceable charcoal filter.',
          'Glass meal-prep containers with snap lids for leftovers.',
          'GOTS organic cotton mesh bags for produce runs.',
          'Reusable food wraps using beeswax on organic cotton.'
        ])[((n - 1) % 7) + 1]
        WHEN 'beauty' THEN (ARRAY[
          'Tinted lip balm in a refillable aluminum slider.',
          'Mascara built with plant waxes and mineral pigment.',
          'Twelve makeup brushes with bamboo handles and vegan fibers.',
          'Washable cotton rounds for toner and makeup removal.',
          'Tinted moisturizer with non-nano mineral SPF.',
          'Clay face mask powder you mix fresh with water.',
          'Pressed mineral blush in a compact paper sleeve.'
        ])[((n - 1) % 7) + 1]
        WHEN 'outdoors' THEN (ARRAY[
          'Daypack with recycled ripstop shell and breathable harness.',
          'Insulated steel bottle that keeps drinks cold or hot for hours.',
          'Rechargeable camp lantern with dimmable warm LED.',
          'Travel cutlery set in a roll: knife, fork, spoon, chopsticks.',
          'Picnic blanket with recycled-fiber backing and cotton top.',
          'Cork and natural rubber yoga mat for studio or trail.',
          'Plant-based wet wipes for quick cleanup; compost where accepted.',
          'Compost starter mix with brown and green balance tips.',
          'Biodegradable seedling pots that break down in garden soil.',
          'Planter box from reclaimed wood with drainage tray.',
          'Rain barrel kit with food-grade liner and diverter.',
          'Herb growing kit with organic soil discs and seed sachets.',
          'Coir mulch mat to hold moisture and block weeds.',
          'Bamboo plant labels you can write on for rows and beds.'
        ])[((n - 1) % 14) + 1]
        WHEN 'kids' THEN (ARRAY[
          'Organic cotton onesie with snap shoulders for easy changes.',
          'Teething ring molded from natural rubber without BPA.',
          'Bamboo kids plate and cup set with divided sections.',
          'Storybook set printed on FSC paper with soy inks.',
          'Silicone snack pouch for purees and finger foods.',
          'Wooden blocks with water-based paints for toddlers.',
          'Muslin swaddle blanket in breathable organic cotton.'
        ])[((n - 1) % 7) + 1]
        WHEN 'food-drink' THEN (ARRAY[
          'Whole-bean arabica coffee roasted medium; sourced from grower cooperatives with transparent farm-gate pricing.',
          'Loose-leaf herbal infusion: caffeine-free botanical blend in a steel caddy—steep three to five minutes in hot water.',
          'Small-batch kombucha: live cultures, light carbonation, and organic cane sugar; sold in returnable glass where the refill program operates.',
          'Raw wildflower honey with minimal filtration; traceable to regional apiaries that prioritize hive health and forage diversity.',
          'Dark chocolate bar with a high-cocoa recipe; cocoa mass and butter from fair-trade certified farms and a short ingredient list.',
          'Bronze-cut organic durum pasta, slow-dried so sauces cling; pantry staple for quick weeknight bowls and bakes.',
          'Sprouted-grain granola: oven-toasted clusters of oats, seeds, and coconut chips with maple sweetness—crunchy, not dusty.',
          'Specialty-grade coffee sealed in home- or industrially compostable pods where local rules allow; check your compost service.',
          'Savory snack mix of almonds, cashews, and peanuts, oven-roasted with sea salt and packed in a paper pouch with plant-based liner.',
          'Vegan protein powder blending pea and rice protein with coconut sugar; stirs smoothly into smoothies and plant milks.',
          'Unsweetened apple sauce in squeeze pouches: apples and a touch of vitamin C only; pouches recyclable via participating drop-off schemes.',
          'Hearty dry soup mix: red lentils, pearl barley, dehydrated vegetables, and spices—simmer twenty-five minutes with water or broth.',
          'Side-dish grain mix of brown rice, wild rice, and red quinoa; rinse, then simmer until tender and fluffy.',
          'Sparkling mineral water from a protected spring, bottled in glass with aluminum caps; variety pack of plain and light natural essences.'
        ])[((n - 1) % 14) + 1]
        WHEN 'tech' THEN (ARRAY[
          'Phone case molded from recycled handset plastics where noted.',
          'Solar-assisted power bank for phones on multi-day trips.',
          'Keyboard wrist rest with laminated bamboo and cork base.',
          'Cable organizer kit with silicone ties and printed labels.',
          'Earbud case in a bio-based polymer shell.',
          'Smart plug with scheduling to trim standby energy use.',
          'Laptop sleeve with recycled nylon shell and fleece lining.'
        ])[((n - 1) % 7) + 1]
      END AS item_description,
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY[
          '100% GOTS organic cotton jersey',
          'Recycled cotton, recycled polyester denim',
          'Organic cotton, hemp, elastane',
          'European linen, organic cotton trim',
          'Recycled wool blend, recycled acrylic',
          'Bamboo viscose, organic cotton',
          'Organic cotton canvas, natural rubber'
        ])[((n - 1) % 7) + 1]
        WHEN 'home' THEN (ARRAY[
          'Recycled glass',
          'FSC-certified solid hardwood, low-VOC finish',
          'Jute, undyed wool',
          'LED module, recycled aluminum, steel base',
          'Borosilicate glass, bamboo lid',
          'GOTS organic cotton',
          'Recycled cotton rope, pine frame',
          'Recycled paper, kraft cover',
          'Bamboo ply, steel hardware',
          'Recycled plastic barrel, plant-based ink',
          'Natural cork',
          'Sugarcane paper, low-tack adhesive',
          'FSC paper, linen thread',
          'Recycled PET hook-and-loop, elastic'
        ])[((n - 1) % 14) + 1]
        WHEN 'personal-care' THEN (ARRAY[
          'Sorbitol, calcium carbonate, peppermint oil',
          'Corn PLA filament, candelilla wax, glass spool',
          'Coconut-derived surfactants, glycerin, essential oils',
          'Aloe juice, chamomile extract, mild surfactants',
          'Bamboo, castor-oil based bristles',
          'Shea butter, sunflower oil, vitamin E',
          'Coconut oil, BTMS, essential oils'
        ])[((n - 1) % 7) + 1]
        WHEN 'kitchen' THEN (ARRAY[
          '18/8 stainless steel, nylon brush',
          'Moso bamboo, food-grade oil',
          'Platinum silicone, BPA-free',
          'Recycled plastic, activated charcoal filter',
          'Tempered glass, polypropylene lid',
          'GOTS organic cotton mesh',
          'Organic cotton, beeswax, tree resin'
        ])[((n - 1) % 7) + 1]
        WHEN 'beauty' THEN (ARRAY[
          'Castor oil, candelilla wax, refill pod',
          'Plant waxes, iron oxide pigments',
          'Bamboo, synthetic taklon (vegan)',
          'Organic cotton flannel',
          'Zinc oxide, shea butter, jojoba',
          'Kaolin clay, aloe, green tea extract',
          'Mica, jojoba oil, vitamin E'
        ])[((n - 1) % 7) + 1]
        WHEN 'outdoors' THEN (ARRAY[
          'Recycled polyester ripstop, nylon webbing',
          '18/8 stainless steel, polypropylene lid',
          'ABS housing, lithium cell, LED',
          'Stainless steel, bamboo, cotton roll',
          'Recycled PET fleece, organic cotton',
          'Natural cork, natural rubber',
          'Wood pulp viscose, aloe extract',
          'Coconut coir, alfalfa meal, gypsum',
          'Recycled paper pulp, natural latex binder',
          'Reclaimed pine, natural oil finish',
          'Recycled HDPE, brass hardware',
          'Organic coir, non-GMO seeds',
          'Natural coconut coir fiber',
          'Moso bamboo'
        ])[((n - 1) % 14) + 1]
        WHEN 'kids' THEN (ARRAY[
          'GOTS organic cotton',
          'Hevea natural rubber',
          'Bamboo fiber, plant-based lacquer',
          'FSC paper, soy ink',
          'Platinum silicone',
          'Beech wood, water-based paint',
          'Organic cotton muslin'
        ])[((n - 1) % 7) + 1]
        WHEN 'food-drink' THEN (ARRAY[
          'Arabica coffee, kraft bag, plant-based liner',
          'Organic herbs, steel tin',
          'Brewed tea, organic cane sugar, live cultures, glass bottle',
          'Raw honey, glass jar, metal lid',
          'Cocoa mass, cocoa butter, coconut sugar',
          'Organic durum wheat semolina',
          'Sprouted oats, sunflower seeds, maple syrup, coconut oil',
          'Bio-based capsule, specialty arabica',
          'Almonds, cashews, peanuts, sea salt',
          'Pea protein, rice protein, coconut sugar, natural flavors',
          'Organic apples, ascorbic acid, recyclable pouch film',
          'Red lentils, pearl barley, dried vegetables, spices, glass jar',
          'Brown rice, wild rice, red quinoa',
          'Natural mineral water, glass, aluminum cap'
        ])[((n - 1) % 14) + 1]
        WHEN 'tech' THEN (ARRAY[
          'Recycled polycarbonate blend',
          'Lithium cells, monocrystalline solar strip',
          'Bamboo laminate, cork',
          'Silicone, recycled PET tags',
          'Bio-based polymer',
          'Fire-rated ABS, Wi-Fi radio',
          'Recycled nylon, recycled polyester fleece'
        ])[((n - 1) % 7) + 1]
      END AS item_materials,
      CASE c.slug
        WHEN 'fashion' THEN (ARRAY[
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
          'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400',
          'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
          'https://images.unsplash.com/photo-1596755094514-f87d40ce9b9c?w=400',
          'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'home' THEN (ARRAY[
          'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=400',
          'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400',
          'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400',
          'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400',
          'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=400',
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400',
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400',
          'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400',
          'https://images.unsplash.com/photo-1503602642458-232111445657?w=400',
          'https://images.unsplash.com/photo-1583484963886-7d73f2b4c0c4?w=400',
          'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=400',
          'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400',
          'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400',
          'https://images.unsplash.com/photo-1580894908361-967195033215?w=400'
        ])[((n - 1) % 14) + 1]
        WHEN 'personal-care' THEN (ARRAY[
          'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400',
          'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400',
          'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400',
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
          'https://images.unsplash.com/photo-1559591935-c6c23a6f3bce?w=400',
          'https://images.unsplash.com/photo-1620916569310-43056947756d?w=400',
          'https://images.unsplash.com/photo-1607006483224-5340f1e9d2b7?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'kitchen' THEN (ARRAY[
          'https://images.unsplash.com/photo-1563822249548-9a26e1b419bc?w=400',
          'https://images.unsplash.com/photo-1594489572280-6f0112d438f9?w=400',
          'https://images.unsplash.com/photo-1610557892470-b305fc07f7d4?w=400',
          'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=400',
          'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400',
          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
          'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'beauty' THEN (ARRAY[
          'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
          'https://images.unsplash.com/photo-1512496013021-4b296334ff14?w=400',
          'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
          'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
          'https://images.unsplash.com/photo-1617897903246-719242758050?w=400',
          'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'outdoors' THEN (ARRAY[
          'https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=400',
          'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=400',
          'https://images.unsplash.com/photo-1504274066651-8d31a536b11a?w=400',
          'https://images.unsplash.com/photo-1499696010181-529a2df2828b?w=400',
          'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400',
          'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400',
          'https://images.unsplash.com/photo-1455218873509-8097305ee378?w=400',
          'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400',
          'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400',
          'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
          'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400',
          'https://images.unsplash.com/photo-1492496913980-501348b61469?w=400',
          'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400',
          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400'
        ])[((n - 1) % 14) + 1]
        WHEN 'kids' THEN (ARRAY[
          'https://images.unsplash.com/photo-1519340333755-c6e9f6b88a45?w=400',
          'https://images.unsplash.com/photo-1602814514944-ef5c57fca4c0?w=400',
          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
          'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400',
          'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400',
          'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400',
          'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400'
        ])[((n - 1) % 7) + 1]
        WHEN 'food-drink' THEN (ARRAY[
          'https://images.unsplash.com/photo-1447933601403-0c6688ce5667?w=400',
          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
          'https://images.unsplash.com/photo-1558642452-9d2a7bf7fad0?w=400',
          'https://images.unsplash.com/photo-1587049352846-4d222aca395e?w=400',
          'https://images.unsplash.com/photo-1481391032113-d751bdcb7e11?w=400',
          'https://images.unsplash.com/photo-1551462147-85873367c0af?w=400',
          'https://images.unsplash.com/photo-1495214783153-1fd05d2a6e59?w=400',
          'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400',
          'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
          'https://images.unsplash.com/photo-1497534546561-136052443605?w=400',
          'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400',
          'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
          'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400',
          'https://images.unsplash.com/photo-1548832908-15b7eea18f75?w=400'
        ])[((n - 1) % 14) + 1]
        WHEN 'tech' THEN (ARRAY[
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
          'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400',
          'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400',
          'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400',
          'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400',
          'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=400'
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
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  materials = EXCLUDED.materials,
  sustainability_score = EXCLUDED.sustainability_score,
  carbon_footprint_saving_kg = EXCLUDED.carbon_footprint_saving_kg;
