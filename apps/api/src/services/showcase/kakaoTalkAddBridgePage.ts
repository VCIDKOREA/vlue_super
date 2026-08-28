import { normalizeKakaoTalkId } from "../../integrations/kakao/kakaoTalkId.js";

export function buildKakaoTalkAddBridgeHtml(talkId: string): string | null {
  const id = normalizeKakaoTalkId(talkId);
  if (!id) return null;
  const enc = encodeURIComponent(id);
  const safeId = id.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>카카오톡 친구 추가 — ${safeId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f6f8; color: #191f28; }
    .wrap { max-width: 420px; margin: 0 auto; padding: 32px 20px 40px; }
    .card { background: #fff; border-radius: 16px; padding: 24px 20px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { font-size: 14px; line-height: 1.5; color: #4e5968; margin: 0 0 16px; }
    .id { display: inline-block; padding: 8px 12px; border-radius: 10px; background: #fee500; font-weight: 700; }
    .btn { display: block; width: 100%; border: 0; border-radius: 12px; padding: 14px 16px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 10px; }
    .btn-primary { background: #fee500; color: #191f28; }
    .btn-ghost { background: #f2f4f6; color: #191f28; }
    .hint { font-size: 12px; color: #8b95a1; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>카카오톡 친구 추가</h1>
      <p>아래 ID로 친구를 검색해 추가할 수 있습니다.</p>
      <div class="id">@${safeId}</div>
      <button type="button" class="btn btn-primary" id="open-kakao">카카오톡에서 열기</button>
      <button type="button" class="btn btn-ghost" id="copy-id">ID 복사</button>
      <p class="hint">열리지 않으면 카카오톡 → 친구 → 친구 추가 → ID로 추가에서 직접 검색해 주세요.</p>
    </div>
  </div>
  <script>
    (function () {
      var id = ${JSON.stringify(id)};
      var enc = ${JSON.stringify(enc)};
      var androidIntent =
        "intent://friend/search?query=" + enc +
        "#Intent;scheme=kakaotalk;package=com.kakao.talk;end";
      var iosScheme = "kakaotalk://friend/search?query=" + enc;
      var isAndroid = /Android/i.test(navigator.userAgent || "");
      var isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");

      document.getElementById("open-kakao").addEventListener("click", function () {
        var href = isAndroid ? androidIntent : isIos ? iosScheme : "";
        if (href) {
          window.location.href = href;
          return;
        }
        alert("모바일에서 카카오톡 앱으로 열어 주세요.");
      });

      document.getElementById("copy-id").addEventListener("click", function () {
        var text = id;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            alert("ID를 복사했습니다.");
          }).catch(function () {
            prompt("ID를 복사해 주세요.", text);
          });
          return;
        }
        prompt("ID를 복사해 주세요.", text);
      });
    })();
  </script>
</body>
</html>`;
}
