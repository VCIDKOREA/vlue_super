-- VLUE 5-core backend foundation
CREATE TYPE "SourcingDraftStatus" AS ENUM ('draft', 'reviewed', 'confirmed');
CREATE TYPE "GroupBuyCampaignStatus" AS ENUM ('draft', 'live', 'closed');
CREATE TYPE "RemoteJobStatus" AS ENUM ('queued', 'running', 'done', 'failed', 'blocked');
CREATE TYPE "MailMessageDirection" AS ENUM ('inbound', 'outbound');

CREATE TABLE "store_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "display_name" VARCHAR(160) NOT NULL,
  "intro_text" TEXT,
  "meta_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "store_profiles_owner_user_id_created_at_idx" ON "store_profiles" ("owner_user_id", "created_at" DESC);

CREATE TABLE "sourcing_drafts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "store_profile_id" UUID,
  "source_image_url" VARCHAR(1000),
  "source_url" VARCHAR(1000),
  "content_json" JSONB,
  "status" "SourcingDraftStatus" NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "sourcing_drafts_owner_user_id_created_at_idx" ON "sourcing_drafts" ("owner_user_id", "created_at" DESC);

CREATE TABLE "external_sourcing_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "source_url" VARCHAR(1000) NOT NULL,
  "platform" VARCHAR(40) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "payload_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "external_sourcing_items_owner_user_id_created_at_idx" ON "external_sourcing_items" ("owner_user_id", "created_at" DESC);

CREATE TABLE "partnership_vault_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "kind" VARCHAR(40) NOT NULL DEFAULT 'product',
  "payload_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "partnership_vault_items_owner_user_id_created_at_idx" ON "partnership_vault_items" ("owner_user_id", "created_at" DESC);

CREATE TABLE "partnership_vault_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "kind" VARCHAR(40) NOT NULL DEFAULT 'linked_info',
  "payload_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "partnership_vault_connections_owner_user_id_created_at_idx" ON "partnership_vault_connections" ("owner_user_id", "created_at" DESC);

CREATE TABLE "groupbuy_campaigns" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "target_qty" INTEGER NOT NULL,
  "sold_qty" INTEGER NOT NULL DEFAULT 0,
  "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "GroupBuyCampaignStatus" NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "groupbuy_campaigns_owner_user_id_status_idx" ON "groupbuy_campaigns" ("owner_user_id", "status");

CREATE TABLE "groupbuy_stock_ticks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "sold_qty" INTEGER NOT NULL,
  "remain_qty" INTEGER NOT NULL,
  "payload_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "groupbuy_stock_ticks_campaign_id_created_at_idx" ON "groupbuy_stock_ticks" ("campaign_id", "created_at" DESC);

CREATE TABLE "live_stream_endpoints" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "platform" VARCHAR(40) NOT NULL,
  "stream_id" VARCHAR(120) NOT NULL,
  "rtmp_url" VARCHAR(1000) NOT NULL,
  "stream_key" VARCHAR(220) NOT NULL,
  "embed_url" VARCHAR(1000) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "live_stream_endpoints_platform_stream_id_key" ON "live_stream_endpoints" ("platform", "stream_id");
CREATE INDEX "live_stream_endpoints_owner_user_id_created_at_idx" ON "live_stream_endpoints" ("owner_user_id", "created_at" DESC);

CREATE TABLE "ppt_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "payload_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "ppt_jobs_owner_user_id_created_at_idx" ON "ppt_jobs" ("owner_user_id", "created_at" DESC);

CREATE TABLE "ppt_job_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ppt_job_id" UUID NOT NULL,
  "event_type" VARCHAR(60) NOT NULL,
  "payload_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "ppt_job_events_ppt_job_id_created_at_idx" ON "ppt_job_events" ("ppt_job_id", "created_at" DESC);

CREATE TABLE "company_line_whitelist" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "line_number" VARCHAR(40) NOT NULL,
  "line_label" VARCHAR(120),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "company_line_whitelist_owner_user_id_line_number_key" ON "company_line_whitelist" ("owner_user_id", "line_number");

CREATE TABLE "pc_agent_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "session_token" VARCHAR(160) NOT NULL,
  "device_label" VARCHAR(140) NOT NULL,
  "last_heartbeat_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "pc_agent_sessions_session_token_key" ON "pc_agent_sessions" ("session_token");
CREATE INDEX "pc_agent_sessions_owner_user_id_created_at_idx" ON "pc_agent_sessions" ("owner_user_id", "created_at" DESC);

CREATE TABLE "user_vault_folders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "folder_name" VARCHAR(140) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "user_vault_folders_owner_user_id_folder_name_key" ON "user_vault_folders" ("owner_user_id", "folder_name");

CREATE TABLE "asset_files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "folder_id" UUID,
  "file_name" VARCHAR(260) NOT NULL,
  "content_type" VARCHAR(120) NOT NULL,
  "file_size" INTEGER,
  "object_key" VARCHAR(500) NOT NULL,
  "file_url" VARCHAR(1000) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "asset_files_owner_user_id_created_at_idx" ON "asset_files" ("owner_user_id", "created_at" DESC);

CREATE TABLE "remote_print_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "source_asset_id" UUID NOT NULL,
  "target_line" VARCHAR(40) NOT NULL,
  "status" "RemoteJobStatus" NOT NULL DEFAULT 'queued',
  "message" VARCHAR(240),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "remote_print_jobs_owner_user_id_created_at_idx" ON "remote_print_jobs" ("owner_user_id", "created_at" DESC);

CREATE TABLE "remote_fax_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "source_asset_id" UUID NOT NULL,
  "target_line" VARCHAR(40) NOT NULL,
  "status" "RemoteJobStatus" NOT NULL DEFAULT 'queued',
  "message" VARCHAR(240),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "remote_fax_jobs_owner_user_id_created_at_idx" ON "remote_fax_jobs" ("owner_user_id", "created_at" DESC);

CREATE TABLE "mail_accounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "address" VARCHAR(254) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "mail_accounts_address_key" ON "mail_accounts" ("address");
CREATE INDEX "mail_accounts_owner_user_id_created_at_idx" ON "mail_accounts" ("owner_user_id", "created_at" DESC);

CREATE TABLE "mail_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "direction" "MailMessageDirection" NOT NULL,
  "from_address" VARCHAR(254) NOT NULL,
  "to_address" VARCHAR(254) NOT NULL,
  "subject" VARCHAR(260) NOT NULL,
  "body_text" TEXT,
  "payload_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "mail_messages_account_id_created_at_idx" ON "mail_messages" ("account_id", "created_at" DESC);

CREATE TABLE "mail_attachments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL,
  "asset_file_id" UUID,
  "file_name" VARCHAR(260) NOT NULL,
  "content_type" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "mail_attachments_message_id_created_at_idx" ON "mail_attachments" ("message_id", "created_at" DESC);
