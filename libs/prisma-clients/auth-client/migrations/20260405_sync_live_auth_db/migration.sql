-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT IF EXISTS "addresses_user_id_fkey";

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "carts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_wallet_id_fkey";

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_user_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "carts_user_id_key";

-- DropIndex
DROP INDEX IF EXISTS "idx_users_email";

-- AlterTable
ALTER TABLE "wallet_transactions" 
DROP COLUMN IF EXISTS "reason",
DROP COLUMN IF EXISTS "reference_id",
DROP COLUMN IF EXISTS "type",
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "transaction_type" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "carts_user_id_key" ON "carts"("user_id");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

