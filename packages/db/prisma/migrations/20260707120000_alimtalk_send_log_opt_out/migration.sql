-- CreateTable
CREATE TABLE "alimtalk_send_logs" (
    "id" UUID NOT NULL,
    "peer_phone" VARCHAR(24) NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" VARCHAR(16) NOT NULL DEFAULT 'outbound',

    CONSTRAINT "alimtalk_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alimtalk_opt_outs" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alimtalk_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alimtalk_send_logs_peer_phone_sent_at_idx" ON "alimtalk_send_logs"("peer_phone", "sent_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "alimtalk_opt_outs_phone_key" ON "alimtalk_opt_outs"("phone");
