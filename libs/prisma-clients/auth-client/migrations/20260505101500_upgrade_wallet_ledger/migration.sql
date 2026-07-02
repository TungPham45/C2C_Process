DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
    CREATE TYPE "TransactionType" AS ENUM (
      'topup',
      'payment',
      'payout',
      'withdraw',
      'refund',
      'transfer_in',
      'transfer_out',
      'fee'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
    CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'completed', 'failed');
  END IF;
END $$;

ALTER TABLE "wallets"
ALTER COLUMN "balance" TYPE DECIMAL(15,2);

ALTER TABLE "wallet_transactions"
ADD COLUMN IF NOT EXISTS "user_id" INTEGER,
ADD COLUMN IF NOT EXISTS "balance_before" DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS "balance_after" DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS "status" "TransactionStatus",
ADD COLUMN IF NOT EXISTS "reference_id" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "reference_type" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(6);

ALTER TABLE "wallet_transactions"
ALTER COLUMN "amount" TYPE DECIMAL(15,2);

ALTER TABLE "wallet_transactions"
ALTER COLUMN "transaction_type" TYPE "TransactionType"
USING (
  CASE
    WHEN LOWER(COALESCE("transaction_type"::text, '')) IN (
      'topup',
      'payment',
      'payout',
      'withdraw',
      'refund',
      'transfer_in',
      'transfer_out',
      'fee'
    ) THEN LOWER("transaction_type"::text)
    WHEN LOWER(COALESCE("transaction_type"::text, '')) = 'credit' THEN 'topup'
    WHEN LOWER(COALESCE("transaction_type"::text, '')) = 'debit' THEN 'payment'
    WHEN "amount" < 0 THEN 'payment'
    ELSE 'topup'
  END
)::"TransactionType";

UPDATE "wallet_transactions"
SET
  "amount" = ABS("amount"),
  "status" = COALESCE("status", 'completed'::"TransactionStatus"),
  "created_at" = COALESCE("created_at", CURRENT_TIMESTAMP);

WITH normalized AS (
  SELECT
    wt."id",
    wt."wallet_id",
    w."user_id",
    wt."created_at",
    CASE
      WHEN wt."transaction_type" IN ('payment', 'payout', 'withdraw', 'transfer_out', 'fee') THEN -wt."amount"
      ELSE wt."amount"
    END AS signed_amount
  FROM "wallet_transactions" wt
  JOIN "wallets" w ON w."id" = wt."wallet_id"
),
balances AS (
  SELECT
    "id",
    "user_id",
    COALESCE(
      SUM(signed_amount) OVER (
        PARTITION BY "wallet_id"
        ORDER BY "created_at", "id"
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS balance_before,
    COALESCE(
      SUM(signed_amount) OVER (
        PARTITION BY "wallet_id"
        ORDER BY "created_at", "id"
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ),
      0
    ) AS balance_after
  FROM normalized
)
UPDATE "wallet_transactions" wt
SET
  "user_id" = balances."user_id",
  "balance_before" = balances.balance_before,
  "balance_after" = balances.balance_after,
  "completed_at" = CASE
    WHEN wt."status" = 'completed'::"TransactionStatus" AND wt."completed_at" IS NULL THEN wt."created_at"
    ELSE wt."completed_at"
  END
FROM balances
WHERE wt."id" = balances."id";

WITH latest_balances AS (
  SELECT DISTINCT ON (wt."wallet_id")
    wt."wallet_id",
    wt."balance_after"
  FROM "wallet_transactions" wt
  ORDER BY wt."wallet_id", wt."created_at" DESC, wt."id" DESC
)
UPDATE "wallets" w
SET
  "balance" = lb."balance_after",
  "updated_at" = CURRENT_TIMESTAMP
FROM latest_balances lb
WHERE w."id" = lb."wallet_id";

ALTER TABLE "wallet_transactions"
ALTER COLUMN "transaction_type" SET NOT NULL,
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "balance_before" SET NOT NULL,
ALTER COLUMN "balance_after" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'completed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallet_transactions_user_id_fkey'
  ) THEN
    ALTER TABLE "wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_wallet_time"
ON "wallet_transactions" ("wallet_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_user_time"
ON "wallet_transactions" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_type_status"
ON "wallet_transactions" ("transaction_type", "status");

CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_reference"
ON "wallet_transactions" ("reference_id", "reference_type");
