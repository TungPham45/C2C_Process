-- CreateTable
CREATE TABLE "report_reasons" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "product_id" INTEGER,
    "shop_id" INTEGER,
    "shop_order_id" INTEGER,
    "report_reason_id" INTEGER NOT NULL,
    "custom_reason" TEXT,
    "title" VARCHAR(255),
    "description" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "severity" VARCHAR(50) DEFAULT 'medium',
    "status" VARCHAR(50) DEFAULT 'pending',
    "admin_id" INTEGER,
    "admin_note" TEXT,
    "resolution" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(6),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_reasons_code_key" ON "report_reasons"("code");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_report_reason_id_fkey" FOREIGN KEY ("report_reason_id") REFERENCES "report_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

