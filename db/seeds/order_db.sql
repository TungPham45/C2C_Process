-- Rich order seed data for local development.
-- Expected auth users:
--   buyer@gmail.com     -> user id 1
--   seller1@gmail.com   -> shop id 1
--   seller2@gmail.com   -> shop id 2
--
-- Expected products/variants from product seed:
--   classic-t-shirt     -> variant ids include 1..3
--   premium-hoodie      -> variant ids include 4..6
--   sneaker-runner-pro  -> variant ids include 11..13

-- Platform + shop vouchers
INSERT INTO vouchers (
  id,
  shop_id,
  code,
  target_type,
  discount_type,
  discount_value,
  min_spend,
  max_discount,
  start_date,
  end_date,
  total_quantity,
  used_count,
  max_per_user,
  status
)
VALUES
  (
    1001,
    NULL,
    'PLATFORM10',
    'all_buyers',
    'percentage',
    10.00,
    200000.00,
    70000.00,
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '60 days',
    500,
    12,
    3,
    'active'
  ),
  (
    1002,
    1,
    'SHOPB50K',
    'all_buyers',
    'fixed',
    50000.00,
    250000.00,
    50000.00,
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '45 days',
    300,
    6,
    2,
    'active'
  ),
  (
    1003,
    2,
    'SNEAKER15',
    'all_buyers',
    'percentage',
    15.00,
    600000.00,
    120000.00,
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '30 days',
    200,
    4,
    2,
    'active'
  )
ON CONFLICT (code) DO UPDATE
SET
  shop_id = EXCLUDED.shop_id,
  target_type = EXCLUDED.target_type,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_spend = EXCLUDED.min_spend,
  max_discount = EXCLUDED.max_discount,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  total_quantity = EXCLUDED.total_quantity,
  used_count = EXCLUDED.used_count,
  max_per_user = EXCLUDED.max_per_user,
  status = EXCLUDED.status;

-- Buyer cart demo
INSERT INTO cart_items (cart_id, shop_id, product_variant_id, quantity)
VALUES
  (1, 1, 2, 1),
  (1, 2, 11, 1)
ON CONFLICT DO NOTHING;

-- Checkout sessions
INSERT INTO checkout_sessions (
  id,
  user_id,
  total_payment,
  payment_method,
  payment_status,
  platform_voucher_id
)
VALUES
  (9001, 1, 508200.00, 'cod', 'paid', 1001),
  (9002, 1, 323100.00, 'bank_transfer', 'paid', 1001),
  (9003, 1, 756500.00, 'cod', 'paid', NULL)
ON CONFLICT (id) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  total_payment = EXCLUDED.total_payment,
  payment_method = EXCLUDED.payment_method,
  payment_status = EXCLUDED.payment_status,
  platform_voucher_id = EXCLUDED.platform_voucher_id,
  updated_at = NOW();

-- Shop orders per checkout session
INSERT INTO shop_orders (
  id,
  checkout_session_id,
  shop_id,
  subtotal,
  shipping_fee,
  shop_voucher_id,
  platform_discount_amount,
  shipping_address,
  status,
  tracking_number,
  carrier_name
)
VALUES
  (
    9001,
    9001,
    1,
    398000.00,
    30000.00,
    1002,
    29800.00,
    'Nguyễn Văn A, 12 Nguyễn Trãi, Thanh Xuân, Hà Nội, 0901000001',
    'delivered',
    'VNPOST-9001',
    'VNPost'
  ),
  (
    9002,
    9002,
    1,
    359000.00,
    30000.00,
    NULL,
    65900.00,
    'Nguyễn Văn A, 12 Nguyễn Trãi, Thanh Xuân, Hà Nội, 0901000001',
    'delivered',
    'GHTK-9002',
    'Giao Hang Tiet Kiem'
  ),
  (
    9003,
    9003,
    2,
    890000.00,
    35000.00,
    1003,
    133500.00,
    'Nguyễn Văn A, 12 Nguyễn Trãi, Thanh Xuân, Hà Nội, 0901000001',
    'shipped',
    'JNT-9003',
    'J&T Express'
  )
ON CONFLICT (id) DO UPDATE
SET
  checkout_session_id = EXCLUDED.checkout_session_id,
  shop_id = EXCLUDED.shop_id,
  subtotal = EXCLUDED.subtotal,
  shipping_fee = EXCLUDED.shipping_fee,
  shop_voucher_id = EXCLUDED.shop_voucher_id,
  platform_discount_amount = EXCLUDED.platform_discount_amount,
  shipping_address = EXCLUDED.shipping_address,
  status = EXCLUDED.status,
  tracking_number = EXCLUDED.tracking_number,
  carrier_name = EXCLUDED.carrier_name,
  updated_at = NOW();

-- Order items
INSERT INTO order_items (
  shop_order_id,
  product_variant_id,
  product_name,
  variant_details,
  quantity,
  price_at_purchase
)
SELECT *
FROM (
  VALUES
    (9001, 2, 'Classic T-Shirt', '{"color":"Black","size":"L"}'::jsonb, 1, 199000.00),
    (9001, 3, 'Classic T-Shirt', '{"color":"White","size":"XL"}'::jsonb, 1, 209000.00),
    (9002, 4, 'Premium Hoodie', '{"color":"Black","size":"L"}'::jsonb, 1, 359000.00),
    (9003, 11, 'Sneaker Runner Pro', '{"color":"Black","size":"40"}'::jsonb, 1, 890000.00)
) AS rows(shop_order_id, product_variant_id, product_name, variant_details, quantity, price_at_purchase)
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  WHERE oi.shop_order_id = rows.shop_order_id
    AND oi.product_variant_id = rows.product_variant_id
    AND oi.product_name = rows.product_name
);

-- Voucher claims and usage links
INSERT INTO user_voucher_claims (
  id,
  user_id,
  voucher_id,
  claimed_at,
  is_used,
  used_at,
  checkout_session_id,
  shop_order_id
)
VALUES
  (7001, 1, 1001, NOW() - INTERVAL '9 days', true, NOW() - INTERVAL '8 days', 9001, 9001),
  (7002, 1, 1002, NOW() - INTERVAL '9 days', true, NOW() - INTERVAL '8 days', 9001, 9001),
  (7003, 1, 1001, NOW() - INTERVAL '5 days', true, NOW() - INTERVAL '5 days', 9002, 9002),
  (7004, 1, 1003, NOW() - INTERVAL '2 days', true, NOW() - INTERVAL '2 days', 9003, 9003)
ON CONFLICT (id) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  voucher_id = EXCLUDED.voucher_id,
  claimed_at = EXCLUDED.claimed_at,
  is_used = EXCLUDED.is_used,
  used_at = EXCLUDED.used_at,
  checkout_session_id = EXCLUDED.checkout_session_id,
  shop_order_id = EXCLUDED.shop_order_id;

-- Platform voucher settlement demo for finance/admin flows
INSERT INTO platform_voucher_settlements (
  id,
  voucher_id,
  user_id,
  shop_order_id,
  checkout_session_id,
  discount_amount,
  settled_amount,
  status,
  settled_at,
  note
)
VALUES
  (
    8001,
    1001,
    1,
    9001,
    9001,
    29800.00,
    29800.00,
    'settled',
    NOW() - INTERVAL '7 days',
    'Đã đối soát với shop.'
  ),
  (
    8002,
    1001,
    1,
    9002,
    9002,
    65900.00,
    0.00,
    'pending',
    NULL,
    'Chờ kỳ đối soát tiếp theo.'
  )
ON CONFLICT (id) DO UPDATE
SET
  voucher_id = EXCLUDED.voucher_id,
  user_id = EXCLUDED.user_id,
  shop_order_id = EXCLUDED.shop_order_id,
  checkout_session_id = EXCLUDED.checkout_session_id,
  discount_amount = EXCLUDED.discount_amount,
  settled_amount = EXCLUDED.settled_amount,
  status = EXCLUDED.status,
  settled_at = EXCLUDED.settled_at,
  note = EXCLUDED.note;

-- Keep sequences in sync when explicit IDs are inserted
SELECT setval(pg_get_serial_sequence('vouchers', 'id'), COALESCE((SELECT MAX(id) FROM vouchers), 1), true);
SELECT setval(pg_get_serial_sequence('checkout_sessions', 'id'), COALESCE((SELECT MAX(id) FROM checkout_sessions), 1), true);
SELECT setval(pg_get_serial_sequence('shop_orders', 'id'), COALESCE((SELECT MAX(id) FROM shop_orders), 1), true);
SELECT setval(pg_get_serial_sequence('order_items', 'id'), COALESCE((SELECT MAX(id) FROM order_items), 1), true);
SELECT setval(pg_get_serial_sequence('user_voucher_claims', 'id'), COALESCE((SELECT MAX(id) FROM user_voucher_claims), 1), true);
SELECT setval(pg_get_serial_sequence('platform_voucher_settlements', 'id'), COALESCE((SELECT MAX(id) FROM platform_voucher_settlements), 1), true);
