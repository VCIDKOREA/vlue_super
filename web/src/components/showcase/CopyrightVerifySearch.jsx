import { useCallback, useEffect, useState } from "react";
import { Loader2, Music2, Search, Upload, Sparkles } from "lucide-react";
import { verifyCopyrightRegistration } from "../../lib/showcase/showcaseSoundApi.js";

/**
 * 한국저작권위원회 등록정보 검색 — 참고용 (VLUE 최종 인증 아님)
 */
export default function CopyrightVerifySearch({
  defaultTitle = "",
  defaultAuthor = "",
  onSelect,
  inputCls = ""
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [author, setAuthor] = useState(defaultAuthor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await verifyCopyrightRegistration({ title, author });
      setResult(data);
      if (!data.configured) {
        setError(data.message || "저작권 API 키가 설정되지 않았습니다.");
      } else if (!data.ok) {
        setError(data.message || "검색에 실패했습니다.");
      }
    } catch (e) {
      setError(e?.message || "검색 오류");
    } finally {
      setBusy(false);
    }
  }, [title, author]);

  return (
    <div className="showcase-sound-copyright">
      <p className="showcase-sound-copyright__hint">
        저작권 등록정보 검색은 <strong>참고용</strong>입니다. VLUE가 저작권을 최종 인증하지 않습니다.
      </p>
      <div className="showcase-sound-copyright__row">
        <input
          className={inputCls}
          placeholder="저작물명"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="저작자명"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <button type="button" className="showcase-sound-btn" disabled={busy} onClick={run}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          검색
        </button>
      </div>
      {error ? <p className="showcase-sound-copyright__err">{error}</p> : null}
      {result?.ok ? (
        <div className="showcase-sound-copyright__list">
          <p className="text-[11px] text-slate-500">
            {result.registeredFound
              ? `등록 정보 ${result.totalCount}건 (참고)`
              : "일치하는 등록 정보가 없습니다. 미등록이어도 권리 보유 시 등록할 수 있습니다."}
          </p>
          {(result.items || []).map((item) => (
            <button
              key={`${item.registrationNo}-${item.title}`}
              type="button"
              className="showcase-sound-copyright__item"
              onClick={() => onSelect?.(item)}
            >
              <span className="font-bold">{item.title || "(제목 없음)"}</span>
              <span className="text-[11px] text-slate-500">
                {item.author || "—"} · {item.registrationNo || "등록번호 없음"} · {item.registeredAt || ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
