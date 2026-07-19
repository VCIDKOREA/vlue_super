import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { sampleBizcardAlignment } from "../../lib/bizcardAutoDetect.js";
import { parseBizcardFromText } from "../../lib/bizcardOcrParser.js";
import { hasNativeDocumentOcr, runNativeDocumentOcr } from "../../lib/documentOcrBridge.js";
import { hasNativePosOcr, runNativePosBillOcr } from "../../lib/posBillNativeOcr.js";
import { preloadBizcardTesseract, runTesseractBizcardOcr } from "../../lib/bizcardTesseractOcr.js";
import { saveProfileToDeviceContacts } from "../../lib/contactVcfSave.js";
import { useSensitiveScreenSecure } from "../../hooks/useSensitiveScreenSecure.js";

/** 표준 종이명함 비율 ≈ 90×50mm */
const CARD_ASPECT = 90 / 50;
const MAX_AUTO_FAILS = 3;
const DETECT_INTERVAL_MS = 280;
const AUTO_COOLDOWN_MS = 2200;

const EMPTY_FIELDS = {
  name: "",
  organization: "",
  title: "",
  phone: "",
  fax: "",
  email: "",
  website: "",
  address: ""
};

/**
 * OCR 우선순위: Android ML Kit → POS OCR → Tesseract.js(웹)
 */
async function runBizcardOcr(dataUrl) {
  if (hasNativeDocumentOcr()) {
    const res = await runNativeDocumentOcr(dataUrl);
    if (res?.text?.trim()) return { text: res.text, engine: "native" };
  }
  if (hasNativePosOcr()) {
    const text = await runNativePosBillOcr(dataUrl);
    if (String(text || "").trim()) return { text: String(text), engine: "native" };
  }
  try {
    const text = await runTesseractBizcardOcr(dataUrl);
    if (text) return { text, engine: "tesseract" };
  } catch {
    /* fall through */
  }
  return { text: "", engine: "none" };
}

function captureCardFromVideo(video, frameEl, stageEl) {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");
  ctx.drawImage(video, 0, 0, w, h);

  if (!frameEl || !stageEl) {
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  const stage = stageEl.getBoundingClientRect();
  const frame = frameEl.getBoundingClientRect();
  if (stage.width < 1 || stage.height < 1) {
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  const scale = Math.max(stage.width / w, stage.height / h);
  const dispW = w * scale;
  const dispH = h * scale;
  const offsetX = (stage.width - dispW) / 2;
  const offsetY = (stage.height - dispH) / 2;

  const left = Math.max(0, Math.floor((frame.left - stage.left - offsetX) / scale));
  const top = Math.max(0, Math.floor((frame.top - stage.top - offsetY) / scale));
  const right = Math.min(w, Math.ceil((frame.right - stage.left - offsetX) / scale));
  const bottom = Math.min(h, Math.ceil((frame.bottom - stage.top - offsetY) / scale));
  const cw = Math.max(1, right - left);
  const ch = Math.max(1, bottom - top);

  const crop = document.createElement("canvas");
  crop.width = cw;
  crop.height = ch;
  const cctx = crop.getContext("2d");
  if (!cctx) return canvas.toDataURL("image/jpeg", 0.92);
  cctx.drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
  return crop.toDataURL("image/jpeg", 0.92);
}

function FieldRow({ label, value, onChange, placeholder, inputMode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-900 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function fieldsHaveData(f) {
  return Boolean(
    f.name.trim() || f.phone.trim() || f.email.trim() || f.fax.trim() || f.address.trim() || f.organization.trim()
  );
}

/**
 * 종이 명함 스캐너 — 자동 정렬·촬영 → OCR → 하단 폼 매핑 → 저장
 */
export default function BizcardScannerScreen({ open, onClose, onToast }) {
  useSensitiveScreenSecure(open);

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const galleryRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimerRef = useRef(0);
  const historyRef = useRef([]);
  const autoBusyRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const scanCompleteRef = useRef(false);
  const autoFailRef = useRef(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [rawOcr, setRawOcr] = useState("");
  const [guideReady, setGuideReady] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [autoFailCount, setAutoFailCount] = useState(0);
  const [manualUnlocked, setManualUnlocked] = useState(false);

  const stopCamera = useCallback(() => {
    try {
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    streamRef.current = null;
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        /* ignore */
      }
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch {
      setCameraError("카메라 권한이 필요합니다. 설정에서 카메라를 허용해 주세요.");
      setCameraReady(false);
    }
  }, [stopCamera]);

  const resetScanSession = useCallback(() => {
    historyRef.current = [];
    autoBusyRef.current = false;
    cooldownUntilRef.current = 0;
    scanCompleteRef.current = false;
    autoFailRef.current = 0;
    setPreviewUrl("");
    setFields(EMPTY_FIELDS);
    setRawOcr("");
    setOcrLoading(false);
    setSaving(false);
    setGuideReady(false);
    setScanComplete(false);
    setAutoFailCount(0);
    setManualUnlocked(false);
  }, []);

  useEffect(() => {
    if (!open) {
      if (detectTimerRef.current) window.clearTimeout(detectTimerRef.current);
      detectTimerRef.current = 0;
      stopCamera();
      resetScanSession();
      return undefined;
    }
    preloadBizcardTesseract();
    resetScanSession();
    void startCamera();
    return () => {
      if (detectTimerRef.current) window.clearTimeout(detectTimerRef.current);
      detectTimerRef.current = 0;
      stopCamera();
    };
  }, [open, startCamera, stopCamera, resetScanSession]);

  const setField = (key) => (value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const processImage = useCallback(
    async (dataUrl, { fromAuto = false } = {}) => {
      setPreviewUrl(dataUrl);
      setOcrLoading(true);
      setFields(EMPTY_FIELDS);
      setRawOcr("");
      setScanComplete(false);
      scanCompleteRef.current = false;
      stopCamera();
      try {
        const { text, engine } = await runBizcardOcr(dataUrl);
        setRawOcr(text);
        const parsed = parseBizcardFromText(text);
        const next = {
          name: parsed.name,
          organization: parsed.organization,
          title: parsed.title,
          phone: parsed.phone,
          fax: parsed.fax,
          email: parsed.email,
          website: parsed.website,
          address: parsed.address
        };
        setFields(next);
        const filled = fieldsHaveData(next);
        if (filled) {
          setScanComplete(true);
          scanCompleteRef.current = true;
          onToast?.(
            engine === "tesseract"
              ? "스캔 완료 · 명함 정보를 입력란에 채웠습니다."
              : "스캔 완료 · 명함 정보를 인식했습니다."
          );
        } else {
          if (fromAuto) {
            const fails = autoFailRef.current + 1;
            autoFailRef.current = fails;
            setAutoFailCount(fails);
            if (fails >= MAX_AUTO_FAILS) {
              setManualUnlocked(true);
              onToast?.("자동 촬영이 어려워요. 가운데 셔터로 직접 촬영해 주세요.");
            } else {
              onToast?.(
                !text.trim()
                  ? `글자를 읽지 못했습니다. (${fails}/${MAX_AUTO_FAILS}) 다시 맞춰 주세요.`
                  : `필드를 분류하지 못했습니다. (${fails}/${MAX_AUTO_FAILS}) 다시 맞춰 주세요.`
              );
            }
            setPreviewUrl("");
            void startCamera();
          } else if (!text.trim()) {
            onToast?.("글자를 읽지 못했습니다. 직접 입력하거나 다시 촬영해 주세요.");
          } else {
            onToast?.("글자는 읽었지만 필드를 자동 분류하지 못했습니다. 아래를 수정해 주세요.");
          }
        }
      } catch {
        if (fromAuto) {
          const fails = autoFailRef.current + 1;
          autoFailRef.current = fails;
          setAutoFailCount(fails);
          if (fails >= MAX_AUTO_FAILS) {
            setManualUnlocked(true);
            onToast?.("자동 촬영이 어려워요. 가운데 셔터로 직접 촬영해 주세요.");
          } else {
            onToast?.(`인식에 실패했습니다. (${fails}/${MAX_AUTO_FAILS})`);
          }
          setPreviewUrl("");
          void startCamera();
        } else {
          onToast?.("인식에 실패했습니다. 직접 입력해 주세요.");
        }
      } finally {
        setOcrLoading(false);
        autoBusyRef.current = false;
        cooldownUntilRef.current = Date.now() + AUTO_COOLDOWN_MS;
      }
    },
    [onToast, startCamera, stopCamera]
  );

  const captureNow = useCallback(
    async ({ fromAuto = false } = {}) => {
      const video = videoRef.current;
      if (!video || !cameraReady || ocrLoading || scanCompleteRef.current) return;
      if (autoBusyRef.current) return;
      autoBusyRef.current = true;
      try {
        const dataUrl = captureCardFromVideo(video, frameRef.current, stageRef.current);
        await processImage(dataUrl, { fromAuto });
      } catch (e) {
        autoBusyRef.current = false;
        onToast?.(e?.message || "촬영에 실패했습니다.");
      }
    },
    [cameraReady, ocrLoading, onToast, processImage]
  );

  /* 라이브 외곽선 감지 → 정렬·안정 시 자동 셔터 */
  useEffect(() => {
    if (!open || !cameraReady || cameraError || ocrLoading || scanComplete || previewUrl) {
      setGuideReady(false);
      return undefined;
    }

    const tick = () => {
      detectTimerRef.current = window.setTimeout(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || autoBusyRef.current || scanCompleteRef.current) {
          tick();
          return;
        }
        if (Date.now() < cooldownUntilRef.current) {
          setGuideReady(false);
          tick();
          return;
        }

        const sample = sampleBizcardAlignment(
          video,
          frameRef.current,
          stageRef.current,
          historyRef.current
        );
        setGuideReady(sample.aligned);

        if (sample.ready && !manualUnlocked) {
          void captureNow({ fromAuto: true });
        } else if (sample.ready && manualUnlocked) {
          /* 수동 모드: 초록 가이드만, 자동 셔터 중지 */
        }
        tick();
      }, DETECT_INTERVAL_MS);
    };
    tick();

    return () => {
      if (detectTimerRef.current) window.clearTimeout(detectTimerRef.current);
      detectTimerRef.current = 0;
    };
  }, [
    open,
    cameraReady,
    cameraError,
    ocrLoading,
    scanComplete,
    previewUrl,
    manualUnlocked,
    captureNow
  ]);

  const onPickGallery = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || ocrLoading || scanComplete) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (dataUrl) void processImage(dataUrl, { fromAuto: false });
    };
    reader.readAsDataURL(file);
  };

  const onRetake = () => {
    resetScanSession();
    void startCamera();
  };

  const canSave = fieldsHaveData(fields);
  const showSaveButton = scanComplete && !ocrLoading;

  const onSave = async () => {
    if (!canSave || saving || ocrLoading) return;
    setSaving(true);
    try {
      const res = await saveProfileToDeviceContacts({
        name: fields.name || fields.organization || "명함",
        organization: fields.organization,
        title: fields.title,
        phone: fields.phone,
        fax: fields.fax,
        email: fields.email,
        website: fields.website,
        address: fields.address,
        introBack: rawOcr ? `VLUE 명함스캔\n${rawOcr.slice(0, 400)}` : "VLUE 명함스캔"
      });
      if (res?.cancelled) {
        onToast?.("저장이 취소되었습니다.");
        return;
      }
      if (!res?.ok) {
        onToast?.(res?.error || "연락처 저장에 실패했습니다.");
        return;
      }
      onToast?.(
        res.method === "native"
          ? "연락처 저장 화면을 열었습니다."
          : res.method === "share"
            ? "연락처 파일로 공유했습니다."
            : "연락처 파일(.vcf)을 저장했습니다."
      );
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const onCenterAction = () => {
    if (showSaveButton) {
      void onSave();
      return;
    }
    if (!manualUnlocked && autoFailCount < MAX_AUTO_FAILS) {
      onToast?.("명함을 프레임에 맞추면 자동으로 촬영됩니다.");
      return;
    }
    void captureNow({ fromAuto: false });
  };

  if (!open) return null;

  const cornerClass = guideReady || scanComplete ? "border-emerald-400" : "border-slate-400";
  const borderClass = guideReady || scanComplete ? "border-emerald-400/90" : "border-slate-400/80";

  const statusHint = (() => {
    if (ocrLoading) return "명함 글자 인식 중…";
    if (scanComplete && canSave) return "스캔 완료 · 아래 정보를 확인한 뒤 저장하세요";
    if (manualUnlocked) return "직접 촬영 모드 · 가운데 셔터를 눌러 주세요";
    if (guideReady) return "인식 가능 · 잠시 고정하면 자동 촬영됩니다";
    if (autoFailCount > 0) {
      return `자동 촬영 재시도 중 (${autoFailCount}/${MAX_AUTO_FAILS}) · 프레임에 맞춰 주세요`;
    }
    return "명함을 프레임에 맞추면 자동으로 촬영합니다";
  })();

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-950 text-white">
      <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => onClose?.()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:scale-95"
          aria-label="닫기"
        >
          <X className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black tracking-tight">명함 스캐너</p>
          <p className="truncate text-[10px] font-semibold text-slate-300">{statusHint}</p>
        </div>
        {scanComplete ? (
          <button
            type="button"
            onClick={onRetake}
            className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold active:scale-95"
          >
            다시 촬영
          </button>
        ) : null}
      </header>

      <div ref={stageRef} className="relative min-h-0 flex-[1.15] overflow-hidden bg-black">
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover ${previewUrl ? "invisible" : ""}`}
          playsInline
          muted
          autoPlay
        />
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="촬영한 명함"
            className="absolute inset-0 h-full w-full object-contain bg-black"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
          <div
            ref={frameRef}
            className="relative w-full max-w-[340px] rounded-lg"
            style={{ aspectRatio: String(CARD_ASPECT) }}
          >
            <div className="absolute inset-0 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]" />
            <div className={`absolute inset-0 rounded-lg border-2 transition-colors duration-200 ${borderClass}`} />
            <div
              className={`absolute -left-0.5 -top-0.5 h-5 w-5 rounded-tl-md border-l-[3px] border-t-[3px] transition-colors duration-200 ${cornerClass}`}
            />
            <div
              className={`absolute -right-0.5 -top-0.5 h-5 w-5 rounded-tr-md border-r-[3px] border-t-[3px] transition-colors duration-200 ${cornerClass}`}
            />
            <div
              className={`absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-bl-md border-b-[3px] border-l-[3px] transition-colors duration-200 ${cornerClass}`}
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-br-md border-b-[3px] border-r-[3px] transition-colors duration-200 ${cornerClass}`}
            />
            <p className="absolute inset-x-0 bottom-2 text-center text-[11px] font-bold text-white/90 drop-shadow">
              {scanComplete ? "스캔 완료" : guideReady ? "인식 가능" : "종이 명함 크기"}
            </p>
          </div>
        </div>
        {cameraError ? (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-rose-600/90 px-3 py-2 text-center text-[12px] font-bold">
            {cameraError}
          </div>
        ) : null}
        {ocrLoading ? (
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 rounded-xl bg-blue-600/90 px-3 py-2 text-[12px] font-bold">
            <Loader2 className="h-4 w-4 animate-spin" />
            OCR 인식 중…
          </div>
        ) : null}
        {scanComplete && canSave && !ocrLoading ? (
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-emerald-600/90 px-3 py-2 text-center text-[12px] font-bold">
            스캔 완료
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-slate-100 text-slate-900">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
          <FieldRow
            label="상호"
            value={fields.organization}
            onChange={setField("organization")}
            placeholder="회사명"
          />
          <FieldRow label="이름" value={fields.name} onChange={setField("name")} placeholder="홍길동" />
          <FieldRow
            label="전화번호"
            value={fields.phone}
            onChange={setField("phone")}
            placeholder="010-0000-0000"
            inputMode="tel"
          />
          <FieldRow
            label="이메일"
            value={fields.email}
            onChange={setField("email")}
            placeholder="name@company.com"
            inputMode="email"
          />
          <FieldRow
            label="팩스번호"
            value={fields.fax}
            onChange={setField("fax")}
            placeholder="02-000-0000"
            inputMode="tel"
          />
          <FieldRow
            label="주소"
            value={fields.address}
            onChange={setField("address")}
            placeholder="서울시 …"
          />
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
          <p className="text-center text-[11px] font-semibold text-slate-500">
            {scanComplete && canSave
              ? "정보가 채워졌습니다 · 저장 버튼으로 연락처에 저장하세요"
              : manualUnlocked
                ? "자동 촬영 3회 실패 · 셔터로 직접 촬영하세요"
                : "프레임에 맞추면 자동 촬영 · 이름·전화·이메일 등을 채웁니다"}
          </p>
          <div className="flex items-center justify-center gap-8">
            <button
              type="button"
              disabled={ocrLoading || scanComplete}
              onClick={() => galleryRef.current?.click()}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95 disabled:opacity-40"
              aria-label="앨범에서 선택"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={
                showSaveButton
                  ? saving || !canSave
                  : ocrLoading || !cameraReady || !manualUnlocked
              }
              onClick={onCenterAction}
              className={`inline-flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full border-4 shadow-lg active:scale-95 disabled:opacity-40 ${
                showSaveButton
                  ? canSave
                    ? "border-emerald-300 bg-emerald-600 text-white"
                    : "border-slate-300 bg-slate-300 text-slate-500"
                  : manualUnlocked
                    ? "border-white/40 bg-white text-slate-900"
                    : "border-slate-300 bg-slate-200 text-slate-500"
              }`}
              aria-label={showSaveButton ? "저장" : "촬영"}
            >
              {saving ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : showSaveButton ? (
                <>
                  <Check className="h-7 w-7" strokeWidth={2.6} />
                  <span className="mt-0.5 text-[10px] font-black leading-none">저장</span>
                </>
              ) : (
                <Camera className="h-8 w-8" strokeWidth={2.2} />
              )}
            </button>
            <button
              type="button"
              disabled={ocrLoading}
              onClick={() => {
                if (scanComplete) onRetake();
                else void startCamera();
              }}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95 disabled:opacity-40"
              aria-label={scanComplete ? "다시 촬영" : "카메라 다시 열기"}
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void onPickGallery(e)}
          />
        </div>
      </div>
    </div>
  );
}
