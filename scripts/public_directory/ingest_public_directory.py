"""
data/ 폴더 공공·상권 CSV/XLSX → Supabase(Postgres) public_directory_entries 벌크 적재.

Usage (repo root):
  pip install -r scripts/public_directory/requirements.txt
  set DATABASE_URL=postgresql://...   # 또는 apps/api/.env
  python scripts/public_directory/ingest_public_directory.py
  python scripts/public_directory/ingest_public_directory.py --dry-run --limit-files 2
  python scripts/public_directory/ingest_public_directory.py --kinds school,post_office
  python scripts/public_directory/ingest_public_directory.py --skip-commerce

안전장치 (모든 소스 공통):
  1) 전화 None / "" / 정규화 실패 → 적재 제외
  2) 동일 phone_e164 또는 business_number 가 이미 DB·배치에 있으면 스킵
     (단, 동일 source_kind+external_id 는 UPSERT로 갱신)
  3) 완료 로그: 무전화 제외 / 중복 제외 / 정상 적재
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Iterator, List, Optional, Set, Tuple

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
sys.path.insert(0, str(Path(__file__).resolve().parent))

from normalize import (  # noqa: E402
    normalize_business_number,
    normalize_name,
    normalize_phone_digits,
    safe_str,
    to_e164_kr,
)

ENCODINGS = ("utf-8-sig", "utf-8", "cp949", "euc-kr")

# 통신판매 등 긴 필드(취급품목·주소) 대비
try:
    csv.field_size_limit(10 * 1024 * 1024)
except OverflowError:
    csv.field_size_limit(1_000_000)

PHONE_HEADER_KEYS = (
    "전화번호",
    "전화",
    "연락처",
    "점포연락처",
    "대표 전화번호",
    "대표전화",
    "대표전화번호",
    "휴대폰",
    "휴대전화",
    "우체국전화번호",
    "tel",
    "Tel",
    "TEL",
    "phone",
    "Phone",
    "PHONE",
    "telno",
    "TelNo",
)

NAME_HEADER_KEYS = (
    "상호명",
    "상호",
    "사업장명",
    "보건기관명",
    "업체명",
    "상점명",
    "가게명",
    "법인명",
    "점포명",
    "브랜드명",
    "학교명",
    "관내우체국명",
    "기관명",
    "부서명",
    "관서명",
    "이름",
)

BIZ_HEADER_KEYS = (
    "사업자등록번호",
    "사업자번호",
    "사업자등록번호(법인)",
    "사업자 등록번호",
)


@dataclass
class FilterStats:
    """파일·전체 적재 집계."""

    rows_read: int = 0
    skipped_no_phone: int = 0
    skipped_no_name: int = 0
    skipped_closed: int = 0
    skipped_duplicate: int = 0
    upserted: int = 0
    detail_dup_phone: int = 0
    detail_dup_biz: int = 0
    detail_dup_batch: int = 0

    def merge(self, other: "FilterStats") -> None:
        for k in self.__dataclass_fields__:
            setattr(self, k, getattr(self, k) + getattr(other, k))

    def summary_line(self, prefix: str = "") -> str:
        return (
            f"{prefix}rows_read={self.rows_read} "
            f"skipped_no_phone={self.skipped_no_phone} "
            f"skipped_closed={self.skipped_closed} "
            f"skipped_duplicate={self.skipped_duplicate} "
            f"(phone={self.detail_dup_phone} biz={self.detail_dup_biz} batch={self.detail_dup_batch}) "
            f"upserted={self.upserted}"
        )


@dataclass
class BatchDedup:
    """
    전화·사업자번호 교차 중복 차단.
    동일 (source_kind, external_id) 재실행은 UPSERT 허용.
    """

    phone_owner: Dict[str, Tuple[str, str]] = field(default_factory=dict)
    biz_owner: Dict[str, Tuple[str, str]] = field(default_factory=dict)
    batch_keys: Set[Tuple[str, str]] = field(default_factory=set)

    def load_from_db(self, conn) -> int:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT source_kind, external_id, phone_e164, business_number
                FROM public_directory_entries
                WHERE coalesce(phone_e164, '') <> ''
                """
            )
            n = 0
            for source_kind, external_id, phone, biz in cur.fetchall():
                key = (str(source_kind), str(external_id))
                if phone:
                    self.phone_owner.setdefault(str(phone), key)
                if biz:
                    self.biz_owner.setdefault(str(biz), key)
                n += 1
            return n

    def classify(self, row: Dict[str, Any]) -> Optional[str]:
        """중복이면 'phone' | 'biz' | 'batch', 아니면 None."""
        key = (row["source_kind"], row["external_id"])
        phone = row.get("phone_e164") or ""
        biz = row.get("business_number") or ""

        if key in self.batch_keys:
            return "batch"

        owner_p = self.phone_owner.get(phone) if phone else None
        if owner_p and owner_p != key:
            return "phone"

        if biz:
            owner_b = self.biz_owner.get(biz)
            if owner_b and owner_b != key:
                return "biz"
        return None

    def register(self, row: Dict[str, Any]) -> None:
        key = (row["source_kind"], row["external_id"])
        phone = row.get("phone_e164") or ""
        biz = row.get("business_number") or ""
        self.batch_keys.add(key)
        if phone:
            self.phone_owner[phone] = key
        if biz:
            self.biz_owner[biz] = key


def load_dotenv_files() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for p in (ROOT / ".env", ROOT / "apps" / "api" / ".env", ROOT / "packages" / "db" / ".env"):
        if p.exists():
            load_dotenv(p, override=False)


def resolve_database_url() -> str:
    """Supabase pooler URL 의 pgbouncer= 등 psycopg2 미지원 쿼리 제거."""
    from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

    raw = (
        os.environ.get("DIRECT_URL")
        or os.environ.get("DATABASE_URL")
        or ""
    ).strip()
    if not raw:
        return ""
    parsed = urlparse(raw)
    if not parsed.scheme:
        return raw
    drop = {"pgbouncer", "connection_limit", "pool_timeout", "connect_timeout"}
    q = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True) if k.lower() not in drop]
    return urlunparse(parsed._replace(query=urlencode(q)))


def open_text(path: Path):
    last: Optional[Exception] = None
    for enc in ENCODINGS:
        try:
            f = path.open("r", encoding=enc, newline="")
            f.read(2048)
            f.seek(0)
            return f, enc
        except Exception as e:  # noqa: BLE001
            last = e
            try:
                f.close()
            except Exception:
                pass
    raise RuntimeError(f"cannot decode {path.name}: {last}")


def make_external_id(source_kind: str, *parts: object) -> str:
    raw = "|".join(str(p or "").strip() for p in parts if str(p or "").strip())
    if not raw:
        raw = source_kind
    if len(raw) <= 72:
        return raw[:80]
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]
    return f"{raw[:55]}_{digest}"


def pick_from_row(row: Dict[str, Any], keys: Tuple[str, ...]) -> str:
    for key in keys:
        if key in row and str(row.get(key) or "").strip():
            return str(row.get(key) or "").strip()
    return ""


def is_usable_phone_raw(raw: object) -> bool:
    s = str(raw or "").strip()
    if not s or s.lower() in {"null", "none", "nan", "-"}:
        return False
    if "개인정보" in s or "비공개" in s:
        return False
    return True


def pick_phone_from_row(row: Dict[str, Any]) -> str:
    """행에서 전화 후보 컬럼을 찾아 첫 유효 값 반환. 없으면 빈 문자열."""
    hit = pick_from_row(row, PHONE_HEADER_KEYS)
    if hit and is_usable_phone_raw(hit):
        # 신고기관 대표연락처보다 사업자 전화번호 우선 (키 목록 순서)
        return hit
    for key, val in row.items():
        lk = str(key or "")
        if "신고기관" in lk:
            continue
        if any(tok in lk.lower() for tok in ("전화", "tel", "phone", "연락")):
            s = str(val or "").strip()
            if is_usable_phone_raw(s):
                return s
    return ""


def is_open_local_business(row: Dict[str, Any]) -> bool:
    """지방인허가 개방데이터 — 폐업/취소 제외."""
    status = str(row.get("영업상태명") or "")
    detail = str(row.get("상세영업상태명") or "")
    if not status and not detail:
        return True
    blob = f"{status} {detail}"
    if any(tok in blob for tok in ("폐업", "취소", "말소", "정지")):
        return False
    return "영업" in blob or "정상" in blob


def pick_name_from_row(row: Dict[str, Any]) -> str:
    hit = pick_from_row(row, NAME_HEADER_KEYS)
    if hit:
        return hit
    for key, val in row.items():
        lk = str(key or "")
        if any(tok in lk for tok in ("상호", "업체", "사업장", "가게", "점포", "법인")):
            s = str(val or "").strip()
            if s:
                return s
    return ""


def pick_biz_from_row(row: Dict[str, Any]) -> str:
    hit = pick_from_row(row, BIZ_HEADER_KEYS)
    if hit:
        return hit
    for key, val in row.items():
        lk = str(key or "")
        if "사업자" in lk:
            s = str(val or "").strip()
            if s:
                return s
    return ""


def row_dict(
    *,
    source_kind: str,
    external_id: str,
    display_name: str,
    phone_raw: object = "",
    business_number: object = "",
    category: str = "",
    address: str = "",
    region: str = "",
    latitude: Any = None,
    longitude: Any = None,
    source_file: str = "",
    meta: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    공통 행 정규화. 전화 필수 — None/빈값/정규화 실패 시 None.
    """
    name = safe_str(display_name, 240)
    if not name:
        return None
    if phone_raw is None or str(phone_raw).strip() in ("", "None", "null", "nan", "-"):
        return None
    phone_digits = normalize_phone_digits(phone_raw)
    phone_e164 = to_e164_kr(phone_raw) if phone_digits else ""
    if not phone_e164:
        return None
    lat = None
    lng = None
    try:
        if latitude not in (None, "") and str(latitude).lower() != "nan":
            lat = float(latitude)
        if longitude not in (None, "") and str(longitude).lower() != "nan":
            lng = float(longitude)
    except (TypeError, ValueError):
        lat = lng = None
    return {
        "source_kind": source_kind,
        "external_id": external_id[:80],
        "display_name": name,
        "name_norm": normalize_name(name) or normalize_name(external_id) or "x",
        "phone_e164": phone_e164[:24],
        "phone_digits": phone_digits[:24],
        "business_number": normalize_business_number(business_number)[:16],
        "category": safe_str(category, 120),
        "address": safe_str(address, 400),
        "region": safe_str(region, 40),
        "latitude": lat,
        "longitude": lng,
        "source_file": safe_str(source_file, 255),
        "meta_json": json.dumps(meta or {}, ensure_ascii=False),
    }


def emit_or_skip(
    stats: FilterStats,
    *,
    source_kind: str,
    external_id: str,
    display_name: str,
    phone_raw: object,
    **kwargs: Any,
) -> Optional[Dict[str, Any]]:
    """무전화/무상호 → 스킵 카운트 후 None. 통과 시 row_dict."""
    stats.rows_read += 1
    if not safe_str(display_name):
        stats.skipped_no_name += 1
        return None
    if not is_usable_phone_raw(phone_raw) or not to_e164_kr(phone_raw):
        stats.skipped_no_phone += 1
        return None
    out = row_dict(
        source_kind=source_kind,
        external_id=external_id,
        display_name=display_name,
        phone_raw=phone_raw,
        **kwargs,
    )
    if not out:
        stats.skipped_no_phone += 1
        return None
    return out


def parse_local_open_data(
    path: Path,
    source_kind: str,
    default_category: str,
) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    """지방인허가 개방데이터(병원·식품 등) — 영업중 + 전화 있는 행만."""
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc} kind={source_kind}")
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for row in rows:
            if not is_open_local_business(row):
                stats.rows_read += 1
                stats.skipped_closed += 1
                continue
            name = row.get("사업장명") or pick_name_from_row(row)
            mgmt = row.get("관리번호") or ""
            phone_raw = pick_phone_from_row(row)
            category = (
                row.get("의료기관종별명")
                or row.get("업태구분명")
                or row.get("위생업태명")
                or default_category
            )
            out = emit_or_skip(
                stats,
                source_kind=source_kind,
                external_id=make_external_id(source_kind, mgmt or name),
                display_name=name,
                phone_raw=phone_raw,
                category=str(category or default_category),
                address=row.get("도로명주소") or row.get("지번주소") or "",
                region="",
                source_file=path.name,
                meta={"status": row.get("영업상태명") or ""},
            )
            if out:
                yield out

    return gen(), stats


def parse_health_center(path: Path) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc}")
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for row in rows:
            name = row.get("보건기관명") or ""
            phone_raw = row.get("대표 전화번호") or pick_phone_from_row(row)
            out = emit_or_skip(
                stats,
                source_kind="health_center",
                external_id=make_external_id(
                    "health",
                    row.get("시도") or "",
                    row.get("시군구") or "",
                    name,
                ),
                display_name=name,
                phone_raw=phone_raw,
                category=row.get("기관유형") or "보건기관",
                address=row.get("주소") or "",
                region=row.get("시도") or "",
                source_file=path.name,
                meta={"parent": row.get("상위기관명") or ""},
            )
            if out:
                yield out

    return gen(), stats


def parse_nadeul(path: Path) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc}")
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for i, row in enumerate(rows):
            name = row.get("점포명") or pick_name_from_row(row)
            phone_raw = row.get("점포연락처") or pick_phone_from_row(row)
            addr = row.get("점포 주소") or row.get("점포주소") or ""
            out = emit_or_skip(
                stats,
                source_kind="nadeul",
                external_id=make_external_id("nadeul", name, addr or i),
                display_name=name,
                phone_raw=phone_raw,
                category="나들가게",
                address=addr,
                region="",
                source_file=path.name,
            )
            if out:
                yield out

    return gen(), stats


def parse_ftc_seller(
    path: Path,
    source_kind: str,
    default_category: str,
    id_key: str,
) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    """공정위 통신판매/전화권유 사업자 CSV."""
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc} kind={source_kind}")
    region_hint = ""
    for token in (
        "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
        "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
    ):
        if token in path.name:
            region_hint = token
            break
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for row in rows:
            status = str(row.get("업소상태") or "")
            if status and ("폐업" in status or "휴업" in status):
                stats.rows_read += 1
                stats.skipped_closed += 1
                continue
            name = row.get("상호") or pick_name_from_row(row)
            phone_raw = row.get("전화번호") or pick_phone_from_row(row)
            biz = row.get("사업자등록번호") or ""
            ext = row.get(id_key) or biz or name
            out = emit_or_skip(
                stats,
                source_kind=source_kind,
                external_id=make_external_id(source_kind, ext),
                display_name=name,
                phone_raw=phone_raw,
                business_number=biz,
                category=default_category,
                address=row.get("사업장소재지(도로명)") or row.get("사업장소재지") or "",
                region=row.get("신고기관명") or region_hint,
                source_file=path.name,
                meta={"status": status},
            )
            if out:
                yield out

    return gen(), stats


def iter_csv_dicts(path: Path) -> Tuple[Iterator[Dict[str, str]], str]:
    f, enc = open_text(path)

    def gen() -> Iterator[Dict[str, str]]:
        with f:
            reader = csv.DictReader(f)
            for row in reader:
                yield {str(k or "").strip(): (v if v is not None else "") for k, v in row.items()}

    return gen(), enc


def parse_school(path: Path) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc}")
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for row in rows:
            name = row.get("학교명") or ""
            code = row.get("행정표준코드") or name
            phone_raw = pick_phone_from_row(row) or (row.get("전화번호") or "")
            out = emit_or_skip(
                stats,
                source_kind="school",
                external_id=make_external_id("school", code),
                display_name=name,
                phone_raw=phone_raw,
                category=row.get("학교종류명") or "학교",
                address=" ".join(
                    x for x in [row.get("도로명주소") or "", row.get("도로명상세주소") or ""] if x
                ).strip(),
                region=row.get("시도명") or row.get("시도교육청명") or "",
                source_file=path.name,
                meta={"homepage": row.get("홈페이지주소") or ""},
            )
            if out:
                yield out

    return gen(), stats


def parse_post_office(path: Path) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc}")
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for row in rows:
            name = row.get("관내우체국명") or ""
            code = row.get("우체국구분코드") or name
            phone_raw = pick_phone_from_row(row) or (row.get("우체국전화번호") or "")
            out = emit_or_skip(
                stats,
                source_kind="post_office",
                external_id=make_external_id("post", code, name),
                display_name=name,
                phone_raw=phone_raw,
                category="우체국",
                address=row.get("우체국주소") or "",
                region=row.get("지방청명") or "",
                source_file=path.name,
                meta={"parent": row.get("총괄국명") or ""},
            )
            if out:
                yield out

    return gen(), stats


def parse_police(path: Path) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    """경찰 원본에 전화 없음 → 전부 skipped_no_phone."""
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc}")
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for row in rows:
            station = row.get("관서명") or ""
            police = row.get("경찰서") or ""
            name = f"{police} {station}".strip() if police else station
            if station and police and not name.endswith(("지구대", "파출소", "치안센터")):
                kind = row.get("구분") or ""
                if kind:
                    name = f"{name} {kind}".strip()
            seq = row.get("연번") or name
            phone_raw = pick_phone_from_row(row)
            out = emit_or_skip(
                stats,
                source_kind="police",
                external_id=make_external_id("police", seq, name),
                display_name=name or station,
                phone_raw=phone_raw,
                category=row.get("구분") or "경찰",
                address=row.get("주소") or "",
                region=row.get("시도청") or "",
                source_file=path.name,
                meta={"police_office": police},
            )
            if out:
                yield out

    return gen(), stats


def parse_public_agency_xlsx(path: Path) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    import openpyxl

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    it = ws.iter_rows(values_only=True)
    header = [str(c or "").strip() for c in next(it)]
    idx = {h: i for i, h in enumerate(header)}
    stats = FilterStats()

    def cell(row: Tuple[Any, ...], key: str) -> Any:
        i = idx.get(key)
        return row[i] if i is not None and i < len(row) else ""

    def gen() -> Iterator[Dict[str, Any]]:
        for row in it:
            if not row:
                continue
            org = cell(row, "기관명")
            dept = cell(row, "부서명")
            name = safe_str(dept) or safe_str(org)
            seq = cell(row, "순번")
            phone_raw = cell(row, "전화번호")
            out = emit_or_skip(
                stats,
                source_kind="public_agency",
                external_id=make_external_id("agency", seq, org, dept),
                display_name=name,
                phone_raw=phone_raw,
                category="공공기관",
                address=cell(row, "주소") or "",
                region="",
                source_file=path.name,
                meta={"org": safe_str(org), "dept": safe_str(dept)},
            )
            if out:
                yield out

    return gen(), stats


def parse_commerce(path: Path) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    """상권 CSV — 유효 전화만. 202606 공개본은 전화 컬럼 없어 전부 스킵."""
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc}")
    region_hint = ""
    for token in (
        "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
        "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
    ):
        if token in path.name:
            region_hint = token
            break
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for row in rows:
            name = row.get("상호명") or ""
            branch = row.get("지점명") or ""
            display = f"{name} {branch}".strip() if branch else name
            store_id = row.get("상가업소번호") or display
            phone_raw = pick_phone_from_row(row)
            out = emit_or_skip(
                stats,
                source_kind="commerce",
                external_id=make_external_id("commerce", store_id),
                display_name=display,
                phone_raw=phone_raw,
                business_number=row.get("사업자등록번호") or row.get("사업자번호") or "",
                category=row.get("상권업종소분류명") or row.get("상권업종중분류명") or "상가",
                address=row.get("도로명주소") or row.get("지번주소") or "",
                region=row.get("시도명") or region_hint,
                latitude=row.get("위도"),
                longitude=row.get("경도"),
                source_file=path.name,
                meta={
                    "industry_l": row.get("상권업종대분류명") or "",
                    "industry_m": row.get("상권업종중분류명") or "",
                },
            )
            if out:
                yield out

    return gen(), stats


def parse_generic_trade(
    path: Path,
    source_kind: str,
    default_category: str,
) -> Tuple[Iterator[Dict[str, Any]], FilterStats]:
    """나들가게·통신판매업 등 — 헤더에서 상호/전화/사업자번호 자동 탐지."""
    rows, enc = iter_csv_dicts(path)
    print(f"  encoding={enc} kind={source_kind}")
    stats = FilterStats()

    def gen() -> Iterator[Dict[str, Any]]:
        for i, row in enumerate(rows):
            name = pick_name_from_row(row)
            phone_raw = pick_phone_from_row(row)
            biz = pick_biz_from_row(row)
            ext = (
                row.get("일련번호")
                or row.get("연번")
                or row.get("신고번호")
                or row.get("인허가번호")
                or biz
                or f"{name}|{phone_raw}|{i}"
            )
            address = (
                row.get("도로명주소")
                or row.get("주소")
                or row.get("소재지")
                or row.get("사업장주소")
                or ""
            )
            region = row.get("시도명") or row.get("시도") or row.get("광역시도") or ""
            out = emit_or_skip(
                stats,
                source_kind=source_kind,
                external_id=make_external_id(source_kind, ext),
                display_name=name,
                phone_raw=phone_raw,
                business_number=biz,
                category=default_category,
                address=address,
                region=region,
                source_file=path.name,
                meta={"headers_sample": list(row.keys())[:12]},
            )
            if out:
                yield out

    return gen(), stats


ParserFn = Callable[[Path], Tuple[Iterator[Dict[str, Any]], FilterStats]]


def discover_jobs(
    kinds: Optional[set[str]],
    skip_commerce: bool,
    exclude_kinds: Optional[set[str]] = None,
) -> List[Tuple[str, Path, ParserFn]]:
    exclude = exclude_kinds or set()
    jobs: List[Tuple[str, Path, ParserFn]] = []

    def want(kind: str) -> bool:
        if kind in exclude:
            return False
        return (not kinds) or (kind in kinds)

    for path in sorted(DATA_DIR.iterdir()):
        name = path.name
        suf = path.suffix.lower()
        if suf not in {".csv", ".xlsx", ".xls"}:
            continue
        if "국외" in name:
            continue
        if "우수프랜차이즈" in name:
            # 전화 컬럼 없음
            continue
        if "학교기본정보" in name and want("school"):
            jobs.append(("school", path, parse_school))
        elif "우체국" in name and want("post_office"):
            jobs.append(("post_office", path, parse_post_office))
        elif "경찰청" in name and want("police") and kinds and "police" in kinds:
            jobs.append(("police", path, parse_police))
        elif "공공기관" in name and suf in {".xlsx", ".xls"} and want("public_agency"):
            jobs.append(("public_agency", path, parse_public_agency_xlsx))
        elif "나들가게" in name and want("nadeul"):
            jobs.append(("nadeul", path, parse_nadeul))
        elif "전화권유판매" in name and want("telesales"):
            jobs.append(
                (
                    "telesales",
                    path,
                    lambda p: parse_ftc_seller(p, "telesales", "전화권유판매", "전화판매번호"),
                )
            )
        elif "통신판매" in name and want("mailorder"):
            jobs.append(
                (
                    "mailorder",
                    path,
                    lambda p: parse_ftc_seller(p, "mailorder", "통신판매업", "통신판매번호"),
                )
            )
        elif ("지역보건" in name or "보건의료기관" in name) and want("health_center"):
            jobs.append(("health_center", path, parse_health_center))
        elif name.startswith("건강_병원") and want("hospital"):
            jobs.append(
                ("hospital", path, lambda p: parse_local_open_data(p, "hospital", "병원"))
            )
        elif name.startswith("식품_") and want("food"):
            jobs.append(
                ("food", path, lambda p: parse_local_open_data(p, "food", "식품"))
            )
        elif (
            (("상가" in name and "상권" in name) or ("소상공인" in name and "상가" in name))
            and "나들" not in name
            and not skip_commerce
            and want("commerce")
        ):
            jobs.append(("commerce", path, parse_commerce))
    return jobs


UPSERT_SQL = """
INSERT INTO public_directory_entries (
  source_kind, external_id, display_name, name_norm,
  phone_e164, phone_digits, business_number, category, address, region,
  latitude, longitude, source_file, meta_json, updated_at, created_at
) VALUES (
  %(source_kind)s, %(external_id)s, %(display_name)s, %(name_norm)s,
  %(phone_e164)s, %(phone_digits)s, %(business_number)s, %(category)s, %(address)s, %(region)s,
  %(latitude)s, %(longitude)s, %(source_file)s, %(meta_json)s::jsonb, NOW(), NOW()
)
ON CONFLICT (source_kind, external_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  name_norm = EXCLUDED.name_norm,
  phone_e164 = EXCLUDED.phone_e164,
  phone_digits = EXCLUDED.phone_digits,
  business_number = EXCLUDED.business_number,
  category = EXCLUDED.category,
  address = EXCLUDED.address,
  region = EXCLUDED.region,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  source_file = EXCLUDED.source_file,
  meta_json = EXCLUDED.meta_json,
  updated_at = NOW()
"""


def filter_duplicates(
    rows: Iterable[Dict[str, Any]],
    dedup: BatchDedup,
    stats: FilterStats,
) -> Iterator[Dict[str, Any]]:
    for row in rows:
        reason = dedup.classify(row)
        if reason == "phone":
            stats.skipped_duplicate += 1
            stats.detail_dup_phone += 1
            continue
        if reason == "biz":
            stats.skipped_duplicate += 1
            stats.detail_dup_biz += 1
            continue
        if reason == "batch":
            stats.skipped_duplicate += 1
            stats.detail_dup_batch += 1
            continue
        dedup.register(row)
        yield row


def upsert_batches(conn, rows: Iterable[Dict[str, Any]], batch_size: int = 1000) -> int:
    import psycopg2.extras

    buf: List[Dict[str, Any]] = []
    total = 0
    with conn.cursor() as cur:
        for row in rows:
            if not row:
                continue
            buf.append(row)
            if len(buf) >= batch_size:
                psycopg2.extras.execute_batch(cur, UPSERT_SQL, buf, page_size=batch_size)
                conn.commit()
                total += len(buf)
                print(f"    upserted {total}", flush=True)
                buf.clear()
        if buf:
            psycopg2.extras.execute_batch(cur, UPSERT_SQL, buf, page_size=batch_size)
            conn.commit()
            total += len(buf)
    return total


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest public directory files into Supabase")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--skip-commerce",
        action="store_true",
        default=True,
        help="skip large 상권 CSVs (default: on — no phone in source)",
    )
    parser.add_argument(
        "--include-commerce",
        action="store_true",
        help="force include 상권 (phone-less rows still skipped)",
    )
    parser.add_argument(
        "--kinds",
        type=str,
        default="",
        help="comma: school,post_office,public_agency,nadeul,mailorder,telesales,hospital,food,health_center",
    )
    parser.add_argument(
        "--exclude-kinds",
        type=str,
        default="",
        help="comma kinds to skip (e.g. already ingested: school,post_office,public_agency)",
    )
    parser.add_argument("--limit-files", type=int, default=0)
    parser.add_argument("--limit-rows", type=int, default=0, help="per file row cap (debug)")
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument(
        "--purge-phoneless",
        action="store_true",
        help="DELETE rows with empty phone_e164",
    )
    parser.add_argument(
        "--no-dedupe",
        action="store_true",
        help="disable cross phone/biz duplicate skip (still upserts on source_kind+external_id)",
    )
    args = parser.parse_args()
    skip_commerce = False if args.include_commerce else True

    load_dotenv_files()
    dsn = resolve_database_url()

    if args.purge_phoneless:
        if not dsn:
            print("DATABASE_URL required for --purge-phoneless")
            return 1
        import psycopg2

        with psycopg2.connect(dsn) as purge_conn:
            with purge_conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM public_directory_entries WHERE coalesce(phone_e164, '') = ''"
                )
                deleted = cur.rowcount
            purge_conn.commit()
        print(f"Purged phoneless rows: {deleted}")

    kinds = {k.strip() for k in args.kinds.split(",") if k.strip()} or None
    exclude_kinds = {k.strip() for k in args.exclude_kinds.split(",") if k.strip()} or None
    jobs = discover_jobs(kinds, skip_commerce=skip_commerce, exclude_kinds=exclude_kinds)
    if args.limit_files > 0:
        jobs = jobs[: args.limit_files]

    if not jobs:
        if args.purge_phoneless:
            return 0
        print("No matching files under data/")
        return 1

    print(f"Found {len(jobs)} file(s)")
    for kind, path, _ in jobs:
        print(f" - [{kind}] {path.name} ({path.stat().st_size // 1024} KB)")

    conn = None
    dedup = BatchDedup()
    if not args.dry_run:
        if not dsn:
            print("DATABASE_URL (or DIRECT_URL) required")
            return 1
        import psycopg2

        print(f"Connecting… host={dsn.split('@')[-1].split('/')[0] if '@' in dsn else '(local)'}")
        conn = psycopg2.connect(dsn)
        conn.autocommit = False
        if not args.no_dedupe:
            loaded = dedup.load_from_db(conn)
            print(f"Dedup index loaded from DB: {loaded} phone rows")

    grand = FilterStats()
    for kind, path, parser_fn in jobs:
        print(f"\n==> {kind}: {path.name}")
        row_iter, file_stats = parser_fn(path)
        produced = 0

        def capped() -> Iterator[Dict[str, Any]]:
            nonlocal produced
            for row in row_iter:
                if args.limit_rows and produced >= args.limit_rows:
                    break
                produced += 1
                yield row

        if args.dry_run:
            local_dedup = BatchDedup()
            kept: List[Dict[str, Any]] = []
            for row in filter_duplicates(capped(), local_dedup, file_stats):
                if len(kept) < 3:
                    kept.append(row)
                file_stats.upserted += 1
            print(f"  {file_stats.summary_line('dry-run ')}")
            if kept:
                print(f"  sample={json.dumps(kept, ensure_ascii=False)[:500]}")
            grand.merge(file_stats)
            continue

        assert conn is not None
        to_write = (
            capped()
            if args.no_dedupe
            else filter_duplicates(capped(), dedup, file_stats)
        )
        n = upsert_batches(conn, to_write, batch_size=args.batch_size)
        file_stats.upserted = n
        print(f"  {file_stats.summary_line()}")
        grand.merge(file_stats)

    if conn is not None:
        conn.close()

    print("\n======== INGEST SUMMARY ========")
    print(f"전체 행(읽음):           {grand.rows_read}")
    print(f"전화번호 누락 제외:       {grand.skipped_no_phone}")
    print(f"폐업/휴업 제외:           {grand.skipped_closed}")
    print(f"중복 제외:               {grand.skipped_duplicate}")
    print(f"  - 전화 중복:           {grand.detail_dup_phone}")
    print(f"  - 사업자번호 중복:     {grand.detail_dup_biz}")
    print(f"  - 배치 내 동일키:      {grand.detail_dup_batch}")
    print(f"정상 적재(upsert):       {grand.upserted}")
    print("================================")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
