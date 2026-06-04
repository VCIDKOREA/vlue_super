-- VLUE 사기 피해 방지 · 증거 시스템
CREATE TABLE IF NOT EXISTS fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  room_id VARCHAR(120) NOT NULL,
  fraud_type VARCHAR(80),
  period_from TIMESTAMPTZ,
  period_to TIMESTAMPTZ,
  certification_id VARCHAR(40) NOT NULL UNIQUE,
  blockchain_hash VARCHAR(64) NOT NULL,
  evidence_html TEXT,
  pdf_password_hint VARCHAR(80),
  storage_url VARCHAR(500),
  submitted_to JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES fraud_reports(id) ON DELETE CASCADE,
  message_id VARCHAR(120),
  sender_id UUID,
  content_snapshot TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  original_hash VARCHAR(64) NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  risk_level VARCHAR(20),
  pattern_type VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_evidence_report ON fraud_evidence_items(report_id);

CREATE TABLE IF NOT EXISTS fraud_pattern_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(120) NOT NULL,
  message_id VARCHAR(120),
  sender_id UUID,
  content_excerpt VARCHAR(500),
  is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
  pattern_type VARCHAR(120),
  reason VARCHAR(500),
  highlight BOOLEAN NOT NULL DEFAULT FALSE,
  raw_ai JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_pattern_room ON fraud_pattern_logs(room_id, created_at DESC);
