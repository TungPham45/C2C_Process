-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "fk_messages_conversation";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_conversationId_fkey";

-- DropTable
DROP TABLE IF EXISTS "messages" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "conversations" CASCADE;

-- CreateTable
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "status" VARCHAR(50) DEFAULT 'active',
    "last_message_preview" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "unread_count_buyer" INTEGER DEFAULT 0,
    "unread_count_seller" INTEGER DEFAULT 0,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_role" VARCHAR(20) NOT NULL,
    "message_type" VARCHAR(30) DEFAULT 'text',
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN DEFAULT false,
    "updated_at" TIMESTAMP(6),
    "edit_history" JSONB DEFAULT '[]'::jsonb,
    "sent_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_buyer_shop" ON "conversations"("buyer_id", "shop_id");

-- CreateIndex
CREATE INDEX "idx_conversations_buyer_shop" ON "conversations"("buyer_id", "shop_id");

-- CreateIndex
CREATE INDEX "idx_conversations_seller_id" ON "conversations"("seller_id");

-- CreateIndex
CREATE INDEX "idx_conversations_updated_at" ON "conversations"("updated_at");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_id" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_messages_sender_id" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_messages_sent_at" ON "messages"("sent_at");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
