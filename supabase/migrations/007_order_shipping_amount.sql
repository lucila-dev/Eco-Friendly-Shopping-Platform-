-- Track delivery separately so order total matches checkout (subtotal + shipping).

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_amount decimal(10,2) NOT NULL DEFAULT 0
CHECK (shipping_amount >= 0);

COMMENT ON COLUMN orders.shipping_amount IS 'Delivery fee charged at checkout; product lines sum to total_amount - shipping_amount.';
