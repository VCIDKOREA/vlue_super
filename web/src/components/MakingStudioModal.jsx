import { useCallback, useEffect, useState } from "react";

const MAKING_STORAGE_KEY = "vlue_making_assets_v1";

const MAKING_TEMPLATES = {
  coupon: [
    { id: "coupon-1", name: "클린 블루", tone: "from-blue-600 to-indigo-700" },
    { id: "coupon-2", name: "바이올렛", tone: "from-violet-600 to-fuchsia-600" },
    { id: "coupon-3", name: "에메랄드", tone: "from-emerald-600 to-teal-700" }
  ],
  promo: [
    { id: "promo-1", name: "미드나잇", tone: "from-slate-800 to-slate-950" },
    { id: "promo-2", name: "블루", tone: "from-sky-500 to-blue-700" },
    { id: "promo-3", name: "선셋", tone: "from-orange-500 to-rose-600" }
  ]
};

const MAKING_FONT_OPTIONS = [
  { id: "sans", label: "고딕", className: "font-sans" },
  { id: "serif", label: "명조", className: "font-serif" },
  { id: "mono", label: "모노", className: "font-mono" }
];

function safeRandomToken(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const size = Math.max(6, Number(length) || 10);
  try {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < size; i += 1) out += alphabet[bytes[i] % alphabet.length];
    return out;
  } catch {
    return `VL${Math.random().toString(36).slice(2, 2 + size).toUpperCase()}`;
  }
}

function fieldClass() {
  return "w-full rounded-xl border-0 bg-white px-4 py-3 text-[14px] text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400";
}

export default function MakingStudioModal({
  open,
  onClose,
  makingSendTargets = { all: [], subscribe: [], friends: [] },
  onSendMakingAsset
}) {
  const [studioTab, setStudioTab] = useState("create");
  const [makingType, setMakingType] = useState("coupon");
  const [makingTitle, setMakingTitle] = useState("");
  const [makingBody, setMakingBody] = useState("");
  const [makingCode, setMakingCode] = useState("");
  const [makingExpiresAt, setMakingExpiresAt] = useState("");
  const [makingCta, setMakingCta] = useState("");
  const [makingFont, setMakingFont] = useState("sans");
  const [makingTemplateId, setMakingTemplateId] = useState("");
  const [makingTemplateCode, setMakingTemplateCode] = useState("");
  const [makingTemplateTone, setMakingTemplateTone] = useState("from-blue-600 to-indigo-700");
  const [makingImageDataUrl, setMakingImageDataUrl] = useState("");
  const [makingFileMeta, setMakingFileMeta] = useState(null);
  const [makingAudience, setMakingAudience] = useState("all");
  const [makingAutoFeedUpload, setMakingAutoFeedUpload] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [makingNotice, setMakingNotice] = useState("");
  const [makingItems, setMakingItems] = useState(() => {
    try {
      const raw = localStorage.getItem(MAKING_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const baseTemplates = makingType === "coupon" ? MAKING_TEMPLATES.coupon : MAKING_TEMPLATES.promo;
  const canSave = Boolean(String(makingTitle || "").trim() && String(makingBody || "").trim());
  const canSend = (makingSendTargets?.all || []).length > 0;
  const fontClass = MAKING_FONT_OPTIONS.find((f) => f.id === makingFont)?.className || "font-sans";
  const isExpired = makingExpiresAt ? Date.now() >= new Date(makingExpiresAt).getTime() : false;

  const showToast = useCallback((msg) => {
    setMakingNotice(msg);
    setTimeout(() => setMakingNotice(""), 2400);
  }, []);

  const applyTemplate = (templateId) => {
    const picked = baseTemplates.find((t) => t.id === templateId);
    if (!picked) return;
    setMakingTemplateId(templateId);
    setMakingTemplateCode(templateId);
    setMakingTemplateTone(picked.tone);
  };

  useEffect(() => {
    if (!open) return;
    setStudioTab("create");
    const pool = makingType === "coupon" ? MAKING_TEMPLATES.coupon : MAKING_TEMPLATES.promo;
    const first = pool[0];
    if (first) {
      setMakingTemplateId(first.id);
      setMakingTemplateCode(first.id);
      setMakingTemplateTone(first.tone);
    }
  }, [makingType, open]);

  useEffect(() => {
    const now = Date.now();
    const filtered = makingItems.filter((it) => {
      if (!it?.expiresAt) return true;
      const t = new Date(it.expiresAt).getTime();
      return !Number.isNaN(t) && t > now;
    });
    if (filtered.length !== makingItems.length) {
      setMakingItems(filtered);
      try {
        localStorage.setItem(MAKING_STORAGE_KEY, JSON.stringify(filtered));
      } catch {
        /* ignore */
      }
    }
  }, [makingItems]);

  const persistItems = (next) => {
    setMakingItems(next);
    try {
      localStorage.setItem(MAKING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const resetForm = () => {
    setMakingTitle("");
    setMakingBody("");
    setMakingCode("");
    setMakingExpiresAt("");
    setMakingCta("");
    setMakingImageDataUrl("");
    setMakingFileMeta(null);
  };

  const saveAsset = () => {
    if (!canSave) return;
    const expiresAtIso = makingExpiresAt ? new Date(makingExpiresAt).toISOString() : "";
    if (expiresAtIso && Number.isNaN(new Date(expiresAtIso).getTime())) {
      showToast("유효기간 형식을 확인해 주세요.");
      return;
    }
    const next = [
      {
        id: `mk-${Date.now()}`,
        type: makingType === "coupon" ? "coupon" : "promo",
        assetName: String(makingTitle || "").trim(),
        masterCode: `TPL-${safeRandomToken(10)}`,
        title: String(makingTitle || "").trim(),
        body: String(makingBody || "").trim(),
        code: String(makingCode || "").trim(),
        cta: String(makingCta || "").trim(),
        fileMeta: makingFileMeta,
        imageDataUrl: makingImageDataUrl || "",
        expiresAt: expiresAtIso || null,
        font: makingFont,
        templateId: makingTemplateId,
        templateCode: makingTemplateCode,
        templateTone: makingTemplateTone,
        createdAt: new Date().toISOString()
      },
      ...makingItems
    ].slice(0, 60);
    persistItems(next);
    resetForm();
    showToast("보관함에 저장했습니다.");
    setStudioTab("archive");
  };

  const onPickFile = (file) => {
    if (!file) return;
    const meta = { name: file.name, type: file.type, size: file.size };
    setMakingFileMeta(meta);
    if (!String(meta.type || "").startsWith("image/")) {
      showToast("이미지가 아닌 파일은 미리보기 없이 저장됩니다.");
      return;
    }
    if (meta.size > 8 * 1024 * 1024) {
      showToast("이미지는 8MB 이하만 가능합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMakingImageDataUrl(String(reader.result || ""));
      showToast("이미지가 연결되었습니다.");
    };
    reader.readAsDataURL(file);
  };

  const sendItem = async (item) => {
    if (!item || !onSendMakingAsset) return;
    if (item.expiresAt && Date.now() >= new Date(item.expiresAt).getTime()) {
      persistItems(makingItems.filter((it) => it.id !== item.id));
      showToast("만료된 항목을 제거했습니다.");
      return;
    }
    const ok = await onSendMakingAsset(item, {
      audience: makingAudience,
      excludeRoomIds: [],
      autoFeedUpload: makingAutoFeedUpload
    });
    showToast(ok ? "채팅 대상에게 발송했습니다." : "발송에 실패했습니다.");
  };

  const archiveCount = makingItems.length;

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[98] box-border flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4"
        onMouseDown={onClose}
      >
        <div
          className="box-border flex max-h-[90vh] w-full min-w-0 max-w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 px-4 pt-5 pb-3 sm:px-5">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-[18px] font-black text-slate-900">상점 이벤트</h4>
                <p className="mt-0.5 text-[12px] text-slate-500">쿠폰·이벤트 홍보 카드 만들기</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-slate-500 ring-1 ring-slate-200"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStudioTab("create")}
                className={`flex-1 rounded-full py-2.5 text-[13px] font-black ${
                  studioTab === "create" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                새로 만들기
              </button>
              <button
                type="button"
                onClick={() => setStudioTab("archive")}
                className={`flex-1 rounded-full py-2.5 text-[13px] font-black ${
                  studioTab === "archive" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                보관함
                {archiveCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
                    {archiveCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 sm:px-5">
            {studioTab === "create" ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMakingType("coupon")}
                    className={`flex-1 rounded-xl py-2.5 text-[13px] font-black ${
                      makingType === "coupon" ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    이벤트 쿠폰
                  </button>
                  <button
                    type="button"
                    onClick={() => setMakingType("promo")}
                    className={`flex-1 rounded-xl py-2.5 text-[13px] font-black ${
                      makingType === "promo" ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    홍보 카드
                  </button>
                </div>

                <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${makingTemplateTone} p-4 shadow-md`}>
                  {makingImageDataUrl ? (
                    <img src={makingImageDataUrl} alt="" className="mb-3 max-h-32 w-full rounded-xl object-cover" />
                  ) : null}
                  <p className={`text-[16px] font-black text-white ${fontClass}`}>
                    {makingTitle || "제목을 입력하세요"}
                  </p>
                  <p className={`mt-1 text-[13px] leading-relaxed text-white/90 ${fontClass}`}>
                    {makingBody || "내용을 입력하세요"}
                  </p>
                  {makingType === "coupon" && makingCode ? (
                    <p className="mt-2 inline-block rounded-lg bg-white/25 px-2.5 py-1 text-[12px] font-black text-white">
                      {makingCode}
                    </p>
                  ) : null}
                  {isExpired ? <p className="mt-2 text-[11px] font-bold text-rose-200">만료됨</p> : null}
                </div>

                <div>
                  <p className="mb-2 text-[12px] font-bold text-slate-500">디자인</p>
                  <div className="flex gap-2">
                    {baseTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t.id)}
                        className={`min-w-0 flex-1 rounded-xl p-2 ring-2 transition ${
                          makingTemplateId === t.id ? "ring-blue-500" : "ring-transparent"
                        }`}
                      >
                        <div className={`rounded-lg bg-gradient-to-r ${t.tone} px-2 py-3`}>
                          <p className="truncate text-[10px] font-black text-white">{t.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <input
                    value={makingTitle}
                    onChange={(e) => setMakingTitle(e.target.value)}
                    placeholder={makingType === "coupon" ? "쿠폰 제목" : "홍보 제목"}
                    className={fieldClass()}
                  />
                  <textarea
                    value={makingBody}
                    onChange={(e) => setMakingBody(e.target.value)}
                    rows={3}
                    placeholder="안내 문구"
                    className={`${fieldClass()} resize-none`}
                  />
                  {makingType === "coupon" ? (
                    <input
                      value={makingCode}
                      onChange={(e) => setMakingCode(e.target.value)}
                      placeholder="쿠폰 코드 (선택)"
                      className={fieldClass()}
                    />
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="w-full text-center text-[12px] font-bold text-slate-400"
                >
                  {showMore ? "추가 옵션 접기" : "추가 옵션 (유효기간·발송·이미지)"}
                </button>

                {showMore ? (
                  <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                    <input
                      type="datetime-local"
                      value={makingExpiresAt}
                      onChange={(e) => setMakingExpiresAt(e.target.value)}
                      className={fieldClass()}
                    />
                    <input
                      value={makingCta}
                      onChange={(e) => setMakingCta(e.target.value)}
                      placeholder="버튼 문구 (선택)"
                      className={fieldClass()}
                    />
                    <div className="flex gap-2">
                      {MAKING_FONT_OPTIONS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setMakingFont(f.id)}
                          className={`flex-1 rounded-lg py-2 text-[12px] font-bold ${
                            makingFont === f.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                      <span className="truncate text-[13px] text-slate-700">
                        {makingFileMeta?.name || "이미지 첨부"}
                      </span>
                      <span className="ml-2 shrink-0 text-[12px] font-bold text-blue-600">선택</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.zip,.doc,.docx"
                        onChange={(e) => onPickFile(e.target.files?.[0])}
                      />
                    </label>
                    <select
                      value={makingAudience}
                      onChange={(e) => setMakingAudience(e.target.value)}
                      className={fieldClass()}
                    >
                      <option value="all">발송: 전체</option>
                      <option value="subscribe">발송: 구독</option>
                      <option value="friends">발송: 친구</option>
                    </select>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={makingAutoFeedUpload}
                        onChange={(e) => setMakingAutoFeedUpload(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      발송 후 활동 보드에 올리기
                    </label>
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={!canSave}
                  onClick={saveAsset}
                  className="w-full rounded-xl bg-blue-600 py-3.5 text-[15px] font-black text-white shadow-sm disabled:opacity-45"
                >
                  보관함에 저장
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {archiveCount === 0 ? (
                  <div className="rounded-2xl bg-white py-14 text-center ring-1 ring-slate-100">
                    <p className="text-[14px] font-bold text-slate-500">보관함이 비어 있습니다</p>
                    <button
                      type="button"
                      onClick={() => setStudioTab("create")}
                      className="mt-3 text-[13px] font-bold text-blue-600"
                    >
                      새로 만들기 →
                    </button>
                  </div>
                ) : (
                  makingItems.map((it) => (
                    <div key={it.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                      <p className="text-[11px] font-bold text-blue-600">
                        {it.type === "coupon" ? "이벤트 쿠폰" : "홍보 카드"}
                      </p>
                      <p className="mt-1 text-[16px] font-black text-slate-900">{it.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500">{it.body}</p>
                      {it.expiresAt ? (
                        <p className="mt-1 text-[11px] text-amber-700">
                          ~{new Date(it.expiresAt).toLocaleString("ko-KR")}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled={!canSend}
                        onClick={() => sendItem(it)}
                        className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white disabled:opacity-45"
                      >
                        채팅에 보내기
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {makingNotice ? (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-[99] w-[88%] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-900/90 px-4 py-3 text-center text-[13px] font-semibold text-white">
          {makingNotice}
        </div>
      ) : null}
    </>
  );
}
