-- AI 엑셀 에디터 — 워크북·리비전·생성 Job·템플릿

CREATE TYPE "ExcelWorkbookStatus" AS ENUM ('draft', 'active', 'archived');
CREATE TYPE "ExcelGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "office_excel_workbooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "template_id" VARCHAR(80),
    "status" "ExcelWorkbookStatus" NOT NULL DEFAULT 'draft',
    "head_revision_id" UUID,
    "head_revision_num" INTEGER NOT NULL DEFAULT 0,
    "last_exported_asset_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_excel_workbooks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "office_excel_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workbook_id" UUID NOT NULL,
    "revision_num" INTEGER NOT NULL,
    "parent_revision_id" UUID,
    "model_json" JSONB NOT NULL,
    "patch_json" JSONB,
    "change_summary" VARCHAR(500),
    "author_user_id" UUID NOT NULL,
    "author_client" VARCHAR(20) NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_excel_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "office_excel_generation_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workbook_id" UUID,
    "owner_user_id" UUID NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "template_id" VARCHAR(80),
    "status" "ExcelGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result_revision_id" UUID,
    "error_message" VARCHAR(500),
    "agent_trace_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_excel_generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "office_excel_templates" (
    "id" VARCHAR(80) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "model_json" JSONB NOT NULL,
    "prompt_hints" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "office_excel_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "office_excel_revisions_workbook_id_revision_num_key"
    ON "office_excel_revisions"("workbook_id", "revision_num");

CREATE UNIQUE INDEX "office_excel_workbooks_head_revision_id_key"
    ON "office_excel_workbooks"("head_revision_id");

CREATE INDEX "office_excel_workbooks_owner_user_id_updated_at_idx"
    ON "office_excel_workbooks"("owner_user_id", "updated_at" DESC);

CREATE INDEX "office_excel_revisions_workbook_id_revision_num_idx"
    ON "office_excel_revisions"("workbook_id", "revision_num" DESC);

CREATE INDEX "office_excel_generation_jobs_owner_user_id_created_at_idx"
    ON "office_excel_generation_jobs"("owner_user_id", "created_at" DESC);

ALTER TABLE "office_excel_revisions"
    ADD CONSTRAINT "office_excel_revisions_workbook_id_fkey"
    FOREIGN KEY ("workbook_id") REFERENCES "office_excel_workbooks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "office_excel_workbooks"
    ADD CONSTRAINT "office_excel_workbooks_head_revision_id_fkey"
    FOREIGN KEY ("head_revision_id") REFERENCES "office_excel_revisions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "office_excel_generation_jobs"
    ADD CONSTRAINT "office_excel_generation_jobs_workbook_id_fkey"
    FOREIGN KEY ("workbook_id") REFERENCES "office_excel_workbooks"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "office_excel_generation_jobs"
    ADD CONSTRAINT "office_excel_generation_jobs_result_revision_id_fkey"
    FOREIGN KEY ("result_revision_id") REFERENCES "office_excel_revisions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 시드 템플릿 (Mock Agent·에디터 테스트용)
INSERT INTO "office_excel_templates" ("id", "category", "title", "description", "model_json", "prompt_hints", "sort_order")
VALUES (
    'group_buy_order_v1',
    'commerce',
    '공구 주문 취합표',
    '채팅·폼 주문을 한 시트에 정리하는 표준 양식',
    '{"meta":{"title":"공구 주문 취합","templateId":"group_buy_order_v1","locale":"ko-KR","createdBy":"ai"},"sheets":[{"id":"orders","name":"주문취합","rowCount":200,"columnCount":12,"cellData":{"r0c0":{"v":"번호"},"r0c1":{"v":"이름"},"r0c2":{"v":"연락처"},"r0c3":{"v":"상품"},"r0c4":{"v":"수량"},"r0c5":{"v":"금액"},"r0c6":{"v":"입금여부"},"r1c0":{"v":1,"f":null},"r1c5":{"v":0,"f":"=D2*E2"}}]}]}'::jsonb,
    '["공구","주문","취합","입금"]'::jsonb,
    10
),
(
    'payment_reconcile_v1',
    'finance',
    '입금 대조표',
    '주문 금액과 실제 입금 내역을 대조',
    '{"meta":{"title":"입금 대조","templateId":"payment_reconcile_v1","locale":"ko-KR","createdBy":"ai"},"sheets":[{"id":"reconcile","name":"입금대조","rowCount":200,"columnCount":10,"cellData":{"r0c0":{"v":"주문번호"},"r0c1":{"v":"주문자"},"r0c2":{"v":"주문금액"},"r0c3":{"v":"입금액"},"r0c4":{"v":"차액"},"r1c4":{"v":0,"f":"=C2-D2"}}]}]}'::jsonb,
    '["입금","대조","정산"]'::jsonb,
    20
);
