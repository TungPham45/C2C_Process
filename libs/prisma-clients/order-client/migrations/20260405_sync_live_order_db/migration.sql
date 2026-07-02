-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "checkout_sessions" DROP CONSTRAINT IF EXISTS "checkout_sessions_platform_voucher_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_shop_order_id_fkey";

-- DropForeignKey
ALTER TABLE "shop_orders" DROP CONSTRAINT IF EXISTS "shop_orders_checkout_session_id_fkey";

-- DropForeignKey
ALTER TABLE "shop_orders" DROP CONSTRAINT IF EXISTS "shop_orders_shop_voucher_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_cart_items_cart_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_shop_orders_checkout_session_id";

-- AlterTable
ALTER TABLE "cart_items" 
DROP COLUMN IF EXISTS "shop_id",
DROP COLUMN IF EXISTS "updated_at",
ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "quantity" DROP DEFAULT;

-- DropTable
DROP TABLE IF EXISTS "carts" CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_platform_voucher_id_fkey" FOREIGN KEY ("platform_voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_shop_voucher_id_fkey" FOREIGN KEY ("shop_voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shop_order_id_fkey" FOREIGN KEY ("shop_order_id") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

