DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_voucher_claims'
  ) THEN
    ALTER TABLE "user_voucher_claims" DROP CONSTRAINT IF EXISTS "uq_user_voucher";
  END IF;
END $$;

DROP INDEX IF EXISTS "uq_user_voucher";
