-- 가족플랜 수락 시 멤버십 경로 라벨 영구 기록
ALTER TABLE family_protection_links
  ADD COLUMN IF NOT EXISTS membership_path_label VARCHAR(120);
