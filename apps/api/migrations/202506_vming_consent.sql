-- VLUE 브이밍 AI 개인정보 동의
CREATE TABLE IF NOT EXISTS vming_room_consent_config (
  room_id VARCHAR(120) PRIMARY KEY,
  consent_mode VARCHAR(20) NOT NULL DEFAULT 'all',
  consent_version VARCHAR(20) NOT NULL DEFAULT '2025.06.01',
  requested_by UUID NOT NULL,
  room_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_member_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(120) NOT NULL,
  user_id UUID NOT NULL,
  user_name VARCHAR(120),
  consent_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  consent_mode VARCHAR(20) NOT NULL DEFAULT 'all',
  consented_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  consent_version VARCHAR(20) NOT NULL DEFAULT '2025.06.01',
  ip_address_enc TEXT,
  device_info_enc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_member_consent_room ON room_member_consent(room_id);

CREATE TABLE IF NOT EXISTS consent_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(120) NOT NULL,
  user_id UUID,
  action VARCHAR(40) NOT NULL,
  action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by UUID,
  memo TEXT,
  meta_enc TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_room ON consent_audit_logs(room_id, action_at DESC);
