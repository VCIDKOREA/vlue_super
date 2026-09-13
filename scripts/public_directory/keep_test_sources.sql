-- =============================================================================
-- 테스트 필수 소스만 유지 (0.5GB 안)
--
-- 필수: 통신판매(mailorder), 병원(hospital), 관공서(public_agency)
-- 제외: 우체국·학교·식품·나들·전화권유 등 (지금은 필수가 아님)
--
-- 주의: mailorder  alone 이 예전에 ~수십만 건이라 전체 유지 시 다시 한도 초과 가능.
--       아래 2)에서 종류별 상한(기본 15,000건)으로 자릅니다.
-- =============================================================================

-- 0) 현황
SELECT source_kind, COUNT(*) AS rows
FROM public_directory_entries
GROUP BY source_kind
ORDER BY rows DESC;

SELECT
  pg_size_pretty(pg_total_relation_size('public.public_directory_entries')) AS table_total,
  (SELECT COUNT(*) FROM public_directory_entries) AS row_count;

-- 1) 무거운 검색 인덱스 제거 (전화 btree 유지)
DROP INDEX IF EXISTS public_directory_entries_name_norm_trgm_idx;
DROP INDEX IF EXISTS public_directory_entries_display_name_trgm_idx;
DROP INDEX IF EXISTS public_directory_entries_display_name_idx;
DROP INDEX IF EXISTS public_directory_entries_name_norm_idx;
DROP INDEX IF EXISTS public_directory_entries_biz_no_idx;
DROP INDEX IF EXISTS public_directory_entries_kind_region_idx;

-- 2) 필수 3종만 남김
--    hospital 이 없고 health_center 만 있으면 health_center 도 포함
DELETE FROM public_directory_entries
WHERE source_kind NOT IN (
  'mailorder',
  'hospital',
  'health_center',
  'public_agency'
);

-- 3) 종류별 상한 — 무료 0.5GB 안전권 (필요 시 숫자만 조절)
--    mailorder/hospital 이 크면 최신순 15,000건만 유지
DELETE FROM public_directory_entries d
WHERE d.ctid IN (
  SELECT ctid FROM (
    SELECT ctid,
           source_kind,
           ROW_NUMBER() OVER (
             PARTITION BY source_kind
             ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
           ) AS rn
    FROM public_directory_entries
    WHERE source_kind IN ('mailorder', 'hospital', 'health_center')
  ) x
  WHERE rn > 15000
);

-- public_agency 는 보통 소량 — 상한 5,000
DELETE FROM public_directory_entries d
WHERE d.ctid IN (
  SELECT ctid FROM (
    SELECT ctid,
           ROW_NUMBER() OVER (
             ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
           ) AS rn
    FROM public_directory_entries
    WHERE source_kind = 'public_agency'
  ) x
  WHERE rn > 5000
);

-- 4) 디스크 회수
VACUUM (ANALYZE) public_directory_entries;

SELECT source_kind, COUNT(*) AS rows
FROM public_directory_entries
GROUP BY source_kind
ORDER BY rows DESC;

SELECT
  pg_size_pretty(pg_total_relation_size('public.public_directory_entries')) AS table_total,
  (SELECT COUNT(*) FROM public_directory_entries) AS row_count;

-- 배너 유지 시:
-- VACUUM FULL public_directory_entries;

-- 5) 용량 OK 후 테스트
-- Railway: PUBLIC_DIRECTORY_LOOKUP=1 → Redeploy
-- 끝나면 변수 삭제
