-- CreateTable
CREATE TABLE "shops" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER,
    "name" VARCHAR(255),
    "slug" VARCHAR(255),
    "description" TEXT,
    "logo_url" TEXT,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "status" VARCHAR(50) DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "description" TEXT,
    "base_price" DECIMAL(12,2) NOT NULL,
    "thumbnail_url" TEXT,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "sold_count" INTEGER DEFAULT 0,
    "status" VARCHAR(50) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "shop_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "icon_url" TEXT,
    "level" INTEGER DEFAULT 1,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sku" VARCHAR(100),
    "stock_quantity" INTEGER DEFAULT 0,
    "price_override" DECIMAL(12,2),
    "attributes" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "image_url" TEXT NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_definitions" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "input_type" VARCHAR(50),
    "is_required" BOOLEAN DEFAULT false,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_options" (
    "id" SERIAL NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "value_name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "attribute_option_id" INTEGER,
    "custom_value" TEXT,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "shop_order_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_values_product_id_attribute_id_key" ON "product_attribute_values"("product_id", "attribute_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_options" ADD CONSTRAINT "attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_option_id_fkey" FOREIGN KEY ("attribute_option_id") REFERENCES "attribute_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

