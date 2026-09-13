# 공공 디렉터리 Supabase 적재 (전화 필수)

## 필터 정책 (모든 소스 공통)

1. **무전화 원천 차단** — `phone`이 `None` / `""` / 정규화 실패면 `continue` (적재 안 함)
2. **중복 차단** — DB·배치에 이미 같은 `phone_e164` 또는 `business_number`가 있으면 스킵  
   - 예외: 동일 `(source_kind, external_id)` 는 **UPSERT**로 갱신
3. **완료 로그** — `skipped_no_phone` / `skipped_duplicate` / `upserted` 집계 출력

| 패턴 | source_kind | 전화 | 기본 적재 |
|------|-------------|------|-----------|
| `학교기본정보_*.csv` | `school` | 있음 | ✅ |
| `*우체국*.csv` | `post_office` | 있음 | ✅ |
| `공공기관_행안부서.xlsx` | `public_agency` | 있음 | ✅ |
| `*나들가게*` | `nadeul` | 필수 | ✅ (파일 있으면) |
| `*통신판매*` | `mailorder` | 필수 | ✅ (파일 있으면) |
| `경찰청_*파출소*.csv` | `police` | **없음** | ❌ 기본 스킵 |
| `소상공인*상가(상권)정보_*.csv` | `commerce` | **202606 공개본 전화 없음** | ❌ 기본 스킵 |

## 실행

```powershell
cd D:\dev\vlue_super
pip install -r scripts/public_directory/requirements.txt

# 전화 있는 소스만 (학교·우체국·공공 + 나들/통신판매 파일 있으면 포함)
python scripts/public_directory/ingest_public_directory.py

# 미리보기 (DB 미기록)
python scripts/public_directory/ingest_public_directory.py --dry-run --limit-files 1

# DB 무전화 잔여 삭제만
python scripts/public_directory/ingest_public_directory.py --purge-phoneless
```

## 프로덕션 조회 스위치 (안전)

대량 적재 직후 DB 부하를 피하려면 API에서 **기본 OFF**입니다.  
안심팝업·검색·sync를 켤 때만 Railway에 설정:

```
PUBLIC_DIRECTORY_LOOKUP=1
```

**용량 초과 시:** Railway 에서 `PUBLIC_DIRECTORY_LOOKUP` 이 **없어야** 합니다 (1로 켜 두지 말 것).  
Android 도 `PublicDirectoryPhoneCache.ENABLE_DIRECTORY_SYNC = false` 로 sync 중단.

## SQL 용량 회수 (Supabase Free 초과)

배너 **EXCEEDING USAGE LIMITS** / `public_directory_entries` ~561MB 일 때:

1. Supabase → SQL Editor
2. `scripts/public_directory/reclaim_storage.sql` 을 **0 → 1 → 2-A → 3** 순으로 실행
3. 그래도 용량이 안 줄면 `TRUNCATE` (2-B) 후 `VACUUM FULL`

빠른 원샷 (대용량 소스 삭제 + trigram 인덱스 제거):

```sql
DROP INDEX IF EXISTS public_directory_entries_name_norm_trgm_idx;
DROP INDEX IF EXISTS public_directory_entries_display_name_trgm_idx;
DROP INDEX IF EXISTS public_directory_entries_display_name_idx;
DROP INDEX IF EXISTS public_directory_entries_name_norm_idx;

DELETE FROM public_directory_entries
WHERE source_kind IN (
  'food','mailorder','telesales','hospital','health_center','health','nadeul','commerce','police'
);

VACUUM (ANALYZE) public_directory_entries;
```

완전 비우기:

```sql
TRUNCATE TABLE public_directory_entries;
VACUUM FULL public_directory_entries;
```

## SQL 정제 (무전화)

`scripts/public_directory/purge_phoneless.sql` 참고:

```sql
DELETE FROM public_directory_entries
WHERE phone_e164 IS NULL OR phone_e164 = '';
```

## 인덱스

`phone_e164`, `phone_digits` (+ 선택적 이름 btree).  
`pg_trgm` GIN 은 용량·부하가 커서 무료 플랜에서는 **제거 권장** (`reclaim_storage.sql` 1단계).
