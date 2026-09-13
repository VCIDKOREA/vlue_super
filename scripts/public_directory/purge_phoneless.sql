-- 무전화(빈 문자열 / NULL) public_directory_entries 정제
-- 안심팝업·수신 매칭에는 phone_e164 가 있는 행만 사용합니다.

-- 1) 삭제 전 건수 확인
SELECT
  COUNT(*) FILTER (WHERE coalesce(phone_e164, '') = '') AS phoneless,
  COUNT(*) FILTER (WHERE coalesce(phone_e164, '') <> '') AS with_phone,
  COUNT(*) AS total
FROM public_directory_entries;

-- 2) 무전화 행 삭제
DELETE FROM public_directory_entries
WHERE phone_e164 IS NULL
   OR phone_e164 = '';

-- 3) 상권(commerce) / 경찰(police) 중 전화 없는 잔여분 일괄 제거 (동일)
-- DELETE FROM public_directory_entries WHERE source_kind IN ('commerce', 'police') AND coalesce(phone_e164, '') = '';

-- 4) 삭제 후 확인
SELECT source_kind, COUNT(*) AS n
FROM public_directory_entries
GROUP BY source_kind
ORDER BY source_kind;
