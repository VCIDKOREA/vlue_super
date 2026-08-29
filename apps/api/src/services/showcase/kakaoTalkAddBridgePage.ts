import { normalizeKakaoTalkId } from "../../integrations/kakao/kakaoTalkId.js";

export function buildKakaoTalkAddBridgeHtml(talkId: string): string | null {
  const id = normalizeKakaoTalkId(talkId);
  if (!id) return null;
  const safeId = id.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>카카오톡 — ${safeId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f6f8; color: #4e5968; }
    .wrap { max-width: 420px; margin: 0 auto; padding: 48px 20px; text-align: center; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrap" id="status">카카오톡 ID를 준비하고 있습니다…</div>
  <script>
    (function () {
      var id = ${JSON.stringify(id)};
      var enc = encodeURIComponent(id);
      var scheme = "kakaotalk://friend/search?query=" + enc;
      var isAndroid = /Android/i.test(navigator.userAgent || "");
      var isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
      var status = document.getElementById("status");

      function copyId() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(id);
        }
        return new Promise(function (resolve, reject) {
          try {
            var ta = document.createElement("textarea");
            ta.value = id;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand("copy");
            document.body.removeChild(ta);
            ok ? resolve() : reject();
          } catch (e) {
            reject(e);
          }
        });
      }

      function openKakao() {
        if (isAndroid) {
          try {
            window.location.href = scheme;
            return;
          } catch (e) {}
          window.location.href =
            "intent://friend/search?query=" + enc +
            "#Intent;scheme=kakaotalk;package=com.kakao.talk;end";
          return;
        }
        if (isIos) {
          window.location.href = scheme;
          return;
        }
        status.textContent = "ID가 복사되었습니다. PC에서는 카카오톡 앱을 열 수 없습니다. 모바일 카카오톡에서 친구 추가 → ID로 추가를 이용해 주세요.";
      }

      copyId()
        .then(function () {
          status.textContent = "카카오톡 ID가 복사되었습니다. 카카오톡으로 이동합니다…";
          if (!isAndroid && !isIos) {
            status.textContent = "ID(" + id + ")가 복사되었습니다. PC에서는 카카오톡 앱을 열 수 없습니다. 모바일 카카오톡에서 친구 추가 → ID로 추가를 이용해 주세요.";
            return;
          }
          window.setTimeout(function () {
            openKakao();
          }, 360);
        })
        .catch(function () {
          status.textContent = "ID 복사에 실패했습니다. ID: " + id;
        });
    })();
  </script>
</body>
</html>`;
}
