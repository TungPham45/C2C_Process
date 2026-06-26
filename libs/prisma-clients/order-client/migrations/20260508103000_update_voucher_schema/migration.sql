-- Sync Voucher schema
ALTER TABLE "vouchers" RENAME COLUMN "usage_limit" TO "total_quantity";
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "used_count" INTEGER DEFAULT 0;
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "max_per_user" INTEGER DEFAULT 1;
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'scheduled';

-- Make columns NOT NULL to match Prisma schema
ALTER TABLE "vouchers" ALTER COLUMN "discount_type" SET NOT NULL;
ALTER TABLE "vouchers" ALTER COLUMN "start_date" SET NOT NULL;
ALTER TABLE "vouchers" ALTER COLUMN "end_date" SET NOT NULL;

-- Sync cart_items schema
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cart_items' AND column_name='shop_id') THEN
        ALTER TABLE "cart_items" ADD COLUMN "shop_id" INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE "cart_items" ALTER COLUMN "shop_id" DROP DEFAULT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cart_items' AND column_name='updated_at') THEN
        ALTER TABLE "cart_items" ADD COLUMN "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
ALTER TABLE "cart_items" ALTER COLUMN "quantity" DROP NOT NULL;
ALTER TABLE "cart_items" ALTER COLUMN "quantity" SET DEFAULT 1;

-- Sync shop_orders schema
ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "platform_discount_amount" DECIMAL(12,2) DEFAULT 0 NOT NULL;
ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(6);

-- Create missing tables
CREATE TABLE IF NOT EXISTS "user_voucher_claims" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "claimed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_used" BOOLEAN DEFAULT false,
    "used_at" TIMESTAMP(6),
    "checkout_session_id" INTEGER,
    "shop_order_id" INTEGER,

    CONSTRAINT "user_voucher_claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform_voucher_settlements" (
    "id" SERIAL NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "shop_order_id" INTEGER NOT NULL,
    "checkout_session_id" INTEGER NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL,
    "settled_amount" DECIMAL(12,2) DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "settled_at" TIMESTAMP(6),
    "note" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_voucher_settlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "seller_payouts" (
    "id" SERIAL NOT NULL,
    "shop_order_id" INTEGER NOT NULL,
    "checkout_session_id" INTEGER NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "seller_user_id" INTEGER NOT NULL,
    "order_amount" DECIMAL(12,2) NOT NULL,
    "platform_fee" DECIMAL(12,2) NOT NULL,
    "seller_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'holding',
    "eligible_at" TIMESTAMP(6) NOT NULL,
    "paid_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id")
);

-- Create missing indexes
CREATE INDEX IF NOT EXISTS "idx_user_voucher_claims_user" ON "user_voucher_claims"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_voucher_claims_voucher" ON "user_voucher_claims"("voucher_id");
CREATE INDEX IF NOT EXISTS "idx_user_voucher_claims_used" ON "user_voucher_claims"("is_used");
CREATE INDEX IF NOT EXISTS "idx_user_voucher_claims_session" ON "user_voucher_claims"("checkout_session_id");
CREATE INDEX IF NOT EXISTS "idx_user_voucher_claims_order" ON "user_voucher_claims"("shop_order_id");

CREATE INDEX IF NOT EXISTS "idx_platform_settlements_voucher" ON "platform_voucher_settlements"("voucher_id");
CREATE INDEX IF NOT EXISTS "idx_platform_settlements_shop_order" ON "platform_voucher_settlements"("shop_order_id");
CREATE INDEX IF NOT EXISTS "idx_platform_settlements_status" ON "platform_voucher_settlements"("status");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='seller_payouts_shop_order_id_key') THEN
        CREATE UNIQUE INDEX "seller_payouts_shop_order_id_key" ON "seller_payouts"("shop_order_id");
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS "idx_seller_payouts_status_eligible" ON "seller_payouts"("status", "eligible_at");
CREATE INDEX IF NOT EXISTS "idx_seller_payouts_shop" ON "seller_payouts"("shop_id");
CREATE INDEX IF NOT EXISTS "idx_seller_payouts_seller" ON "seller_payouts"("seller_user_id");

-- Add missing foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_voucher_claims_voucher_id_fkey') THEN
        ALTER TABLE "user_voucher_claims" ADD CONSTRAINT "user_voucher_claims_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_voucher_claims_checkout_session_id_fkey') THEN
        ALTER TABLE "user_voucher_claims" ADD CONSTRAINT "user_voucher_claims_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_voucher_claims_shop_order_id_fkey') THEN
        ALTER TABLE "user_voucher_claims" ADD CONSTRAINT "user_voucher_claims_shop_order_id_fkey" FOREIGN KEY ("shop_order_id") REFERENCES "shop_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='platform_voucher_settlements_voucher_id_fkey') THEN
        ALTER TABLE "platform_voucher_settlements" ADD CONSTRAINT "platform_voucher_settlements_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='platform_voucher_settlements_shop_order_id_fkey') THEN
        ALTER TABLE "platform_voucher_settlements" ADD CONSTRAINT "platform_voucher_settlements_shop_order_id_fkey" FOREIGN KEY ("shop_order_id") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='platform_voucher_settlements_checkout_session_id_fkey') THEN
        ALTER TABLE "platform_voucher_settlements" ADD CONSTRAINT "platform_voucher_settlements_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='seller_payouts_shop_order_id_fkey') THEN
        ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_shop_order_id_fkey" FOREIGN KEY ("shop_order_id") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
