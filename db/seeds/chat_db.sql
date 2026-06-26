-- Rich chat seed data for local development.
-- buyer@gmail.com     -> user id 1
-- seller1@gmail.com   -> user id 2
-- seller2@gmail.com   -> user id 4
-- thoi-trang-b        -> shop id 1
-- giay-sneaker-pro    -> shop id 2

INSERT INTO conversations (
  buyer_id,
  seller_id,
  shop_id,
  status,
  last_message_preview,
  unread_count_buyer,
  unread_count_seller
)
VALUES
  (1, 2, 1, 'active', 'Cảm ơn shop, áo đẹp và đúng size.', 0, 1),
  (1, 4, 2, 'active', 'Shop ship COD được không?', 1, 0)
ON CONFLICT (buyer_id, shop_id) DO UPDATE
SET
  seller_id = EXCLUDED.seller_id,
  status = EXCLUDED.status,
  last_message_preview = EXCLUDED.last_message_preview,
  unread_count_buyer = EXCLUDED.unread_count_buyer,
  unread_count_seller = EXCLUDED.unread_count_seller,
  updated_at = NOW();

INSERT INTO messages (
  conversation_id,
  sender_id,
  sender_role,
  message_type,
  content,
  is_edited,
  updated_at,
  edit_history,
  sent_at,
  is_read
)
SELECT c.id,
       m.sender_id,
       m.sender_role,
       'text',
       m.content,
       false,
       NULL,
       '[]'::jsonb,
       m.sent_at,
       m.is_read
FROM conversations c
JOIN (
  VALUES
    (1, 1, 1, 'buyer', 'Shop ơi, áo thun còn size XL không ạ?', NOW() - INTERVAL '30 minutes', true),
    (1, 1, 2, 'seller', 'Còn bạn nhé, màu đen size XL còn 12 chiếc.', NOW() - INTERVAL '27 minutes', true),
    (1, 1, 1, 'buyer', 'Cảm ơn shop, áo đẹp và đúng size.', NOW() - INTERVAL '5 minutes', true),
    (1, 1, 2, 'seller', 'Cảm ơn bạn đã ủng hộ shop ạ.', NOW() - INTERVAL '2 minutes', false)
) AS m(buyer_id, shop_id, sender_id, sender_role, content, sent_at, is_read)
  ON c.buyer_id = m.buyer_id
 AND c.shop_id = m.shop_id
LEFT JOIN messages existing
  ON existing.conversation_id = c.id
 AND existing.sender_role = m.sender_role
 AND existing.content = m.content
WHERE existing.id IS NULL;

INSERT INTO messages (
  conversation_id,
  sender_id,
  sender_role,
  message_type,
  content,
  is_edited,
  updated_at,
  edit_history,
  sent_at,
  is_read
)
SELECT c.id,
       m.sender_id,
       m.sender_role,
       'text',
       m.content,
       false,
       NULL,
       '[]'::jsonb,
       m.sent_at,
       m.is_read
FROM conversations c
JOIN (
  VALUES
    (1, 2, 1, 'buyer', 'Giày size 41 còn hàng không shop?', NOW() - INTERVAL '45 minutes', true),
    (1, 2, 4, 'seller', 'Còn ạ, shop còn size 40 đến 42.', NOW() - INTERVAL '40 minutes', true),
    (1, 2, 1, 'buyer', 'Shop ship COD được không?', NOW() - INTERVAL '12 minutes', false),
    (1, 2, 4, 'seller', 'Được ạ, shop hỗ trợ COD toàn quốc.', NOW() - INTERVAL '10 minutes', false)
) AS m(buyer_id, shop_id, sender_id, sender_role, content, sent_at, is_read)
  ON c.buyer_id = m.buyer_id
 AND c.shop_id = m.shop_id
LEFT JOIN messages existing
  ON existing.conversation_id = c.id
 AND existing.sender_role = m.sender_role
 AND existing.content = m.content
WHERE existing.id IS NULL;
