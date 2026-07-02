-- CreateTable
CREATE TABLE "vouchers" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" VARCHAR(50),
    "discount_value" DECIMAL(12,2) NOT NULL,
    "min_spend" DECIMAL(12,2) DEFAULT 0,
    "max_discount" DECIMAL(12,2),
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "usage_limit" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "cart_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_payment" DECIMAL(12,2) NOT NULL,
    "payment_method" VARCHAR(50),
    "payment_status" VARCHAR(50) DEFAULT 'unpaid',
    "platform_voucher_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_orders" (
    "id" SERIAL NOT NULL,
    "checkout_session_id" INTEGER NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shipping_fee" DECIMAL(12,2) NOT NULL,
    "shop_voucher_id" INTEGER,
    "shipping_address" TEXT NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending',
    "tracking_number" VARCHAR(100),
    "carrier_name" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "shop_order_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "variant_details" JSONB,
    "quantity" INTEGER NOT NULL,
    "price_at_purchase" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_tracking_number_key" ON "shop_orders"("tracking_number");

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_platform_voucher_id_fkey" FOREIGN KEY ("platform_voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_shop_voucher_id_fkey" FOREIGN KEY ("shop_voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shop_order_id_fkey" FOREIGN KEY ("shop_order_id") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

