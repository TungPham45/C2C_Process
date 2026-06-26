-- DropForeignKey
ALTER TABLE "attribute_definitions" DROP CONSTRAINT IF EXISTS "attribute_definitions_category_id_fkey";

-- DropForeignKey
ALTER TABLE "attribute_options" DROP CONSTRAINT IF EXISTS "attribute_options_attribute_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "product_attribute_values" DROP CONSTRAINT IF EXISTS "product_attribute_values_attribute_id_fkey";

-- DropForeignKey
ALTER TABLE "product_attribute_values" DROP CONSTRAINT IF EXISTS "product_attribute_values_attribute_option_id_fkey";

-- DropForeignKey
ALTER TABLE "product_attribute_values" DROP CONSTRAINT IF EXISTS "product_attribute_values_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT IF EXISTS "product_images_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT IF EXISTS "product_images_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_product_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_product_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_product_variants_product_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_products_category_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_products_shop_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_shops_owner_id";

-- AlterTable
ALTER TABLE "shops" ALTER COLUMN "owner_id" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_shop_id_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_category_id_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_fkey";
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_shop_id_fkey";
ALTER TABLE "categories" ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_product_id_fkey";
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT IF EXISTS "product_images_product_id_fkey";
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT IF EXISTS "product_images_variant_id_fkey";
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_definitions" DROP CONSTRAINT IF EXISTS "attribute_definitions_category_id_fkey";
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_options" DROP CONSTRAINT IF EXISTS "attribute_options_attribute_id_fkey";
ALTER TABLE "attribute_options" ADD CONSTRAINT "attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" DROP CONSTRAINT IF EXISTS "product_attribute_values_product_id_fkey";
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" DROP CONSTRAINT IF EXISTS "product_attribute_values_attribute_id_fkey";
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" DROP CONSTRAINT IF EXISTS "product_attribute_values_attribute_option_id_fkey";
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_option_id_fkey" FOREIGN KEY ("attribute_option_id") REFERENCES "attribute_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_product_id_fkey";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

