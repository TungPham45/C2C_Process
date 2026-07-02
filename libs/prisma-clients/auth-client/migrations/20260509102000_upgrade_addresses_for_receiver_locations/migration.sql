ALTER TABLE "addresses"
  ADD COLUMN "recipient_name" VARCHAR(255),
  ADD COLUMN "phone_number" VARCHAR(20),
  ADD COLUMN "province_code" VARCHAR(10),
  ADD COLUMN "ward_code" VARCHAR(10),
  ADD COLUMN "label" VARCHAR(50),
  ADD COLUMN "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;

UPDATE "addresses" AS a
SET
  "recipient_name" = COALESCE(NULLIF(u."full_name", ''), split_part(u."email", '@', 1)),
  "phone_number" = COALESCE(NULLIF(a."phone_contact", ''), NULLIF(u."phone", ''), 'Chưa cập nhật'),
  "province_code" = CASE lower(COALESCE(a."city", ''))
    WHEN 'hà nội' THEN '01'
    WHEN 'ha noi' THEN '01'
    WHEN 'thành phố hồ chí minh' THEN '79'
    WHEN 'thanh pho ho chi minh' THEN '79'
    WHEN 'đà nẵng' THEN '48'
    WHEN 'da nang' THEN '48'
    ELSE '00'
  END,
  "ward_code" = CASE lower(COALESCE(a."ward", ''))
    WHEN 'khương mai' THEN '01141'
    WHEN 'phường 10' THEN '26740'
    WHEN 'phước mỹ' THEN '20296'
    WHEN 'phuoc my' THEN '20296'
    ELSE '00000'
  END,
  "label" = CASE lower(COALESCE(a."type", ''))
    WHEN 'home' THEN 'home'
    WHEN 'office' THEN 'office'
    WHEN 'shop_pickup' THEN 'office'
    ELSE 'other'
  END,
  "updated_at" = COALESCE(a."created_at", CURRENT_TIMESTAMP)
FROM "users" AS u
WHERE u."id" = a."user_id";

UPDATE "addresses"
SET
  "recipient_name" = COALESCE(NULLIF("recipient_name", ''), 'Người nhận'),
  "phone_number" = COALESCE(NULLIF("phone_number", ''), 'Chưa cập nhật'),
  "province_code" = COALESCE(NULLIF("province_code", ''), '00'),
  "ward_code" = COALESCE(NULLIF("ward_code", ''), '00000'),
  "label" = COALESCE(NULLIF("label", ''), 'other'),
  "updated_at" = COALESCE("updated_at", CURRENT_TIMESTAMP);

ALTER TABLE "addresses"
  ALTER COLUMN "recipient_name" SET NOT NULL,
  ALTER COLUMN "phone_number" SET NOT NULL,
  ALTER COLUMN "province_code" SET NOT NULL,
  ALTER COLUMN "ward_code" SET NOT NULL,
  ALTER COLUMN "address_line" TYPE TEXT,
  ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "addresses"
  DROP COLUMN "city",
  DROP COLUMN "district",
  DROP COLUMN "ward",
  DROP COLUMN "phone_contact",
  DROP COLUMN "type";

CREATE INDEX IF NOT EXISTS "idx_addresses_user_id" ON "addresses"("user_id");
CREATE INDEX IF NOT EXISTS "idx_addresses_is_default" ON "addresses"("is_default");
