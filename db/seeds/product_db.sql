-- Rich product seed data for local development.
-- Expected auth users on a fresh bootstrap:
--   buyer@gmail.com     -> user id 1
--   seller1@gmail.com   -> user id 2
--   admin@gmail.com     -> user id 3
--   seller2@gmail.com   -> user id 4

INSERT INTO shops (owner_id, name, slug, description, logo_url, status, rating)
VALUES
  (
    2,
    'Cửa Hàng Thời Trang B',
    'thoi-trang-b',
    'Chuyên áo thun, hoodie và đồ mặc hằng ngày.',
    'https://placehold.co/256x256.png?text=Thoi+Trang+B',
    'active',
    4.80
  ),
  (
    4,
    'Shop Giày Sneaker Pro',
    'giay-sneaker-pro',
    'Chuyên giày sneaker và phụ kiện thể thao chính hãng.',
    'https://placehold.co/256x256.png?text=Sneaker+Pro',
    'active',
    4.70
  ),
  (
    NULL,
    'Phụ Kiện Mới',
    'phu-kien-moi',
    'Shop mới tạo, đang chờ duyệt hồ sơ và sản phẩm.',
    'https://placehold.co/256x256.png?text=Phu+Kien+Moi',
    'pending',
    0.00
  )
ON CONFLICT (slug) DO UPDATE
SET
  owner_id = EXCLUDED.owner_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url,
  status = EXCLUDED.status,
  rating = EXCLUDED.rating,
  updated_at = NOW();

INSERT INTO categories (name, slug, level, sort_order, is_active)
VALUES
  ('Thời Trang Nam', 'thoi-trang-nam', 1, 1, true),
  ('Sắc Đẹp', 'sac-dep', 1, 2, true),
  ('Sức Khỏe', 'suc-khoe', 1, 3, true),
  ('Phụ Kiện Thời Trang', 'phu-kien-thoi-trang', 1, 4, true),
  ('Thiết Bị Điện Gia Dụng', 'thiet-bi-dien-gia-dung', 1, 5, true),
  ('Giày Dép Nam', 'giay-dep-nam', 1, 6, true),
  ('Điện Thoại & Phụ Kiện', 'dien-thoai-phu-kien', 1, 7, true),
  ('Túi Ví Nữ', 'tui-vi-nu', 1, 8, true)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO categories (parent_id, name, slug, level, sort_order, is_active)
SELECT parent.id, child.name, child.slug, child.level, child.sort_order, child.is_active
FROM (
  VALUES
    ('thoi-trang-nam', 'Quần jean', 'quan-jean', 2, 1, true),
    ('thoi-trang-nam', 'Hoodie & Áo nỉ', 'hoodie-ao-ni', 2, 2, true),
    ('thoi-trang-nam', 'Áo khoác', 'ao-khoac', 2, 3, true),
    ('thoi-trang-nam', 'Áo', 'ao-nam', 2, 4, true),
    ('thoi-trang-nam', 'Đồ lót', 'do-lot-nam', 2, 5, true),
    ('giay-dep-nam', 'Giày thể thao', 'giay-the-thao-nam', 2, 1, true)
) AS child(parent_slug, name, slug, level, sort_order, is_active)
JOIN categories parent ON parent.slug = child.parent_slug
ON CONFLICT (slug) DO UPDATE
SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO categories (parent_id, name, slug, level, sort_order, is_active)
SELECT parent.id, child.name, child.slug, child.level, child.sort_order, child.is_active
FROM (
  VALUES
    ('hoodie-ao-ni', 'Áo hoodie', 'ao-hoodie', 3, 1, true),
    ('hoodie-ao-ni', 'Áo nỉ', 'ao-ni', 3, 2, true),
    ('ao-khoac', 'Áo khoác mùa đông', 'ao-khoac-mua-dong', 3, 1, true),
    ('ao-nam', 'Áo sơ mi', 'ao-so-mi', 3, 1, true),
    ('ao-nam', 'Áo thun', 'ao-thun', 3, 2, true),
    ('do-lot-nam', 'Quần lót', 'quan-lot', 3, 1, true),
    ('do-lot-nam', 'Áo lót', 'ao-lot', 3, 2, true),
    ('giay-the-thao-nam', 'Sneaker', 'sneaker-nam', 3, 1, true)
) AS child(parent_slug, name, slug, level, sort_order, is_active)
JOIN categories parent ON parent.slug = child.parent_slug
ON CONFLICT (slug) DO UPDATE
SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

WITH definition_rows(category_slug, name, input_type, is_required, sort_order) AS (
  VALUES
    ('ao-thun', 'Thương hiệu', 'dropdown', true, 1),
    ('ao-thun', 'Xuất xứ', 'dropdown', true, 2),
    ('ao-thun', 'Chất liệu', 'dropdown', true, 3),
    ('ao-thun', 'Phong cách', 'dropdown', false, 4),
    ('ao-hoodie', 'Thương hiệu', 'dropdown', true, 1),
    ('ao-hoodie', 'Xuất xứ', 'dropdown', true, 2),
    ('ao-hoodie', 'Chất liệu', 'dropdown', true, 3),
    ('ao-so-mi', 'Thương hiệu', 'dropdown', true, 1),
    ('ao-so-mi', 'Xuất xứ', 'dropdown', true, 2),
    ('ao-so-mi', 'Chất liệu', 'dropdown', true, 3),
    ('ao-so-mi', 'Cổ áo', 'dropdown', false, 4),
    ('ao-so-mi', 'Tay áo', 'dropdown', false, 5),
    ('quan-lot', 'Thương hiệu', 'dropdown', true, 1),
    ('quan-lot', 'Xuất xứ', 'dropdown', true, 2),
    ('quan-lot', 'Chất liệu', 'dropdown', true, 3),
    ('quan-lot', 'Kiểu quần lót', 'dropdown', true, 4),
    ('sneaker-nam', 'Thương hiệu', 'dropdown', true, 1),
    ('sneaker-nam', 'Xuất xứ', 'dropdown', true, 2),
    ('sneaker-nam', 'Chất liệu bề mặt', 'dropdown', true, 3),
    ('sneaker-nam', 'Phong cách', 'dropdown', false, 4)
)
INSERT INTO attribute_definitions (category_id, name, input_type, is_required, sort_order)
SELECT c.id, d.name, d.input_type, d.is_required, d.sort_order
FROM definition_rows d
JOIN categories c ON c.slug = d.category_slug
LEFT JOIN attribute_definitions existing
  ON existing.category_id = c.id
 AND existing.name = d.name
WHERE existing.id IS NULL;

WITH option_rows(category_slug, attribute_name, value_name, sort_order) AS (
  VALUES
    ('ao-thun', 'Thương hiệu', 'Không thương hiệu', 1),
    ('ao-thun', 'Thương hiệu', 'ADAM STORE', 2),
    ('ao-thun', 'Thương hiệu', 'ADDICTED', 3),
    ('ao-thun', 'Xuất xứ', 'Việt Nam', 1),
    ('ao-thun', 'Xuất xứ', 'Trung Quốc', 2),
    ('ao-thun', 'Xuất xứ', 'Hàn Quốc', 3),
    ('ao-thun', 'Chất liệu', 'Cotton', 1),
    ('ao-thun', 'Chất liệu', 'Polyester', 2),
    ('ao-thun', 'Chất liệu', 'Linen', 3),
    ('ao-thun', 'Phong cách', 'Cơ bản', 1),
    ('ao-thun', 'Phong cách', 'Thường ngày', 2),
    ('ao-thun', 'Phong cách', 'Streetwear', 3),
    ('ao-hoodie', 'Thương hiệu', 'Không thương hiệu', 1),
    ('ao-hoodie', 'Thương hiệu', 'ADAM STORE', 2),
    ('ao-hoodie', 'Thương hiệu', 'Urban Pulse', 3),
    ('ao-hoodie', 'Xuất xứ', 'Việt Nam', 1),
    ('ao-hoodie', 'Xuất xứ', 'Trung Quốc', 2),
    ('ao-hoodie', 'Xuất xứ', 'Thái Lan', 3),
    ('ao-hoodie', 'Chất liệu', 'Nylon', 1),
    ('ao-hoodie', 'Chất liệu', 'Nỉ', 2),
    ('ao-hoodie', 'Chất liệu', 'Cotton', 3),
    ('ao-so-mi', 'Thương hiệu', 'Không thương hiệu', 1),
    ('ao-so-mi', 'Thương hiệu', 'ADDICTED', 2),
    ('ao-so-mi', 'Thương hiệu', 'Office Daily', 3),
    ('ao-so-mi', 'Xuất xứ', 'Việt Nam', 1),
    ('ao-so-mi', 'Xuất xứ', 'Trung Quốc', 2),
    ('ao-so-mi', 'Xuất xứ', 'Indonesia', 3),
    ('ao-so-mi', 'Chất liệu', 'Cotton', 1),
    ('ao-so-mi', 'Chất liệu', 'Linen', 2),
    ('ao-so-mi', 'Chất liệu', 'Kate', 3),
    ('ao-so-mi', 'Cổ áo', 'Cổ bẻ', 1),
    ('ao-so-mi', 'Cổ áo', 'Cổ trụ', 2),
    ('ao-so-mi', 'Cổ áo', 'Cổ V', 3),
    ('ao-so-mi', 'Tay áo', 'Ngắn tay', 1),
    ('ao-so-mi', 'Tay áo', 'Dài tay', 2),
    ('quan-lot', 'Thương hiệu', 'Không thương hiệu', 1),
    ('quan-lot', 'Thương hiệu', 'Comfort Fit', 2),
    ('quan-lot', 'Thương hiệu', 'ADDICTED', 3),
    ('quan-lot', 'Xuất xứ', 'Việt Nam', 1),
    ('quan-lot', 'Xuất xứ', 'Trung Quốc', 2),
    ('quan-lot', 'Chất liệu', 'Cotton', 1),
    ('quan-lot', 'Chất liệu', 'Modal', 2),
    ('quan-lot', 'Kiểu quần lót', 'Boxer', 1),
    ('quan-lot', 'Kiểu quần lót', 'Brief', 2),
    ('sneaker-nam', 'Thương hiệu', 'RunnerX', 1),
    ('sneaker-nam', 'Thương hiệu', 'Street Run', 2),
    ('sneaker-nam', 'Thương hiệu', 'Không thương hiệu', 3),
    ('sneaker-nam', 'Xuất xứ', 'Việt Nam', 1),
    ('sneaker-nam', 'Xuất xứ', 'Trung Quốc', 2),
    ('sneaker-nam', 'Xuất xứ', 'Hàn Quốc', 3),
    ('sneaker-nam', 'Chất liệu bề mặt', 'Da tổng hợp', 1),
    ('sneaker-nam', 'Chất liệu bề mặt', 'Mesh', 2),
    ('sneaker-nam', 'Chất liệu bề mặt', 'Canvas', 3),
    ('sneaker-nam', 'Phong cách', 'Thể thao', 1),
    ('sneaker-nam', 'Phong cách', 'Streetwear', 2)
)
INSERT INTO attribute_options (attribute_id, value_name, sort_order)
SELECT ad.id, o.value_name, o.sort_order
FROM option_rows o
JOIN categories c ON c.slug = o.category_slug
JOIN attribute_definitions ad
  ON ad.category_id = c.id
 AND ad.name = o.attribute_name
LEFT JOIN attribute_options existing
  ON existing.attribute_id = ad.id
 AND existing.value_name = o.value_name
WHERE existing.id IS NULL;

WITH product_rows(shop_slug, category_slug, name, slug, description, base_price, thumbnail_url, rating, sold_count, status, moderation_note) AS (
  VALUES
    (
      'thoi-trang-b',
      'ao-thun',
      'Classic T-Shirt',
      'classic-t-shirt',
      'Áo thun cotton mặc hằng ngày, form regular và dễ phối đồ.',
      199000.00,
      'https://placehold.co/600x600.png?text=Classic+T-Shirt',
      4.70,
      18,
      'active',
      NULL
    ),
    (
      'thoi-trang-b',
      'ao-hoodie',
      'Premium Hoodie',
      'premium-hoodie',
      'Hoodie nỉ dày dặn, phù hợp đi học và đi chơi.',
      359000.00,
      'https://placehold.co/600x600.png?text=Premium+Hoodie',
      4.90,
      9,
      'active',
      NULL
    ),
    (
      'thoi-trang-b',
      'ao-so-mi',
      'Linen Overshirt',
      'linen-overshirt',
      'Áo sơ mi chất liệu linen mỏng nhẹ, đang duyệt nội dung mô tả.',
      289000.00,
      'https://placehold.co/600x600.png?text=Linen+Overshirt',
      0.00,
      0,
      'pending_approval',
      NULL
    ),
    (
      'thoi-trang-b',
      'quan-lot',
      'Boxer Essentials 3-Pack',
      'boxer-essentials-3-pack',
      'Bộ 3 quần lót cotton mềm, thích hợp mặc hằng ngày.',
      149000.00,
      'https://placehold.co/600x600.png?text=Boxer+Pack',
      4.60,
      22,
      'active',
      NULL
    ),
    (
      'giay-sneaker-pro',
      'sneaker-nam',
      'Sneaker Runner Pro',
      'sneaker-runner-pro',
      'Mẫu sneaker đế êm, upper mesh thoáng khí cho nhu cầu đi bộ và đi học.',
      890000.00,
      'https://placehold.co/600x600.png?text=Sneaker+Runner+Pro',
      4.85,
      14,
      'active',
      NULL
    ),
    (
      'thoi-trang-b',
      'ao-thun',
      'Sample Rejected Product',
      'sample-rejected',
      'Sản phẩm mẫu bị từ chối để demo tính năng hiển thị lỗi.',
      50000.00,
      'https://placehold.co/600x600.png?text=Rejected',
      0,
      0,
      'rejected',
      'Hình ảnh quá mờ và mô tả sản phẩm không đầy đủ thông tin kỹ thuật.'
    )
)
INSERT INTO products (
  shop_id,
  category_id,
  name,
  slug,
  description,
  base_price,
  thumbnail_url,
  rating,
  sold_count,
  status,
  moderation_note
)
SELECT s.id,
       c.id,
       p.name,
       p.slug,
       p.description,
       p.base_price,
       p.thumbnail_url,
       p.rating,
       p.sold_count,
       p.status,
       p.moderation_note
FROM product_rows p
JOIN shops s ON s.slug = p.shop_slug
JOIN categories c ON c.slug = p.category_slug
ON CONFLICT (slug) DO UPDATE
SET
  shop_id = EXCLUDED.shop_id,
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  thumbnail_url = EXCLUDED.thumbnail_url,
  rating = EXCLUDED.rating,
  sold_count = EXCLUDED.sold_count,
  status = EXCLUDED.status,
  moderation_note = EXCLUDED.moderation_note,
  updated_at = NOW();

WITH variant_rows(product_slug, sku, stock_quantity, price_override, attributes) AS (
  VALUES
    ('classic-t-shirt', 'TSHIRT-CLASSIC-BLACK-M', 80, 199000.00, '{"color":"Black","size":"M"}'::jsonb),
    ('classic-t-shirt', 'TSHIRT-CLASSIC-BLACK-L', 60, 199000.00, '{"color":"Black","size":"L"}'::jsonb),
    ('classic-t-shirt', 'TSHIRT-CLASSIC-WHITE-XL', 40, 209000.00, '{"color":"White","size":"XL"}'::jsonb),
    ('premium-hoodie', 'HOODIE-PREMIUM-BLACK-L', 25, 359000.00, '{"color":"Black","size":"L"}'::jsonb),
    ('premium-hoodie', 'HOODIE-PREMIUM-BLACK-XL', 20, 359000.00, '{"color":"Black","size":"XL"}'::jsonb),
    ('premium-hoodie', 'HOODIE-PREMIUM-CREAM-L', 18, 369000.00, '{"color":"Cream","size":"L"}'::jsonb),
    ('linen-overshirt', 'LINEN-OVERSHIRT-BEIGE-M', 12, 289000.00, '{"color":"Beige","size":"M"}'::jsonb),
    ('linen-overshirt', 'LINEN-OVERSHIRT-BEIGE-L', 8, 289000.00, '{"color":"Beige","size":"L"}'::jsonb),
    ('boxer-essentials-3-pack', 'BOXER-ESSENTIALS-MIXED-M', 50, 149000.00, '{"color":"Mixed","size":"M"}'::jsonb),
    ('boxer-essentials-3-pack', 'BOXER-ESSENTIALS-MIXED-L', 45, 149000.00, '{"color":"Mixed","size":"L"}'::jsonb),
    ('sneaker-runner-pro', 'SNEAKER-RUNNER-BLACK-40', 14, 890000.00, '{"color":"Black","size":"40"}'::jsonb),
    ('sneaker-runner-pro', 'SNEAKER-RUNNER-BLACK-41', 11, 890000.00, '{"color":"Black","size":"41"}'::jsonb),
    ('sneaker-runner-pro', 'SNEAKER-RUNNER-WHITE-42', 9, 920000.00, '{"color":"White","size":"42"}'::jsonb)
)
INSERT INTO product_variants (product_id, sku, stock_quantity, price_override, attributes)
SELECT p.id,
       v.sku,
       v.stock_quantity,
       v.price_override,
       v.attributes
FROM variant_rows v
JOIN products p ON p.slug = v.product_slug
ON CONFLICT (sku) DO UPDATE
SET
  product_id = EXCLUDED.product_id,
  stock_quantity = EXCLUDED.stock_quantity,
  price_override = EXCLUDED.price_override,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

WITH image_rows(product_slug, image_url, is_primary, sort_order) AS (
  VALUES
    ('classic-t-shirt', 'https://placehold.co/600x600.png?text=Classic+T-Shirt+Front', true, 0),
    ('classic-t-shirt', 'https://placehold.co/600x600.png?text=Classic+T-Shirt+Back', false, 1),
    ('premium-hoodie', 'https://placehold.co/600x600.png?text=Premium+Hoodie+Front', true, 0),
    ('premium-hoodie', 'https://placehold.co/600x600.png?text=Premium+Hoodie+Detail', false, 1),
    ('linen-overshirt', 'https://placehold.co/600x600.png?text=Linen+Overshirt', true, 0),
    ('boxer-essentials-3-pack', 'https://placehold.co/600x600.png?text=Boxer+Pack', true, 0),
    ('sneaker-runner-pro', 'https://placehold.co/600x600.png?text=Sneaker+Runner+Front', true, 0),
    ('sneaker-runner-pro', 'https://placehold.co/600x600.png?text=Sneaker+Runner+Side', false, 1)
)
INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
SELECT p.id,
       i.image_url,
       i.is_primary,
       i.sort_order
FROM image_rows i
JOIN products p ON p.slug = i.product_slug
LEFT JOIN product_images existing
  ON existing.product_id = p.id
 AND existing.image_url = i.image_url
WHERE existing.id IS NULL;

WITH attribute_value_rows(product_slug, attribute_name, option_value, custom_value) AS (
  VALUES
    ('classic-t-shirt', 'Thương hiệu', 'ADAM STORE', NULL),
    ('classic-t-shirt', 'Xuất xứ', 'Việt Nam', NULL),
    ('classic-t-shirt', 'Chất liệu', 'Cotton', NULL),
    ('classic-t-shirt', 'Phong cách', 'Cơ bản', NULL),
    ('premium-hoodie', 'Thương hiệu', 'Urban Pulse', NULL),
    ('premium-hoodie', 'Xuất xứ', 'Thái Lan', NULL),
    ('premium-hoodie', 'Chất liệu', 'Nỉ', NULL),
    ('linen-overshirt', 'Thương hiệu', 'Office Daily', NULL),
    ('linen-overshirt', 'Xuất xứ', 'Việt Nam', NULL),
    ('linen-overshirt', 'Chất liệu', 'Linen', NULL),
    ('linen-overshirt', 'Cổ áo', 'Cổ bẻ', NULL),
    ('linen-overshirt', 'Tay áo', 'Dài tay', NULL),
    ('boxer-essentials-3-pack', 'Thương hiệu', 'Comfort Fit', NULL),
    ('boxer-essentials-3-pack', 'Xuất xứ', 'Việt Nam', NULL),
    ('boxer-essentials-3-pack', 'Chất liệu', 'Cotton', NULL),
    ('boxer-essentials-3-pack', 'Kiểu quần lót', 'Boxer', NULL),
    ('sneaker-runner-pro', 'Thương hiệu', 'RunnerX', NULL),
    ('sneaker-runner-pro', 'Xuất xứ', 'Hàn Quốc', NULL),
    ('sneaker-runner-pro', 'Chất liệu bề mặt', 'Mesh', NULL),
    ('sneaker-runner-pro', 'Phong cách', 'Thể thao', NULL)
)
INSERT INTO product_attribute_values (product_id, attribute_id, attribute_option_id, custom_value)
SELECT p.id,
       ad.id,
       ao.id,
       avr.custom_value
FROM attribute_value_rows avr
JOIN products p ON p.slug = avr.product_slug
JOIN attribute_definitions ad
  ON ad.category_id = p.category_id
 AND ad.name = avr.attribute_name
LEFT JOIN attribute_options ao
  ON ao.attribute_id = ad.id
 AND ao.value_name = avr.option_value
LEFT JOIN product_attribute_values existing
  ON existing.product_id = p.id
 AND existing.attribute_id = ad.id
WHERE existing.id IS NULL;

-- Ensure review table has seller_reply columns and unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'seller_reply'
  ) THEN
    ALTER TABLE reviews ADD COLUMN seller_reply TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'replied_at'
  ) THEN
    ALTER TABLE reviews ADD COLUMN replied_at TIMESTAMP(6);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_id_product_id_shop_order_id_key'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_product_id_shop_order_id_key UNIQUE (user_id, product_id, shop_order_id);
  END IF;
END
$$;

WITH review_rows(user_id, product_slug, shop_order_id, rating, comment, media_urls) AS (
  VALUES
    (1, 'classic-t-shirt', 9001, 5, 'Chất vải mềm và form mặc dễ chịu.', '[]'::jsonb),
    (1, 'premium-hoodie', 9002, 4, 'Mẫu đẹp, vải dày, nhưng ship chậm hơn dự kiến một chút.', '["https://example.com/reviews/hoodie-1.jpg"]'::jsonb),
    (1, 'sneaker-runner-pro', 9003, 5, 'Đế êm, đi bộ rất thoải mái.', '[]'::jsonb)
)
INSERT INTO reviews (user_id, product_id, shop_order_id, rating, comment, media_urls)
SELECT r.user_id,
       p.id,
       r.shop_order_id,
       r.rating,
       r.comment,
       r.media_urls
FROM review_rows r
JOIN products p ON p.slug = r.product_slug
LEFT JOIN reviews existing
  ON existing.user_id = r.user_id
 AND existing.product_id = p.id
 AND existing.comment = r.comment
WHERE existing.id IS NULL;

