-- Admin devices: master phone + PC approval (6-digit code)

CREATE TABLE "admin_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "device_key" VARCHAR(80) NOT NULL,
    "user_id" UUID,
    "is_master" BOOLEAN NOT NULL DEFAULT false,
    "is_authorized" BOOLEAN NOT NULL DEFAULT false,
    "auth_code" VARCHAR(6),
    "auth_code_expires_at" TIMESTAMPTZ(6),
    "user_agent" VARCHAR(512),
    "last_ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_devices_device_key_key" ON "admin_devices"("device_key");

CREATE INDEX "admin_devices_auth_code_idx" ON "admin_devices"("auth_code");

ALTER TABLE "admin_devices" ADD CONSTRAINT "admin_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 이전 feed 마이그레이션이 테이블 생성 전에 실행될 수 있어, 기본값 제거는 여기서 확정
ALTER TABLE "admin_devices" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "admin_devices" ALTER COLUMN "updated_at" DROP DEFAULT;
