"""KR phone / name / biz-no normalization for public directory ingest."""
from __future__ import annotations

import re
from typing import Optional

_NON_ALNUM = re.compile(r"[^\w가-힣]+", re.UNICODE)


def digits_only(raw: object) -> str:
    return re.sub(r"\D", "", str(raw or ""))


def normalize_business_number(raw: object) -> str:
    d = digits_only(raw)
    return d if len(d) == 10 else ""


def normalize_name(raw: object) -> str:
    s = str(raw or "").strip().lower()
    s = _NON_ALNUM.sub("", s)
    return s[:240]


def normalize_phone_digits(raw: object) -> str:
    """국내 표기 숫자만 (0 포함). 잘못된 값은 빈 문자열."""
    d = digits_only(raw)
    if not d:
        return ""
    if d.startswith("82") and len(d) >= 10:
        rest = d[2:]
        if not rest.startswith("0"):
            rest = "0" + rest
        d = rest
    # 대표번호 1xxx-xxxx (8자리)
    if re.fullmatch(r"1[3-9]\d{6}", d):
        return d
    if d.startswith("0") and 9 <= len(d) <= 11:
        return d
    if 9 <= len(d) <= 11 and not d.startswith("0"):
        return "0" + d
    if 8 <= len(d) <= 12:
        return d
    return ""


def to_e164_kr(raw: object) -> str:
    d = normalize_phone_digits(raw)
    if not d:
        return ""
    if d.startswith("0"):
        return "+82" + d[1:]
    if re.fullmatch(r"1[3-9]\d{6}", d):
        return "+82" + d
    return "+82" + d if not d.startswith("82") else "+" + d


def safe_str(raw: object, max_len: int = 400) -> str:
    s = str(raw or "").strip()
    if s.lower() in {"nan", "none", "null", "미운영", "-"}:
        return ""
    return s[:max_len]
