-- CreateEnum
CREATE TYPE "VouchRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "vouch_requests" (
    "id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "note" TEXT,
    "status" "VouchRequestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vouch_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vouch_requests_to_user_id_status_idx" ON "vouch_requests"("to_user_id", "status");

-- CreateIndex
CREATE INDEX "vouch_requests_from_user_id_idx" ON "vouch_requests"("from_user_id");

-- AddForeignKey
ALTER TABLE "vouch_requests" ADD CONSTRAINT "vouch_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouch_requests" ADD CONSTRAINT "vouch_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
