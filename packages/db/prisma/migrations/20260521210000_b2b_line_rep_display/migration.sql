-- 회선별 대표번호 연동 여부 (체크 시 디지털 명함·수신 표시 = master_display_number)
ALTER TABLE "b2b_cart_lines"
ADD COLUMN IF NOT EXISTS "use_master_display_number" BOOLEAN NOT NULL DEFAULT false;
