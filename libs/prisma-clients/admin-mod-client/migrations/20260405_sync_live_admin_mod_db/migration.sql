-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_report_reason_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_reports_reporter_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_reports_target_type";

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_report_reason_id_fkey" FOREIGN KEY ("report_reason_id") REFERENCES "report_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

