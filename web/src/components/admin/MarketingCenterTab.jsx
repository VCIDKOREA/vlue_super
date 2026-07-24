import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMarketingPopup, fetchMarketingPopups } from "../../lib/adminV1Api.js";
import AdminPhonePreview from "./AdminPhonePreview.jsx";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";

function toLocalInputValue(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function defaultRange() {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { startsAt: toLocalInputValue(start.toISOString()), endsAt: toLocalInputValue(end.toISOString()) };
}

export default function MarketingCenterTab({ onToast }) {
  const defaults = useMemo(() => defaultRange(), []);
  const [title, setTitle] = useState("VLUE 스마트 오피스");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState("external");
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState([]);
  const fileRef = useRef(null);

  const previewPopup = useMemo(
    () => ({
      id: "preview",
      title,
      imageUrl: imageDataUrl,
      linkUrl,
      linkType
    }),
    [title, imageDataUrl, linkUrl, linkType]
  );

  const loadRecent = useCallback(async () => {
    try {
      const data = await fetchMarketingPopups();
      setRecent(data.popups || []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const onPickImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      onToast?.("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    try {
      const uploaded = await compressAndUploadMediaImageOrThrow(f, "marketing");
      setImageDataUrl(uploaded.url);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "이미지를 처리하지 못했습니다.");
    }
    e.target.value = "";
  };

  const submit = async () => {
    if (!imageDataUrl) {
      onToast?.("광고 이미지를 업로드해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const data = await createMarketingPopup({
        title,
        imageUrl: imageDataUrl,
        imageDataUrl,
        linkUrl,
        linkType,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString()
      });
      onToast?.(`마케팅 팝업 배포 완료 · ID ${data.popup?.id?.slice(0, 8) || ""}`);
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
          <p className="text-[14px] font-black text-slate-900">마케팅 센터 · 전면 팝업</p>
          <p className="mt-1 text-[11px] text-slate-500">홈 진입 시 활성 기간 내 팝업이 전면 노출됩니다.</p>

          <label className="mt-3 block text-[11px] font-bold text-slate-600">
            캠페인 제목
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            />
          </label>

          <div className="mt-3">
            <p className="text-[11px] font-bold text-slate-600">광고 이미지</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-1 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 text-[12px] font-bold text-blue-700"
            >
              {imageDataUrl ? "이미지 변경" : "이미지 업로드"}
            </button>
          </div>

          <label className="mt-3 block text-[11px] font-bold text-slate-600">
            연결 URL
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://… 또는 subhub, wallet 등 내부 경로"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            />
          </label>

          <div className="mt-2 flex gap-2">
            {[
              { id: "external", label: "외부 링크" },
              { id: "internal", label: "앱 내부" }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLinkType(opt.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                  linkType === opt.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] font-bold text-slate-600">
              노출 시작
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[12px]"
              />
            </label>
            <label className="block text-[11px] font-bold text-slate-600">
              노출 종료
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[12px]"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white disabled:opacity-50"
          >
            {busy ? "배포 중…" : "팝업 배포 · 즉시 반영"}
          </button>
        </div>

        {recent.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[12px] font-black text-slate-800">최근 캠페인</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-slate-600">
              {recent.map((p) => (
                <li key={p.id} className="truncate rounded-lg bg-slate-50 px-2 py-1.5">
                  {p.title} · {new Date(p.startsAt).toLocaleDateString("ko-KR")} ~{" "}
                  {new Date(p.endsAt).toLocaleDateString("ko-KR")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <AdminPhonePreview label="홈 전면 팝업 미리보기">
        <div className="relative min-h-[380px] bg-slate-100">
          <div className="p-3">
            <div className="h-3 w-20 rounded bg-slate-300" />
            <div className="mt-4 h-24 rounded-xl bg-white shadow-sm" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-3">
            <div className="w-full overflow-hidden rounded-xl bg-white shadow-lg">
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="" className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center bg-slate-200 text-[11px] text-slate-500">
                  이미지 업로드
                </div>
              )}
              <div className="p-2">
                <p className="truncate text-[11px] font-black">{title || "제목"}</p>
                {linkUrl ? <p className="mt-1 text-[10px] font-bold text-blue-600">자세히 보기</p> : null}
              </div>
            </div>
          </div>
        </div>
      </AdminPhonePreview>
    </div>
  );
}
