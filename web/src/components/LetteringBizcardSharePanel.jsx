import { useEffect, useMemo, useState } from "react";
import { copyShowcaseShareUrl } from "../lib/letteringBizcardShare.js";
import { readLetteringFixedIdentity } from "../lib/letteringBizcardStorage.js";
import { syncDigitalCardExportSnapshot, ensureDigitalCardId } from "../lib/digitalCardApi.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import KakaoBizcardFeedPreview from "./KakaoBizcardFeedPreview.jsx";
import HelpTip from "./HelpTip.jsx";

const SHOWCASE_SHARE_HELP_PAID =
  "쇼케이스 주소를 복사해 카카오톡 등에 붙여넣으세요. 상대가 열면 풀 쇼케이스가 펼쳐집니다.\n\n· 명함이 있으면 쇼케이스 안에 함께 표시됩니다.\n· 검색 목록 공개 여부는 「쇼케이스 검색」 설정에서 따로 관리합니다.";

const SHOWCASE_SHARE_HELP_FREE =
  "쇼케이스 주소를 복사해 카카오톡 등에 붙여넣으세요. 상대가 열면 풀 쇼케이스가 펼쳐집니다.\n\n· 무료 회원: 이름·VLUE ID·전화번호가 노출됩니다.\n· 검색 목록 공개 여부는 「쇼케이스 검색」 설정에서 따로 관리합니다.";

function readVlueHandleDisplay() {
  try {
    const raw = String(localStorage.getItem("vlue_member_handle") || "").trim();
    if (!raw) return "";
    return raw.startsWith("@") ? raw : `@${raw}`;
  } catch {
    return "";
  }
}

/** 마이페이지 — 쇼케이스 링크 미리보기 · 주소 복사 */
export default function LetteringBizcardSharePanel({
  card,
  membershipTier = "free",
  isDarkMode = false,
  embedded = true,
  onToast
}) {
  const [busy, setBusy] = useState("");
  const [shareReady, setShareReady] = useState(false);
  const isPaid = isPaidLetteringTier(membershipTier);

  const sharePhone = useMemo(() => {
    const fixed = readLetteringFixedIdentity();
    return String(fixed.phone || card?.phone || "").trim();
  }, [card?.phone]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isPaid && card) {
        await syncDigitalCardExportSnapshot(card);
        await ensureDigitalCardId();
      }
      if (cancelled) return;
      setShareReady(Boolean(sharePhone));
    })();
    return () => {
      cancelled = true;
    };
  }, [card?.name, card?.organization, card?.phone, card?.title, card?.department, isPaid, sharePhone]);

  const runCopy = async () => {
    if (busy) return;
    setBusy("copy");
    try {
      const r = await copyShowcaseShareUrl(card, { membershipTier });
      if (!r.ok && r.error) {
        onToast?.(r.error);
        if (r.viewUrl) onToast?.(`주소: ${r.viewUrl}`);
        return;
      }
      onToast?.("쇼케이스 주소를 복사했습니다. 카카오톡 채팅방에 붙여넣기 하세요.");
    } catch (e) {
      onToast?.(e?.message || "주소 복사에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  const btnCopy =
    "vlue-kakao-brand-btn w-full rounded-xl bg-[#FEE500] px-2 py-2.5 text-[12px] font-semibold text-[rgba(0,0,0,0.82)] active:scale-[0.99] disabled:opacity-50";

  const wrapCls = embedded
    ? `mt-2.5 border-t pt-2.5 ${isDarkMode ? "border-white/10" : "border-slate-200/90"}`
    : `mt-3 rounded-2xl border p-3 ${isDarkMode ? "border-cyan-500/20 bg-slate-900/50" : "border-slate-200 bg-white"}`;

  const handleLabel = readVlueHandleDisplay();

  return (
    <div className={wrapCls}>
      <div className="flex items-center gap-1">
        <p className={`text-[13px] font-semibold tracking-tight ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>
          쇼케이스 공유란
        </p>
        <HelpTip text={isPaid ? SHOWCASE_SHARE_HELP_PAID : SHOWCASE_SHARE_HELP_FREE} isDarkMode={isDarkMode} />
      </div>
      <p className={`mt-1 text-[11px] font-normal leading-relaxed ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
        미리보기 확인 후{" "}
        <span className={isDarkMode ? "text-cyan-200/90" : "text-slate-600"}>쇼케이스 주소 복사</span>를 누르세요.
      </p>
      {!isPaid && handleLabel ? (
        <p className={`mt-1 text-[10px] font-medium ${isDarkMode ? "text-cyan-300/80" : "text-blue-600/90"}`}>
          공유 ID {handleLabel}
        </p>
      ) : null}

      <KakaoBizcardFeedPreview
        card={card}
        membershipTier={membershipTier}
        isDarkMode={isDarkMode}
        onToast={onToast}
      />

      <div className="mt-2">
        <button type="button" disabled={!!busy || !shareReady} className={btnCopy} onClick={() => void runCopy()}>
          {busy === "copy" ? "복사 중…" : "쇼케이스 주소 복사"}
        </button>
      </div>
    </div>
  );
}
