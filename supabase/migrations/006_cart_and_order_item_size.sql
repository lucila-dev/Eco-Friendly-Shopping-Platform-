-- Add size support for apparel products in cart and order history.

ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT '';

-- Replace old uniqueness (user + product) with user + product + size
-- so users can keep multiple sizes of the same product in cart.
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
ALTER TABLE cart_items
ADD CONSTRAINT cart_items_user_id_product_id_size_key UNIQUE (user_id, product_id, size);

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_size text;
