-- =============================================================================
-- public_directory_entries 용량 회수 (Supabase Free 초과 대응)
-- Supabase Dashboard → SQL Editor 에서 단계별로 실행하세요.
--
-- 주의:
-- 1) 안심팝업/공공디렉터리 조회는 PUBLIC_DIRECTORY_LOOKUP=1 일 때만 쓰입니다.
--    Railway 에 해당 변수가 없으면 앱은 이미 이 테이블을 조회하지 않습니다.
-- 2) DELETE 만으로는 디스크가 즉시 줄지 않을 수 있습니다. 마지막에 VACUUM 필요.
-- 3) VACUUM FULL 은 테이블 락이 걸립니다. 트래픽 적을 때 실행하세요.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) 현황 확인
-- ---------------------------------------------------------------------------
SELECT source_kind, COUNT(*) AS rows
FROM public_directory_entries
GROUP BY source_kind
ORDER BY rows DESC;

SELECT
  pg_size_pretty(pg_total_relation_size('public.public_directory_entries')) AS table_total,
  (SELECT COUNT(*) FROM public_directory_entries) AS row_count;

-- ---------------------------------------------------------------------------
-- 1) 가장 무거운 검색용 인덱스 제거 (GIN trigram ≈ 120MB+)
--    전화 매칭(btree phone_*) 은 유지. 기능 OFF 상태면 전부 불필요하지만
--    소량 유지(학교·우체국 등) 시 전화 인덱스는 남겨도 됩니다.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public_directory_entries_name_norm_trgm_idx;
DROP INDEX IF EXISTS public_directory_entries_display_name_trgm_idx;

-- 이름 검색용 btree 도 당분간 불필요하면 추가 회수
DROP INDEX IF EXISTS public_directory_entries_display_name_idx;
DROP INDEX IF EXISTS public_directory_entries_name_norm_idx;
DROP INDEX IF EXISTS public_directory_entries_biz_no_idx;
DROP INDEX IF EXISTS public_directory_entries_kind_region_idx;

-- ---------------------------------------------------------------------------
-- 2-A) 권장: 대용량 소스만 삭제 (식품·통신판매·전화권유·병원 등)
--      학교·우체국·공공기관은 유지 (상대적으로 소량)
-- ---------------------------------------------------------------------------
DELETE FROM public_directory_entries
WHERE source_kind IN (
  'food',
  'mailorder',
  'telesales',
  'hospital',
  'health_center',
  'health',
  'nadeul',
  'commerce',
  'police'
);

-- 삭제 후 확인
SELECT source_kind, COUNT(*) AS rows
FROM public_directory_entries
GROUP BY source_kind
ORDER BY rows DESC;

-- ---------------------------------------------------------------------------
-- 2-B) 더 공격적: 테이블 전체 비우기 (안심팝업 디렉터리 완전 중단)
--      2-A 로 부족하면 아래를 실행 (2-A 와 둘 중 하나)
-- ---------------------------------------------------------------------------
-- TRUNCATE TABLE public_directory_entries;

-- ---------------------------------------------------------------------------
-- 3) 디스크 회수
--    일반 VACUUM 먼저. 용량 배지가 안 내려가면 VACUUM FULL.
-- ---------------------------------------------------------------------------
VACUUM (ANALYZE) public_directory_entries;

-- 그래도 Supabase "EXCEEDING USAGE LIMITS" 가 유지되면 (락 주의):
-- VACUUM FULL public_directory_entries;

-- 최종 크기
SELECT
  pg_size_pretty(pg_total_relation_size('public.public_directory_entries')) AS table_total,
  (SELECT COUNT(*) FROM public_directory_entries) AS row_count;
