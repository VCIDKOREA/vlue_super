import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminNotices, releaseNotice } from "../../lib/adminV1Api.js";
import AdminPhonePreview from "./AdminPhonePreview.jsx";

export default function ContentCenterTab({ onToast }) {
  const [title, setTitle] = useState("");
  const [highlightText, setHighlightText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState([]);

  const previewNotice = useMemo(
    () => ({
      title: title || "업데이트 제목",
      highlightText,
      bodyText: bodyText || "상세 내용을 입력하세요."
    }),
    [title, highlightText, bodyText]
  );

  const loadRecent = useCallback(async () => {
    try {
      const data = await fetchAdminNotices();
      setRecent(data.notices || []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const submit = async () => {
    if (!title.trim() || !bodyText.trim()) {
      onToast?.("제목과 상세 내용을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const data = await releaseNotice({ title, highlightText, bodyText });
      onToast?.(
        `실시간 배포 완료 · SSE ${data.deliveredConnections ?? 0}연결 · ${data.notice?.title || title}`
      );
      setTitle("");
      setHighlightText("");
      setBodyText("");
      loadRecent();
    } catch (e) {
      onToast?.(e?.message || "배포 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[14px] font-black text-slate-900">콘텐츠 센터 · 업데이트 공지</p>
          <p className="mt-1 text-[11px] text-slate-500">
            [실시간 배포] 시 DB 저장 + 접속 중 전체 유저에게 SSE 토스트가 즉시 발송됩니다.
          </p>

          <label className="mt-3 block text-[11px] font-bold text-slate-600">
            공지 제목
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: VLUE 6.0 스마트 오피스 업데이트"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            />
          </label>

          <label className="mt-3 block text-[11px] font-bold text-slate-600">
            강조 문구
            <input
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="예: 이메일함 · 마케팅 팝업이 추가되었습니다"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            />
          </label>

          <label className="mt-3 block text-[11px] font-bold text-slate-600">
            상세 내용
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={8}
              placeholder="업데이트 항목을 줄바꿈으로 작성하세요."
              className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-[13px] leading-relaxed"
            />
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-[13px] font-black text-white disabled:opacity-50"
          >
            {busy ? "배포 중…" : "실시간 배포"}
          </button>
        </div>

        {recent.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[12px] font-black text-slate-800">최근 배포</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-slate-600">
              {recent.map((n) => (
                <li key={n.id} className="rounded-lg bg-slate-50 px-2 py-1.5">
                  <span className="font-bold text-slate-800">{n.title}</span>
                  <span className="text-slate-400"> · {new Date(n.publishedAt).toLocaleString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <AdminPhonePreview label="공지 토스트 · 상세 미리보기">
        <div className="min-h-[380px] bg-slate-50 p-2">
          <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 shadow-sm">
            <p className="text-[11px] font-black text-blue-700">📢 새로운 시스템 업데이트가 배포되었습니다!</p>
            <p className="text-[9px] text-slate-400">탭하여 공지 내용 보기</p>
          </div>
          <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="text-[9px] font-bold text-blue-600">시스템 업데이트</p>
            <p className="mt-0.5 text-[12px] font-black text-slate-900">{previewNotice.title}</p>
            {previewNotice.highlightText ? (
              <p className="mt-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800">
                {previewNotice.highlightText}
              </p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-600">{previewNotice.bodyText}</p>
          </div>
        </div>
      </AdminPhonePreview>
    </div>
  );
}
