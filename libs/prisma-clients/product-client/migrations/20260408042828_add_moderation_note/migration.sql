-- AlterTable
ALTER TABLE "products" ADD COLUMN     "moderation_note" TEXT,
ALTER COLUMN "status" SET DEFAULT 'pending_approval';
