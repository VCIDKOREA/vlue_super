import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buildScanPdfBlob } from "../../lib/csScannerPdf.js";
import {
  defaultTempScanFileName,
  detectDocumentLiteFromImageDataUrl,
  detectDocumentLiteFromVideo,
  sanitizeScanFileName
} from "../../lib/csScannerOpenCv.js";
import { fetchPosLedgerRole, postOfficeScanUpload, postPosLedgerIngest } from "../../lib/vlueOfficeApi.js";
import { emitAssetFilesChanged } from "../../lib/vlueAssetFilesStorage.js";
import { parsePosBillFromText } from "../../lib/posBillOcrParser.js";
import { appendLocalPosEntry } from "../../lib/localPosLedger.js";
import { hasNativePosOcr, runNativePosBillOcr } from "../../lib/posBillNativeOcr.js";
import { wipeStaffScanArtifacts } from "../../lib/staffZeroRetention.js";
import { useSensitiveScreenSecure } from "../../hooks/useSensitiveScreenSecure.js";
import BackButton from "../common/BackButton";
import ScanDocumentReviewPanel from "./ScanDocumentReviewPanel.jsx";

const SCAN_MODES = {
  document: {
    title: "일반 문서 스캐너",
    subtitle: "명함·계약서·영수증 등을 촬영해 PDF로 개인 자료실에 저장합니다.",
    frameHint: "문서를 프레임 안에 맞춰 주세요",
    detectedHint: "문서 영역 자동 감지 · 모서리 드래그로 조정",
    completeLabel: "스캔 완료",
    accent: "blue"
  },
  pos: {
    title: "POS 빌지 스캐너",
    subtitle: "매출전표·마감 빌지를 촬영하면 일·월 장부에 자동 반영됩니다. (사업자 전용)",
    frameHint: "매출전표를 프레임 안에 맞춰 주세요",
    detectedHint: "빌지 영역 자동 감지 · 모서리 드래그로 조정",
    completeLabel: "장부 반영",
    staffCompleteLabel: "빌지 전송",
    accent: "emerald"
  }
};

function ScannerModeTabs({ mode, canUsePos, onSelect, staffOnly = false }) {
  if (staffOnly) {
    return (
      <div className="px-3 pb-2 pt-0.5">
        <p className="text-center text-[10px] font-semibold leading-snug text-emerald-700">
          직원 전용 · 마감 빌지 촬영 후 사장님에게만 전송 (로컬 즉시 삭제)
        </p>
        <p className="mt-0.5 text-center text-[10px] leading-snug text-slate-400">
          {SCAN_MODES.pos.subtitle}
        </p>
      </div>
    );
  }
  return (
    <div className="px-3 pb-2 pt-0.5">
      <div className="flex h-8 items-stretch gap-0.5 rounded-full bg-slate-100 p-0.5">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSelect("document")}
          className={`flex-1 touch-manipulation rounded-full px-2 text-[11px] font-semibold transition-all active:scale-[0.97] ${
            mode === "document" ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100" : "text-slate-500"
          }`}
        >
          일반 문서
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSelect("pos")}
          className={`flex-1 touch-manipulation rounded-full px-2 text-[11px] font-semibold transition-all active:scale-[0.97] ${
            !canUsePos
              ? "text-slate-400"
              : mode === "pos"
                ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                : "text-slate-500"
          }`}
        >
          POS 빌지{!canUsePos ? " · 사업자" : ""}
        </button>
      </div>
      <p className="mt-1 text-center text-[10px] leading-snug text-slate-400">
        {SCAN_MODES[mode]?.subtitle}
      </p>
    </div>
  );
}

const DEFAULT_CORNERS = {
  tl: { x: 10, y: 16 },
  tr: { x: 90, y: 14 },
  br: { x: 88, y: 84 },
  bl: { x: 12, y: 86 }
};

const DOC_TINT = "rgba(59, 130, 246, 0.15)";

function cornerPolygon(corners) {
  const { tl, tr, br, bl } = corners;
  return `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
}

function captureFrameFromVideo(video, corners) {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");
  ctx.drawImage(video, 0, 0, w, h);

  const xs = [corners.tl.x, corners.tr.x, corners.br.x, corners.bl.x].map((v) => (v / 100) * w);
  const ys = [corners.tl.y, corners.tr.y, corners.br.y, corners.bl.y].map((v) => (v / 100) * h);
  const left = Math.max(0, Math.floor(Math.min(...xs)));
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const right = Math.min(w, Math.ceil(Math.max(...xs)));
  const bottom = Math.min(h, Math.ceil(Math.max(...ys)));
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

function cropImageDataUrl(dataUrl, corners) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const xs = [corners.tl.x, corners.tr.x, corners.br.x, corners.bl.x].map((v) => (v / 100) * w);
      const ys = [corners.tl.y, corners.tr.y, corners.br.y, corners.bl.y].map((v) => (v / 100) * h);
      const left = Math.max(0, Math.floor(Math.min(...xs)));
      const top = Math.max(0, Math.floor(Math.min(...ys)));
      const right = Math.min(w, Math.ceil(Math.max(...xs)));
      const bottom = Math.min(h, Math.ceil(Math.max(...ys)));
      const cw = Math.max(1, right - left);
      const ch = Math.max(1, bottom - top);
      const crop = document.createElement("canvas");
      crop.width = cw;
      crop.height = ch;
      const ctx = crop.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, left, top, cw, ch, 0, 0, cw, ch);
      resolve(crop.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    img.src = dataUrl;
  });
}

function CornerHandle({ label, style, onPointerDown }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      style={style}
      className="absolute z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-md touch-none"
    />
  );
}

function PosOcrDialog({ open, busy, ocrLoading, ocrText, onChange, parsed, onCancel, onSave, isOwner, isStaff }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <p className="text-[14px] font-black text-slate-900">POS 빌지 OCR</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {ocrLoading
            ? "ML Kit이 빌지 텍스트를 인식 중입니다…"
            : isStaff
              ? "마감 빌지를 확인한 뒤 사장님에게 전송합니다. 전송 후 기기 데이터는 삭제됩니다."
              : isOwner
                ? "매출전표 텍스트를 확인·수정한 뒤 장부에 반영합니다."
                : "빌지 텍스트를 확인한 뒤 저장합니다."}
        </p>
        <textarea
          value={ocrText}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder={isOwner ? "총매출, 카드, 현금, 부가세…" : "합계, 카드, 현금, 부가세…"}
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] text-slate-900 outline-none focus:border-blue-500"
        />
        {parsed ? (
          <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
            <p>날짜 {parsed.saleDate}</p>
            <p>
              {isOwner ? "총매출" : "합계"} {parsed.totalKrw?.toLocaleString("ko-KR")}원 · 카드{" "}
              {parsed.cardKrw?.toLocaleString("ko-KR")} · 현금 {parsed.cashKrw?.toLocaleString("ko-KR")}
            </p>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-300 py-2.5 text-[12px] font-bold text-slate-600 disabled:opacity-50">
            취소
          </button>
          <button
            type="button"
            disabled={busy || ocrLoading || !ocrText.trim()}
            onClick={onSave}
            className="rounded-xl bg-emerald-600 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
          >
            {busy ? "저장 중…" : ocrLoading ? "OCR 중…" : isStaff ? "사장님에게 전송" : "장부 반영"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveFileDialog({ open, busy, fileName, onChange, onCancel, onSave }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <p className="text-[14px] font-black text-slate-900">개인 자료실 저장</p>
        <p className="mt-1 text-[11px] text-slate-500">파일명을 입력하지 않으면 임시 이름으로 저장됩니다.</p>
        <input
          value={fileName}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultTempScanFileName()}
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-blue-500"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-300 py-2.5 text-[12px] font-bold text-slate-600 disabled:opacity-50">
            취소
          </button>
          <button type="button" disabled={busy} onClick={onSave} className="rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white disabled:opacity-50">
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CsScannerScreen({
  open,
  onClose,
  onToast,
  initialMode = "document"
}) {
  useSensitiveScreenSecure(open);
  const [posRole, setPosRole] = useState(null);
  const canUsePos = Boolean(posRole?.canScanPos);
  const isOwner = posRole?.role === "OWNER";
  const isStaff = posRole?.role === "STAFF";
  const maskId = useId().replace(/:/g, "");
  const videoRef = useRef(null);
  const galleryRef = useRef(null);
  const streamRef = useRef(null);
  const overlayRef = useRef(null);
  const detectTimerRef = useRef(0);
  const manualUntilRef = useRef(0);
  const dragRef = useRef(null);
  const aliveRef = useRef(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [autoDetected, setAutoDetected] = useState(false);
  const [pages, setPages] = useState([]);
  const [corners, setCorners] = useState(DEFAULT_CORNERS);
  const [busy, setBusy] = useState(false);
  const [scanMode, setScanMode] = useState(
    initialMode === "pos" && canUsePos ? "pos" : "document"
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [posOcrText, setPosOcrText] = useState("");
  const [posOcrLoading, setPosOcrLoading] = useState(false);
  const [documentReviewOpen, setDocumentReviewOpen] = useState(false);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const handleClose = useCallback(() => {
    if (detectTimerRef.current) {
      window.clearTimeout(detectTimerRef.current);
      detectTimerRef.current = 0;
    }
    if (isStaff && pages.length > 0) {
      wipeStaffScanArtifacts(pages);
      setPages([]);
      setPosOcrText("");
    }
    stopCamera();
    setSaveDialogOpen(false);
    setPosDialogOpen(false);
    setDocumentReviewOpen(false);
    onClose?.();
  }, [isStaff, onClose, pages, stopCamera]);

  useEffect(() => {
    if (!open) return;
    fetchPosLedgerRole()
      .then((r) => setPosRole(r))
      .catch(() => setPosRole(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isStaff) {
      setScanMode("pos");
      return;
    }
    setScanMode(initialMode === "pos" && canUsePos ? "pos" : "document");
  }, [open, initialMode, canUsePos, isStaff]);

  const modeCopy = SCAN_MODES[scanMode] || SCAN_MODES.document;

  const runLiteDetect = useCallback(() => {
    if (Date.now() < manualUntilRef.current) return;
    const video = videoRef.current;
    if (!video || !cameraReady || video.readyState < 2) return;
    const detected = detectDocumentLiteFromVideo(video);
    if (detected) {
      setCorners(detected);
      setAutoDetected(true);
    }
  }, [cameraReady]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("카메라를 사용할 수 없습니다. 갤러리로 추가해 주세요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch {
      if (aliveRef.current) {
        setCameraError("카메라 권한이 필요합니다. 재시도 또는 갤러리를 이용해 주세요.");
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!open) {
      aliveRef.current = false;
      if (detectTimerRef.current) window.clearTimeout(detectTimerRef.current);
      stopCamera();
      return undefined;
    }

    aliveRef.current = true;
    setCameraError("");
    setPages([]);
    setCorners(DEFAULT_CORNERS);
    setAutoDetected(false);
    setSaveDialogOpen(false);
    setDocumentReviewOpen(false);
    setSaveFileName("");
    manualUntilRef.current = 0;

    startCamera();

    return () => {
      aliveRef.current = false;
      if (detectTimerRef.current) window.clearTimeout(detectTimerRef.current);
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  useEffect(() => {
    if (!open || !cameraReady || cameraError) return undefined;

    const schedule = () => {
      detectTimerRef.current = window.setTimeout(() => {
        if (!aliveRef.current) return;
        runLiteDetect();
        schedule();
      }, 900);
    };
    schedule();

    return () => {
      if (detectTimerRef.current) window.clearTimeout(detectTimerRef.current);
      detectTimerRef.current = 0;
    };
  }, [open, cameraReady, cameraError, runLiteDetect]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const onDragCorner = (key) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    manualUntilRef.current = Date.now() + 3000;
    dragRef.current = key;
    const onMove = (ev) => {
      const box = overlayRef.current?.getBoundingClientRect();
      if (!box || !dragRef.current) return;
      const clientX = ev.clientX ?? ev.touches?.[0]?.clientX;
      const clientY = ev.clientY ?? ev.touches?.[0]?.clientY;
      if (clientX == null || clientY == null) return;
      const x = Math.min(96, Math.max(4, ((clientX - box.left) / box.width) * 100));
      const y = Math.min(96, Math.max(4, ((clientY - box.top) / box.height) * 100));
      setCorners((prev) => ({ ...prev, [dragRef.current]: { x, y } }));
      setAutoDetected(false);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const capturePage = () => {
    runLiteDetect();
    const video = videoRef.current;
    if (!video || !cameraReady) {
      onToast?.("카메라가 준비되지 않았습니다. 갤러리에서 추가해 주세요.");
      return;
    }
    try {
      const dataUrl = captureFrameFromVideo(video, corners);
      setPages((prev) => [...prev, dataUrl]);
      onToast?.(`페이지 ${pages.length + 1} 촬영`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "촬영에 실패했습니다.");
    }
  };

  const onGalleryPick = async (fileList) => {
    if (isStaff) {
      onToast?.("직원 계정은 갤러리 저장·불러오기가 차단됩니다. 카메라로만 촬영해 주세요.");
      return;
    }
    const file = fileList?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
        reader.readAsDataURL(file);
      });
      const detected = await detectDocumentLiteFromImageDataUrl(dataUrl);
      if (detected) {
        setCorners(detected);
        setAutoDetected(true);
      }
      const cropped = await cropImageDataUrl(dataUrl, corners);
      setPages((prev) => [...prev, cropped]);
      onToast?.(`갤러리에서 페이지 ${pages.length + 1} 추가`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "이미지 추가에 실패했습니다.");
    }
  };

  const openSaveDialog = () => {
    if (!pages.length) {
      onToast?.("먼저 문서를 촬영하거나 갤러리에서 추가해 주세요.");
      return;
    }
    if (scanMode === "pos") {
      if (!canUsePos) {
        onToast?.("POS 빌지 스캔은 사업자 등록·승인 회원만 이용할 수 있습니다.");
        return;
      }
      setPosOcrText("");
      setPosDialogOpen(true);
      const lastPage = pages[pages.length - 1];
      if (hasNativePosOcr() && lastPage) {
        setPosOcrLoading(true);
        runNativePosBillOcr(lastPage)
          .then((text) => {
            if (text) {
              setPosOcrText(text);
              onToast?.("빌지 OCR 인식 완료");
            } else {
              onToast?.("OCR 결과가 없습니다. 직접 입력해 주세요.");
            }
          })
          .finally(() => setPosOcrLoading(false));
      }
      return;
    }
    setDocumentReviewOpen(true);
  };

  const posParsed = posOcrText.trim() ? parsePosBillFromText(posOcrText) : null;

  const confirmPosLedger = async () => {
    const text = posOcrText.trim();
    if (!text) return;
    setBusy(true);
    try {
      const parsed = parsePosBillFromText(text);
      let assetFileId = "";
      if (!isStaff) {
        try {
          const pdfBlob = await buildScanPdfBlob(pages);
          const fileName = sanitizeScanFileName(`pos-bill-${parsed.saleDate}`);
          const { file } = await postOfficeScanUpload(pdfBlob, fileName);
          assetFileId = file?.id || "";
          emitAssetFilesChanged();
        } catch {
          /* PDF 부가 저장 실패는 장부 반영과 분리 */
        }
        await appendLocalPosEntry({ ...parsed, rawOcrText: text });
        try {
          window.VlueFamilyBridgeNative?.savePosLedgerLocal?.(
            JSON.stringify({ ...parsed, rawOcrText: text })
          );
        } catch {
          /* ignore */
        }
      }
      const result = await postPosLedgerIngest(text, assetFileId);
      const wipe = Boolean(result?.wipeLocalAfterSync);
      if (wipe) {
        wipeStaffScanArtifacts(pages);
        setPages([]);
        setPosOcrText("");
      }
      onToast?.(
        isStaff
          ? "마감 빌지가 사장님에게 전송되었습니다."
          : `매출 장부 반영: ${parsed.totalKrw.toLocaleString("ko-KR")}원`
      );
      setPosDialogOpen(false);
      handleClose();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "장부 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const confirmSave = async () => {
    setBusy(true);
    try {
      const pdfBlob = await buildScanPdfBlob(pages);
      const fileName = sanitizeScanFileName(saveFileName);
      const { file } = await postOfficeScanUpload(pdfBlob, fileName);
      emitAssetFilesChanged();
      onToast?.(`개인 자료실 저장: ${file?.fileName || fileName}`);
      setSaveDialogOpen(false);
      handleClose();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      <header className="relative z-[120] shrink-0 border-b border-slate-100 bg-white pt-[max(0px,env(safe-area-inset-top,0px))]">
        <div className="flex items-center gap-1 px-2 py-1.5">
          <BackButton variant="inline" onBack={handleClose} />
          <p className="min-w-0 flex-1 text-center text-[15px] font-black text-slate-900">{modeCopy.title}</p>
          <div className="flex shrink-0 items-center gap-1">
            <span className={`text-[11px] font-bold ${scanMode === "pos" ? "text-emerald-600" : "text-blue-600"}`}>
              {pages.length}장
            </span>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              onClick={handleClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-slate-500 active:bg-slate-100"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        </div>
        <ScannerModeTabs
          mode={scanMode}
          canUsePos={canUsePos}
          staffOnly={isStaff}
          onSelect={(next) => {
            if (isStaff) return;
            if (next === "pos" && !canUsePos) {
              onToast?.("POS 빌지는 사업자 등록·승인 후 이용할 수 있습니다.");
              return;
            }
            if (next === scanMode) return;
            setScanMode(next);
            onToast?.(next === "pos" ? "POS 빌지 스캔 모드" : "일반 문서 스캔 모드");
          }}
        />
      </header>

      <div ref={overlayRef} className="relative min-h-0 flex-1 bg-slate-200">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <mask id={`cs-scanner-doc-mask-${maskId}`}>
              <rect width="100" height="100" fill="white" />
              <polygon points={cornerPolygon(corners)} fill="black" />
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgba(0,0,0,0.35)" mask={`url(#cs-scanner-doc-mask-${maskId})`} />
          <polygon points={cornerPolygon(corners)} fill={DOC_TINT} stroke="#3B82F6" strokeWidth="0.55" />
        </svg>
        {(["tl", "tr", "br", "bl"]).map((key) => (
          <CornerHandle
            key={key}
            label={`문서 꼭짓점 ${key}`}
            style={{ left: `${corners[key].x}%`, top: `${corners[key].y}%` }}
            onPointerDown={onDragCorner(key)}
          />
        ))}
        <p className="pointer-events-none absolute left-0 right-0 top-3 z-10 text-center text-[11px] font-semibold text-white drop-shadow">
          {autoDetected ? modeCopy.detectedHint : modeCopy.frameHint}
        </p>
        {cameraError ? (
          <div className="absolute bottom-4 left-3 right-3 z-20 space-y-2">
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-center text-[12px] font-bold text-rose-700">{cameraError}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={startCamera}
                className="touch-manipulation rounded-lg border border-rose-200 bg-white py-2 text-[11px] font-semibold text-rose-700 active:bg-rose-50"
              >
                카메라 재시도
              </button>
              {!isStaff ? (
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="touch-manipulation rounded-lg bg-blue-600 py-2 text-[11px] font-semibold text-white active:bg-blue-700"
                >
                  갤러리에서 추가
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => onGalleryPick(e.target.files)} />

      <div className="relative z-[120] shrink-0 border-t border-slate-100 bg-white px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {pages.map((url, i) => (
            <div key={`${url.slice(0, 24)}-${i}`} className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-slate-200">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-center text-[9px] text-white">{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            disabled={busy || !cameraReady}
            onClick={capturePage}
            className="touch-manipulation rounded-lg border border-slate-200 py-2.5 text-[11px] font-semibold text-slate-700 active:bg-slate-50 disabled:opacity-50"
          >
            촬영
          </button>
          {!isStaff ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="touch-manipulation rounded-lg border border-slate-200 py-2.5 text-[11px] font-semibold text-slate-600 active:bg-slate-50"
            >
              갤러리
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="touch-manipulation rounded-lg border border-slate-100 py-2.5 text-[11px] font-semibold text-slate-300"
              title="직원은 갤러리 사용 불가"
            >
              갤러리
            </button>
          )}
          <button
            type="button"
            disabled={busy || pages.length === 0}
            onClick={() => setPages((p) => p.slice(0, -1))}
            className="touch-manipulation rounded-lg border border-slate-200 py-2.5 text-[11px] font-semibold text-slate-600 active:bg-slate-50 disabled:opacity-50"
          >
            되돌리기
          </button>
          <button
            type="button"
            disabled={busy || !pages.length}
            onClick={openSaveDialog}
            className={`touch-manipulation rounded-lg py-2.5 text-[11px] font-semibold text-white active:opacity-90 disabled:opacity-50 ${scanMode === "pos" ? "bg-emerald-600" : "bg-blue-600"}`}
          >
            {isStaff ? SCAN_MODES.pos.staffCompleteLabel : modeCopy.completeLabel}
          </button>
        </div>
      </div>

      <SaveFileDialog
        open={saveDialogOpen}
        busy={busy}
        fileName={saveFileName}
        onChange={setSaveFileName}
        onCancel={() => !busy && setSaveDialogOpen(false)}
        onSave={confirmSave}
      />
      <PosOcrDialog
        open={posDialogOpen}
        busy={busy}
        ocrLoading={posOcrLoading}
        ocrText={posOcrText}
        onChange={setPosOcrText}
        parsed={posParsed}
        isOwner={isOwner}
        isStaff={isStaff}
        onCancel={() => !busy && !posOcrLoading && setPosDialogOpen(false)}
        onSave={confirmPosLedger}
      />
      <ScanDocumentReviewPanel
        open={documentReviewOpen}
        pages={pages}
        busy={busy}
        onToast={onToast}
        onClose={() => !busy && setDocumentReviewOpen(false)}
        onSave={() => {
          setDocumentReviewOpen(false);
          setSaveFileName("");
          setSaveDialogOpen(true);
        }}
      />
    </div>
  );
}
