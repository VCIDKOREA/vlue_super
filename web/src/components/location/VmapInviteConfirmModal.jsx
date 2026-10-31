import { createPortal } from "react-dom";

/**
 * V-Map 초대 링크 진입 확인 — 확인 시에만 accept(가입), 취소 시 미입장.
 */
export default function VmapInviteConfirmModal({
  open,
  busy = false,
  inviterName = "",
  placeLabel = "",
  onConfirm,
  onCancel
}) {
  if (!open || typeof document === "undefined") return null;

  const who = String(inviterName || "친구").trim() || "친구";
  const place = String(placeLabel || "약속 장소").trim() || "약속 장소";

  return createPortal(
    <div
      className="fixed inset-0 z-[720] flex items-center justify-center bg-black/55 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vmap-invite-confirm-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel?.();
      }}
    >
      <div
        className="w-full max-w-[320px] rounded-[22px] border border-white/12 bg-[#0c1220] px-5 py-5 text-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p id="vmap-invite-confirm-title" className="text-center text-[17px] font-bold tracking-tight">
          입장하시겠습니까?
        </p>
        <p className="mt-2 text-center text-[13px] leading-snug text-white/70">
          <span className="font-semibold text-white/90">{who}</span>님의 V-Map 초대
          <br />
          목적지: <span className="font-semibold text-[#7EE8FF]">{place}</span>
        </p>
        <p className="mt-2 text-center text-[11px] leading-snug text-white/45">
          확인 후에도 [출발] 전까지는 위치가 공유되지 않습니다.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel?.()}
            className="rounded-full border border-white/15 bg-white/5 py-2.5 text-[14px] font-semibold text-white/85 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm?.()}
            className="rounded-full bg-[#00D2FF] py-2.5 text-[14px] font-black text-[#04121a] disabled:opacity-50"
          >
            {busy ? "입장 중…" : "확인"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
