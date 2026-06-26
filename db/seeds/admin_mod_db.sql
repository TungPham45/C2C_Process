-- Rich moderation seed data for local development.

INSERT INTO report_reasons (code, name, description, category, is_active)
VALUES
  ('SP01', 'Hàng giả / nhái', 'Sản phẩm không đúng mô tả hoặc có dấu hiệu hàng giả.', 'product', true),
  ('SP02', 'Hình ảnh sai sự thật', 'Hình ảnh và mô tả không khớp với sản phẩm thật.', 'product', true),
  ('SP03', 'Nội dung spam', 'Nội dung đăng bán gây nhiễu hoặc lặp lại bất thường.', 'product', true),
  ('SHOP01', 'Shop lừa đảo', 'Shop không giao hàng hoặc giao hàng kém chất lượng.', 'shop', true),
  ('SHOP02', 'Shop giả mạo thương hiệu', 'Gian hàng có dấu hiệu mạo danh thương hiệu khác.', 'shop', true),
  ('ORDER01', 'Đơn hàng bị hủy không lý do', 'Người bán hủy đơn mà không thông báo.', 'order', true),
  ('ORDER02', 'Chậm giao hàng', 'Đơn hàng bị trễ hơn thời gian dự kiến quá lâu.', 'order', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

INSERT INTO reports (
  reporter_id,
  target_type,
  product_id,
  shop_id,
  shop_order_id,
  report_reason_id,
  custom_reason,
  title,
  description,
  evidence_urls,
  severity,
  status,
  admin_id,
  admin_note,
  resolution,
  resolved_at
)
SELECT 1,
       'product',
       1,
       1,
       NULL,
       rr.id,
       NULL,
       'Áo thun giao khác mô tả',
       'Người mua phản ánh chất liệu giao thực tế không giống mô tả trên trang sản phẩm.',
       '["https://example.com/evidence/product-1.jpg"]'::jsonb,
       'medium',
       'pending',
       NULL,
       NULL,
       NULL,
       NULL
FROM report_reasons rr
WHERE rr.code = 'SP02'
  AND NOT EXISTS (
    SELECT 1
    FROM reports r
    WHERE r.title = 'Áo thun giao khác mô tả'
  );

INSERT INTO reports (
  reporter_id,
  target_type,
  product_id,
  shop_id,
  shop_order_id,
  report_reason_id,
  custom_reason,
  title,
  description,
  evidence_urls,
  severity,
  status,
  admin_id,
  admin_note,
  resolution,
  resolved_at
)
SELECT 1,
       'shop',
       NULL,
       3,
       NULL,
       rr.id,
       NULL,
       'Shop mới cần xác minh thêm',
       'Tài khoản bán hàng mới đang chờ duyệt, cần bổ sung giấy tờ và địa chỉ lấy hàng.',
       '["https://example.com/evidence/shop-3.png"]'::jsonb,
       'low',
       'under_review',
       3,
       'Đã liên hệ người bán để bổ sung hồ sơ.',
       NULL,
       NULL
FROM report_reasons rr
WHERE rr.code = 'SHOP02'
  AND NOT EXISTS (
    SELECT 1
    FROM reports r
    WHERE r.title = 'Shop mới cần xác minh thêm'
  );

INSERT INTO reports (
  reporter_id,
  target_type,
  product_id,
  shop_id,
  shop_order_id,
  report_reason_id,
  custom_reason,
  title,
  description,
  evidence_urls,
  severity,
  status,
  admin_id,
  admin_note,
  resolution,
  resolved_at
)
SELECT 1,
       'order',
       NULL,
       2,
       9002,
       rr.id,
       NULL,
       'Đơn sneaker giao chậm',
       'Đơn hàng sneaker bị trễ 3 ngày so với cam kết ban đầu của shop.',
       '["https://example.com/evidence/order-9002.png"]'::jsonb,
       'medium',
       'resolved',
       3,
       'Admin đã xác minh và yêu cầu shop bồi thường phí vận chuyển.',
       'refund_issued',
       NOW() - INTERVAL '1 day'
FROM report_reasons rr
WHERE rr.code = 'ORDER02'
  AND NOT EXISTS (
    SELECT 1
    FROM reports r
    WHERE r.title = 'Đơn sneaker giao chậm'
  );
