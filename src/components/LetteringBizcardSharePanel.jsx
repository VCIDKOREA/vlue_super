import { useEffect, useState } from "react";
import { shareBizcardViaEmail, shareBizcardViaKakao, shareBizcardViaSms } from "../lib/letteringBizcardShare.js";
import { ensureDigitalCardId, syncDigitalCardExportSnapshot } from "../lib/digitalCardApi.js";
import { getKakaoFeedCardPreviewUrl } from "../lib/kakaoBizcardFeedShare.js";
import KakaoBizcardFeedPreview from "./KakaoBizcardFeedPreview.jsx";

/** 마이페이지 — 카카오 Feed 버튼 카드 · 문자/이메일 */
export default function LetteringBizcardSharePanel({
  card,
  isDarkMode = false,
  embedded = true,
  onToast
}) {
  const [busy, setBusy] = useState("");
  const [cardId, setCardId] = useState("");
  const [feedPngUrl, setFeedPngUrl] = useState("");
  const [feedPngOk, setFeedPngOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncDigitalCardExportSnapshot(card);
      const id = (await ensureDigitalCardId()) || "";
      if (cancelled) return;
      setCardId(id);
      setFeedPngOk(false);
      if (id) {
        setFeedPngUrl(`${getKakaoFeedCardPreviewUrl(id)}?v=${Date.now()}`);
      } else {
        setFeedPngUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [card?.name, card?.organization, card?.phone, card?.title, card?.department]);

  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    try {
      const r = await fn();
      if (r.cancelled) return;
      if (!r.ok && r.error) {
        onToast?.(r.error);
        return;
      }
      const msg =
        key === "kakao"
          ? "카카오톡에 VLUE 인증 명함 카드가 전송되었습니다. 탭하면 라이브 명함이 열립니다."
          : key === "sms"
            ? "문자 앱으로 이동합니다."
            : key === "email"
              ? "메일 앱으로 이동합니다."
              : "완료";
      onToast?.(msg);
    } catch (e) {
      onToast?.(e?.message || "공유에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  const btnSecondary = isDarkMode
    ? "rounded-lg border border-white/25 bg-white/5 px-2 py-2 text-[11px] font-bold text-gray-100 shadow-sm active:scale-[0.99] disabled:opacity-50"
    : "rounded-lg border border-slate-200 bg-slate-100 px-2 py-2 text-[11px] font-bold text-slate-800 active:scale-[0.99] disabled:opacity-50";

  const btnKakao =
    "col-span-2 rounded-lg bg-[#FEE500] px-2 py-3 text-[12px] font-black text-[#191919] active:scale-[0.99] disabled:opacity-50";

  const wrapCls = embedded
    ? `mt-2.5 border-t pt-2.5 ${isDarkMode ? "border-white/10" : "border-slate-200/90"}`
    : `mt-3 rounded-2xl border p-3 ${isDarkMode ? "border-cyan-500/20 bg-slate-900/50" : "border-slate-200 bg-white"}`;

  return (
    <div className={wrapCls}>
      <p className={`text-[13px] font-black ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>보안 명함 공유</p>
      <p className={`mt-0.5 text-[12px] leading-snug ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
        카카오는 <strong className={isDarkMode ? "text-[#FEE500]" : "text-[#b8860b]"}>개인화 명함 카드</strong>로 전송 · 탭 시
        라이브 홀로그램 뷰어
      </p>

      {feedPngUrl && feedPngOk ? (
        <img
          src={feedPngUrl}
          alt="카카오톡에 전송되는 명함 카드"
          className="mt-2 h-auto w-full max-w-full rounded-2xl border border-slate-200/90 shadow-sm [image-rendering:auto]"
          width={800}
          height={520}
          onError={() => setFeedPngOk(false)}
        />
      ) : (
        <>
          {feedPngUrl ? (
            <img
              src={feedPngUrl}
              alt=""
              className="sr-only"
              onLoad={() => setFeedPngOk(true)}
              onError={() => setFeedPngOk(false)}
            />
          ) : null}
          <KakaoBizcardFeedPreview card={card} isDarkMode={isDarkMode} />
        </>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={!!busy || !cardId}
          className={btnKakao}
          onClick={() => run("kakao", () => shareBizcardViaKakao(card))}
        >
          카카오톡 · 명함 카드 보내기
        </button>
        <button type="button" disabled={!!busy} className={btnSecondary} onClick={() => run("sms", async () => shareBizcardViaSms(card))}>
          문자
        </button>
        <button type="button" disabled={!!busy} className={btnSecondary} onClick={() => run("email", async () => shareBizcardViaEmail(card))}>
          이메일
        </button>
      </div>
    </div>
  );
}
