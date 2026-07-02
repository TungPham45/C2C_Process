CREATE TABLE "shop_follows" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_follows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_shop_follows_shop_user" ON "shop_follows"("shop_id", "user_id");
CREATE INDEX "idx_shop_follows_shop" ON "shop_follows"("shop_id");
CREATE INDEX "idx_shop_follows_user" ON "shop_follows"("user_id");

ALTER TABLE "shop_follows"
ADD CONSTRAINT "shop_follows_shop_id_fkey"
FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
