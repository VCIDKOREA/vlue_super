import { useEffect, useMemo, useRef, useState } from "react";
import {
  copyShowcaseShareUrl,
  prepareKakaoBizcardShare,
  openPreparedKakaoBizcardShare
} from "../lib/letteringBizcardShare.js";
import { readLetteringFixedIdentity } from "../lib/letteringBizcardStorage.js";
import { syncDigitalCardExportSnapshot, ensureDigitalCardId } from "../lib/digitalCardApi.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import {
  fetchVlueBadgeSnapshot,
  readShowcaseShareCountLocal,
  recordSelfShowcaseShareApi,
  VLUE_VERIFIED_BADGE_CHANGED_EVENT
} from "../lib/vlueVerifiedBadgeApi.js";
import KakaoBizcardFeedPreview from "./KakaoBizcardFeedPreview.jsx";
import HelpTip from "./HelpTip.jsx";

const SHOWCASE_SHARE_HELP_PAID =
  "카카오에 보이는 카드와 같은 형태로 미리보기를 보여 줍니다.\n\n· 「카카오톡으로 보내기」: 카드(제목·썸네일)가 바로 전달됩니다.\n· 「주소 복사」 후 채팅에 붙여넣기: 카카오가 링크를 읽어 미리보기를 만듭니다(수 초~수 분 걸릴 수 있음).\n\n· 배경 썸네일은 카카오 카드 상단 이미지입니다.\n· 검색 목록 공개는 「쇼케이스 검색」 설정에서 따로 관리합니다.";

const SHOWCASE_SHARE_HELP_FREE =
  "「쇼케이스 주소 복사」 후 채팅에 붙여넣으면, 아래 미리보기와 비슷한 카카오 링크 카드가 뜹니다(수 초~수 분 걸릴 수 있음).\n\n· 무료 회원: 이름·VLUE ID·전화번호가 노출될 수 있습니다.\n· 검색 목록 공개는 「쇼케이스 검색」 설정에서 따로 관리합니다.";

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
  const [kakaoPrepared, setKakaoPrepared] = useState(null);
  const [shareCount, setShareCount] = useState(() => readShowcaseShareCountLocal());
  const prepareGen = useRef(0);
  const isPaid = isPaidLetteringTier(membershipTier);

  useEffect(() => {
    const sync = () => setShareCount(readShowcaseShareCountLocal());
    sync();
    void fetchVlueBadgeSnapshot().then((badge) => {
      if (badge && Number.isFinite(Number(badge.showcaseShareCount))) {
        setShareCount(Number(badge.showcaseShareCount));
      }
    });
    window.addEventListener(VLUE_VERIFIED_BADGE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(VLUE_VERIFIED_BADGE_CHANGED_EVENT, sync);
  }, []);

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

  /* 카톡 공유 페이로드 미리 준비 — 클릭 시 await 없이 sendDefault */
  useEffect(() => {
    if (!isPaid || !card || !sharePhone) {
      setKakaoPrepared(null);
      return undefined;
    }
    const gen = ++prepareGen.current;
    let cancelled = false;
    setKakaoPrepared(null);
    (async () => {
      const prepared = await prepareKakaoBizcardShare(card);
      if (cancelled || gen !== prepareGen.current) return;
      setKakaoPrepared(prepared);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isPaid,
    sharePhone,
    card?.name,
    card?.organization,
    card?.phone,
    card?.title,
    card?.department,
    card?.titlePhotoUrl,
    card?.shareCoverUrl
  ]);

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
      onToast?.("주소를 복사했습니다. 채팅방에 붙여넣으면 잠시 후 미리보기가 생길 수 있습니다.");
      const recorded = await recordSelfShowcaseShareApi();
      if (recorded && Number.isFinite(Number(recorded.showcaseShareCount))) {
        setShareCount(Number(recorded.showcaseShareCount));
      }
    } catch (e) {
      onToast?.(e?.message || "주소 복사에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  const runKakao = () => {
    if (busy) return;
    if (!isPaid) {
      onToast?.("카카오톡 카드 공유는 유료(인증명함) 회원만 사용할 수 있습니다. 주소 복사를 이용해 주세요.");
      return;
    }
    if (!kakaoPrepared?.ok) {
      onToast?.(kakaoPrepared?.error || "카카오 공유를 준비 중입니다. 잠시 후 다시 눌러 주세요.");
      if (card) {
        const gen = ++prepareGen.current;
        void prepareKakaoBizcardShare(card).then((prepared) => {
          if (gen !== prepareGen.current) return;
          setKakaoPrepared(prepared);
        });
      }
      return;
    }
    /* 클릭 동기 경로 — await 금지 (카카오 팝업 focus 요구) */
    const r = openPreparedKakaoBizcardShare(kakaoPrepared);
    if (!r.ok && r.error) {
      onToast?.(r.error);
      return;
    }
    onToast?.(
      r.viewUrl
        ? `카카오톡 공유 창을 열었습니다. 버튼 주소: ${r.viewUrl}`
        : "카카오톡 공유 창을 열었습니다."
    );
    void recordSelfShowcaseShareApi().then((recorded) => {
      if (recorded && Number.isFinite(Number(recorded.showcaseShareCount))) {
        setShareCount(Number(recorded.showcaseShareCount));
      }
    });
  };

  const btnCopy =
    "vlue-kakao-brand-btn w-full rounded-xl bg-[#FEE500] px-2 py-2.5 text-[12px] font-semibold text-[rgba(0,0,0,0.82)] active:scale-[0.99] disabled:opacity-50";
  const btnSecondary =
    "w-full rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[12px] font-semibold text-slate-700 active:scale-[0.99] disabled:opacity-50";

  const wrapCls = embedded
    ? `mt-2.5 border-t pt-2.5 ${isDarkMode ? "border-white/10" : "border-slate-200/90"}`
    : `mt-3 rounded-2xl border p-3 ${isDarkMode ? "border-cyan-500/20 bg-slate-900/50" : "border-slate-200 bg-white"}`;

  const handleLabel = readVlueHandleDisplay();
  const kakaoBusyLabel = !kakaoPrepared
    ? "준비 중…"
    : kakaoPrepared?.ok
      ? "카카오톡으로 보내기"
      : "다시 준비";

  return (
    <div className={wrapCls}>
      <div className="flex items-center gap-1">
        <p className={`text-[13px] font-semibold tracking-tight ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>
          쇼케이스 공유란
        </p>
        <HelpTip text={isPaid ? SHOWCASE_SHARE_HELP_PAID : SHOWCASE_SHARE_HELP_FREE} isDarkMode={isDarkMode} />
        <span
          className={`ml-auto shrink-0 text-[11px] font-bold tabular-nums ${
            isDarkMode ? "text-cyan-300" : "text-cyan-600"
          }`}
        >
          공유 ({shareCount})
        </span>
      </div>
      <p className={`mt-1 text-[11px] font-normal leading-relaxed ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
        아래는 <span className={isDarkMode ? "text-cyan-200/90" : "text-slate-600"}>카카오톡에 뜨는 링크 카드</span>와
        같은 미리보기입니다. 확인 후{" "}
        <span className={isDarkMode ? "text-cyan-200/90" : "text-slate-600"}>
          {isPaid ? "카카오톡으로 보내기" : "쇼케이스 주소 복사"}
        </span>
        를 누르세요.
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

      <div className="mt-2 space-y-2">
        {isPaid ? (
          <button
            type="button"
            disabled={!!busy || !shareReady || !kakaoPrepared}
            className={btnCopy}
            onClick={runKakao}
          >
            {busy === "kakao" ? "여는 중…" : kakaoBusyLabel}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!!busy || !shareReady}
          className={isPaid ? btnSecondary : btnCopy}
          onClick={() => void runCopy()}
        >
          {busy === "copy" ? "복사 중…" : "쇼케이스 주소 복사"}
        </button>
      </div>
    </div>
  );
}
