-- =============================================================================
-- 0.5GB(무료 플랜) 안에서 공공디렉터리 "일부만" 유지하고 테스트
--
-- 질문 답:
-- - 적재했다고 DB/앱이 "완전 중지"되는 것은 아님.
-- - 무료 한도 초과 → CPU·연결·디스크 압박 → 로그인·담당자 등 "다른 기능까지" 느려짐.
-- - 대용량 소스만 빼고 소량(학교·우체국·공공기관 등)만 남기면
--   안심팝업 매칭을 0.5GB 안에서 테스트 가능.
--
-- 실행 순서: 0 → 1 → 2 → 3 → (선택) 4
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) 현황
-- ---------------------------------------------------------------------------
SELECT source_kind, COUNT(*) AS rows
FROM public_directory_entries
GROUP BY source_kind
ORDER BY rows DESC;

SELECT
  pg_size_pretty(pg_total_relation_size('public.public_directory_entries')) AS table_total,
  (SELECT COUNT(*) FROM public_directory_entries) AS row_count;

-- ---------------------------------------------------------------------------
-- 1) 용량 먹는 검색 인덱스 제거 (전화 매칭용 btree 는 유지)
--    trigram GIN 만으로도 ~120MB+ 차지
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public_directory_entries_name_norm_trgm_idx;
DROP INDEX IF EXISTS public_directory_entries_display_name_trgm_idx;
DROP INDEX IF EXISTS public_directory_entries_display_name_idx;
DROP INDEX IF EXISTS public_directory_entries_name_norm_idx;
DROP INDEX IF EXISTS public_directory_entries_biz_no_idx;
DROP INDEX IF EXISTS public_directory_entries_kind_region_idx;

-- ---------------------------------------------------------------------------
-- 2) 테스트용으로 "남길" 소스만 유지
--    KEEP: school, post_office, public_agency  (소량·전화 매칭 테스트에 충분)
--    DROP: food, mailorder, telesales, hospital... (대부분 용량)
-- ---------------------------------------------------------------------------
DELETE FROM public_directory_entries
WHERE source_kind NOT IN (
  'school',
  'post_office',
  'public_agency'
);

-- (선택) 그래도 크면 종류별 상한 — 예: 소스당 최대 5,000건
-- DELETE FROM public_directory_entries d
-- WHERE d.ctid IN (
--   SELECT ctid FROM (
--     SELECT ctid,
--            ROW_NUMBER() OVER (PARTITION BY source_kind ORDER BY updated_at DESC) AS rn
--     FROM public_directory_entries
--   ) x
--   WHERE rn > 5000
-- );

-- ---------------------------------------------------------------------------
-- 3) 디스크 회수 + 확인 (목표: table_total 이 여유 있게 100MB 이하 권장)
--    무료 플랜 전체 DB 한도가 ~0.5GB 이므로 이 테이블만 차지해도 안 됨.
-- ---------------------------------------------------------------------------
VACUUM (ANALYZE) public_directory_entries;

SELECT source_kind, COUNT(*) AS rows
FROM public_directory_entries
GROUP BY source_kind
ORDER BY rows DESC;

SELECT
  pg_size_pretty(pg_total_relation_size('public.public_directory_entries')) AS table_total,
  (SELECT COUNT(*) FROM public_directory_entries) AS row_count;

-- 배너가 안 내려가면 (락 주의, 한가할 때):
-- VACUUM FULL public_directory_entries;

-- ---------------------------------------------------------------------------
-- 4) 테스트 재개 (앱)
--    용량이 안정된 뒤 Railway Variables:
--      PUBLIC_DIRECTORY_LOOKUP=1
--    저장 → Redeploy
--    안심팝업/번호 조회가 school·우체국·공공기관 매칭만 동작하는지 확인.
--    끝나면 다시 PUBLIC_DIRECTORY_LOOKUP 삭제(또는 0) 권장.
-- =============================================================================
