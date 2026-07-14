/**
 * 통화 중·통화목록 — 카톡 쇼케이스 전달
 * Kakao.Share 사용 후 오버레이/화면을 유지한 채 토스트로 안내.
 * (카카오 정책상 친구 지정 백그라운드 무알림 발송은 SDK에 없으며, Share 시트 완료 콜백으로 처리)
 */

import { ensureKakaoSdk } from "../kakaoSocialLogin.js";
import { buildVlueInviteMessage, getInviteSenderName } from "../contactInviteShare.js";
import { getVlueViralLinks } from "../vlueViralLinks.js";

const FALLBACK_DOWNLOAD = "https://www.vlue.kr/download";

/**
 * @param {{
 *   inviteeName?: string,
 *   phone?: string,
 *   onToast?: (msg: string) => void
 * }} opts
 * @returns {Promise<{ ok: boolean, channel?: string, cancelled?: boolean, error?: string }>}
 */
export async function shareShowcaseInviteViaKakao(opts = {}) {
  const inviteeName = String(opts.inviteeName || "").trim();
  const text = buildVlueInviteMessage(inviteeName);
  const title = `${getInviteSenderName()}님이 VLUE 쇼케이스를 보냅니다`;
  const viral = getVlueViralLinks();
  const linkUrl =
    String(viral?.downloadUrl || viral?.createUrl || "").startsWith("http")
      ? viral.downloadUrl || viral.createUrl
      : FALLBACK_DOWNLOAD;

  let Kakao;
  try {
    Kakao = await ensureKakaoSdk();
  } catch (e) {
    return fallbackClipboard(text, opts.onToast, e?.message || "kakao_sdk");
  }

  if (!Kakao?.Share?.sendDefault) {
    return fallbackClipboard(text, opts.onToast, "no_share_api");
  }

  try {
    await new Promise((resolve, reject) => {
      try {
        Kakao.Share.sendDefault({
          objectType: "text",
          text: text.slice(0, 200),
          link: {
            mobileWebUrl: linkUrl,
            webUrl: linkUrl
          },
          buttonTitle: "VLUE 설치하기",
          installTalk: true,
          callback: () => resolve({ ok: true })
        });
        /* sendDefault는 callback이 항상 불리지 않을 수 있어 짧은 지연 후 성공 처리 */
        window.setTimeout(() => resolve({ ok: true }), 600);
      } catch (err) {
        reject(err);
      }
    });
    opts.onToast?.("카톡으로 쇼케이스가 전달되었습니다");
    return { ok: true, channel: "kakao_share" };
  } catch (e) {
    if (e?.name === "AbortError") return { ok: false, cancelled: true };
    return fallbackClipboard(text, opts.onToast, e?.message || "share_failed");
  }
}

async function fallbackClipboard(text, onToast, reason) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      onToast?.("전달 문구가 복사되었습니다. 카톡에 붙여넣어 주세요.");
      return { ok: true, channel: "clipboard", error: reason };
    }
  } catch {
    /* ignore */
  }
  onToast?.("카톡 공유를 열 수 없습니다. 잠시 후 다시 시도해 주세요.");
  return { ok: false, error: reason };
}
