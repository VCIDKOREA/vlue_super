import { useState } from "react";
import ModalCloseButton from "./common/ModalCloseButton";
import { resolveWalletProfile } from "../lib/cardWalletStorage.js";

export default function CardWalletModal({
  open,
  onClose,
  walletCards = [],
  profileByRoomId = {},
  onRemoveCardFromWallet,
  onShareCardToChat,
  title = "명함지갑"
}) {
  const [openedUserId, setOpenedUserId] = useState("");
  const [toast, setToast] = useState("");

  if (!open) return null;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  return (
    <>
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-6" onMouseDown={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 pt-12 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <ModalCloseButton variant="default" onClick={onClose} />
        <div className="flex items-center justify-between gap-2 pr-8">
          <h4 className="text-[15px] font-black text-gray-900">{title}</h4>
          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">{walletCards.length}개</span>
        </div>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {walletCards.map((item) => {
            const profile = resolveWalletProfile(item, profileByRoomId);
            const opened = openedUserId === item.userId;
            const legal = String(profile.legalName || "").trim();
            const lineName = `${profile.title || ""} ${profile.name || ""}`.trim() || "이름 미등록";
            return (
              <div key={item.id} className="w-full rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-3 text-left shadow-sm">
                <button type="button" onClick={() => setOpenedUserId((prev) => (prev === item.userId ? "" : item.userId))} className="w-full text-left">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-md border border-blue-200 bg-white text-[7px] font-black text-blue-600">
                      {profile.logoUrl ? <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" /> : "LOGO"}
                    </span>
                    <p className="text-[11px] font-black tracking-wide text-blue-600">{profile.organization || "VLUE"}</p>
                  </div>
                  <p className="mt-1 text-[12px] font-black text-gray-900">{lineName}</p>
                  {legal && <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">본인인증 완료: {legal}</p>}
                  {profile.phone && <p className="text-[11px] font-semibold text-slate-700">{profile.phone}</p>}
                  {opened && (
                    <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{profile.introBack || "등록된 소개가 없습니다."}</p>
                  )}
                </button>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveCardFromWallet?.(item.userId);
                      setOpenedUserId("");
                      showToast("지갑에서 삭제했습니다.");
                    }}
                    className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(`${profile.organization || ""} ${profile.title || ""} ${profile.name || ""} ${profile.phone || ""}`.trim());
                      showToast("복사되었습니다.");
                    }}
                    className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-600"
                  >
                    복사
                  </button>
                  {typeof onShareCardToChat === "function" && (
                    <button
                      type="button"
                      onClick={() => {
                        onShareCardToChat(profile);
                        onClose?.();
                      }}
                      className="rounded-md border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold text-blue-700"
                    >
                      명함 공유하기
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {walletCards.length === 0 && <p className="py-8 text-center text-[12px] text-gray-400">저장된 명함이 없습니다.</p>}
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-1.5 text-[12px] font-bold text-gray-600">
            닫기
          </button>
        </div>
      </div>
    </div>
    {toast && (
      <div className="pointer-events-none fixed bottom-28 left-1/2 z-[130] w-[86%] max-w-sm -translate-x-1/2 rounded-xl border border-blue-100 bg-white/95 px-4 py-2.5 text-center text-[13px] font-semibold text-gray-700 shadow-lg">
        {toast}
      </div>
    )}
    </>
  );
}
