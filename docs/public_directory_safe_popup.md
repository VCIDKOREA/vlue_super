# 공공·상권 디렉터리 · 수신 안심팝업 정책

## 수신 UI 분기

| 조건 | UI |
|------|-----|
| `public_directory_entries` 전화 매칭 (학교·우체국·공공기관 등) | **안심팝업** (`profileKind=public_directory_safe`) — 상호/기관명+번호, 신고/제보 없음 |
| 기기 주소록 비회원 | 기존 안심케어 (`contact_safe_care`) |
| VLUÉ 회원 + 송출 ON | DCC+쇼케이스 |
| DB·주소록 모두 없음 | **미인증 쇼케이스** — 신고/제보 + 변작·원격 징후 |

## 적재

- 스크립트: `scripts/public_directory/ingest_public_directory.py`
- 스키마: `public_directory_entries` (phone / name / biz_no 인덱스)
- 상권·경찰 CSV는 **전화 컬럼 없음** → 통합검색(VLUE 인증)용만 적재

## 검색

- `GET /api/v1/search/verify` — 카카오·네이버·공공/국세청 + **VLUE 디렉터리** (`vlue_auth.status_text = "VLUE 인증"`)
- `GET /api/v1/directory/search?q=` — 디렉터리 단독 (min 2자, limit≤30)
- `GET /api/v1/directory/sync` — 앱 로컬 전화 인덱스 증분 동기화

## 캐시

1. Android `PublicDirectoryPhoneCache` — 전화→상호 SharedPreferences + 주간 sync  
2. `CardLookupRepository` 메모리/디스크 캐시 (기존)  
3. 수신 시 로컬 히트면 네트워크 생략 후 안심팝업 JSON 합성
