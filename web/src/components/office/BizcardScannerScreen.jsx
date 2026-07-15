import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { parseBizcardFromText } from "../../lib/bizcardOcrParser.js";
import { hasNativeDocumentOcr, runNativeDocumentOcr } from "../../lib/documentOcrBridge.js";
import { hasNativePosOcr, runNativePosBillOcr } from "../../lib/posBillNativeOcr.js";
import { saveProfileToDeviceContacts } from "../../lib/contactVcfSave.js";
import { useSensitiveScreenSecure } from "../../hooks/useSensitiveScreenSecure.js";

/** 표준 종이명함 비율 ≈ 90×50mm */
const CARD_ASPECT = 90 / 50;

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

async function runBizcardOcr(dataUrl) {
  if (hasNativeDocumentOcr()) {
    const res = await runNativeDocumentOcr(dataUrl);
    if (res?.text?.trim()) return res.text;
  }
  if (hasNativePosOcr()) {
    const text = await runNativePosBillOcr(dataUrl);
    if (String(text || "").trim()) return String(text);
  }
  return "";
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

  /* object-cover 매핑 */
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

/**
 * 종이 명함 스캐너 — 명함 크기 프레임 → OCR → 필드 확인 → 연락처 저장
 */
export default function BizcardScannerScreen({ open, onClose, onToast }) {
  useSensitiveScreenSecure(open);

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const galleryRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [phase, setPhase] = useState("camera"); /* camera | review */
  const [previewUrl, setPreviewUrl] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [rawOcr, setRawOcr] = useState("");

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

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase("camera");
      setPreviewUrl("");
      setFields(EMPTY_FIELDS);
      setRawOcr("");
      setOcrLoading(false);
      setSaving(false);
      return undefined;
    }
    void startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const setField = (key) => (value) => setFields((prev) => ({ ...prev, [key]: value }));

  const processImage = useCallback(
    async (dataUrl) => {
      setPreviewUrl(dataUrl);
      setPhase("review");
      setOcrLoading(true);
      setFields(EMPTY_FIELDS);
      setRawOcr("");
      stopCamera();
      try {
        const text = await runBizcardOcr(dataUrl);
        setRawOcr(text);
        const parsed = parseBizcardFromText(text);
        setFields({
          name: parsed.name,
          organization: parsed.organization,
          title: parsed.title,
          phone: parsed.phone,
          fax: parsed.fax,
          email: parsed.email,
          website: parsed.website,
          address: parsed.address
        });
        if (!text.trim()) {
          onToast?.(
            hasNativeDocumentOcr() || hasNativePosOcr()
              ? "글자를 읽지 못했습니다. 직접 입력하거나 다시 촬영해 주세요."
              : "앱에서 촬영하면 자동 인식됩니다. 지금은 직접 입력해 주세요."
          );
        } else {
          onToast?.("명함 정보를 인식했습니다. 확인 후 저장하세요.");
        }
      } catch {
        onToast?.("인식에 실패했습니다. 직접 입력해 주세요.");
      } finally {
        setOcrLoading(false);
      }
    },
    [onToast, stopCamera]
  );

  const onCapture = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    try {
      const dataUrl = captureCardFromVideo(video, frameRef.current, stageRef.current);
      await processImage(dataUrl);
    } catch (e) {
      onToast?.(e?.message || "촬영에 실패했습니다.");
    }
  };

  const onPickGallery = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (dataUrl) void processImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onRetake = () => {
    setPhase("camera");
    setPreviewUrl("");
    setFields(EMPTY_FIELDS);
    setRawOcr("");
    void startCamera();
  };

  const canSave = Boolean(
    fields.name.trim() || fields.phone.trim() || fields.email.trim() || fields.organization.trim()
  );

  const onSave = async () => {
    if (!canSave || saving) return;
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

  if (!open) return null;

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
          <p className="truncate text-[10px] font-semibold text-slate-300">
            {phase === "camera"
              ? "종이 명함을 프레임에 맞춘 뒤 촬영하세요"
              : ocrLoading
                ? "글자를 읽는 중…"
                : "인식된 정보를 확인하고 저장하세요"}
          </p>
        </div>
      </header>

      {phase === "camera" ? (
        <>
          <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* 어두운 마스크 + 명함 비율 프레임 */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
              <div
                ref={frameRef}
                className="relative w-full max-w-[340px] rounded-lg"
                style={{ aspectRatio: String(CARD_ASPECT) }}
              >
                <div className="absolute inset-0 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]" />
                <div className="absolute inset-0 rounded-lg border-2 border-white/90" />
                <div className="absolute -left-0.5 -top-0.5 h-5 w-5 rounded-tl-md border-l-[3px] border-t-[3px] border-blue-400" />
                <div className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-tr-md border-r-[3px] border-t-[3px] border-blue-400" />
                <div className="absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-bl-md border-b-[3px] border-l-[3px] border-blue-400" />
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-br-md border-b-[3px] border-r-[3px] border-blue-400" />
                <p className="absolute inset-x-0 bottom-2 text-center text-[11px] font-bold text-white/90 drop-shadow">
                  종이 명함 크기
                </p>
              </div>
            </div>
            {cameraError ? (
              <div className="absolute inset-x-4 top-4 rounded-xl bg-rose-600/90 px-3 py-2 text-center text-[12px] font-bold">
                {cameraError}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <p className="text-center text-[11px] font-semibold text-slate-300">
              이름 · 전화 · 팩스 · 이메일 · 주소를 자동으로 채웁니다
            </p>
            <div className="flex items-center justify-center gap-8">
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 active:scale-95"
                aria-label="앨범에서 선택"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={!cameraReady}
                onClick={() => void onCapture()}
                className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/40 bg-white text-slate-900 shadow-lg active:scale-95 disabled:opacity-40"
                aria-label="촬영"
              >
                <Camera className="h-8 w-8" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 active:scale-95"
                aria-label="카메라 다시 열기"
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
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col bg-slate-100 text-slate-900">
          <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="촬영한 명함"
                className="mx-auto max-h-36 w-auto rounded-lg border border-slate-200 object-contain"
              />
            ) : null}
            {ocrLoading ? (
              <p className="mt-2 flex items-center justify-center gap-2 text-[12px] font-bold text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                명함 글자 인식 중…
              </p>
            ) : (
              <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
                아래 항목을 확인·수정한 뒤 저장하세요
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            <FieldRow label="이름" value={fields.name} onChange={setField("name")} placeholder="홍길동" />
            <FieldRow
              label="상호·회사"
              value={fields.organization}
              onChange={setField("organization")}
              placeholder="회사명"
            />
            <FieldRow label="직함" value={fields.title} onChange={setField("title")} placeholder="대표 · 매니저" />
            <FieldRow
              label="전화번호"
              value={fields.phone}
              onChange={setField("phone")}
              placeholder="010-0000-0000"
              inputMode="tel"
            />
            <FieldRow
              label="팩스"
              value={fields.fax}
              onChange={setField("fax")}
              placeholder="02-000-0000"
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
              label="웹사이트"
              value={fields.website}
              onChange={setField("website")}
              placeholder="company.com"
            />
            <FieldRow
              label="주소"
              value={fields.address}
              onChange={setField("address")}
              placeholder="서울시 …"
            />
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onRetake}
              className="rounded-xl border border-slate-300 py-3 text-[13px] font-black text-slate-700 active:scale-[0.98]"
            >
              다시 촬영
            </button>
            <button
              type="button"
              disabled={!canSave || saving || ocrLoading}
              onClick={() => void onSave()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.6} />
              )}
              {saving ? "저장 중…" : "연락처 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
