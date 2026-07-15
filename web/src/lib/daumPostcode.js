/**
 * 카카오(다음) 우편번호 서비스 — 전국 도로명·지번 검색 (별도 API 키 불필요)
 * @see https://postcode.map.daum.net/guide
 * 팝업(.open)은 모바일·팝업 차단 환경에서 실패하므로 기본은 화면 내 embed 레이어.
 */

const SCRIPT_URL = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const LAYER_ID = "vlue-daum-postcode-layer";
const EMBED_ID = "vlue-daum-postcode-embed";

let scriptPromise = null;

function loadPostcodeScript() {
  if (typeof window !== "undefined" && window.daum?.Postcode) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const fail = () => {
      scriptPromise = null;
      reject(
        new Error(
          "카카오 우편번호 스크립트를 불러오지 못했습니다. 네트워크·광고차단을 확인하거나 아래에 주소를 직접 입력해 주세요."
        )
      );
    };
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      if (window.daum?.Postcode) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", fail);
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = fail;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function ensurePostcodeLayer() {
  let layer = document.getElementById(LAYER_ID);
  if (layer) {
    /* 온보딩 셸(z≈1000002)보다 위에 오도록 매 오픈 시 보정 */
    layer.style.zIndex = "10000150";
    return layer;
  }

  layer = document.createElement("div");
  layer.id = LAYER_ID;
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.style.cssText =
    "position:fixed;inset:0;z-index:10000150;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(15,23,42,.55);";

  const panel = document.createElement("div");
  panel.style.cssText =
    "width:min(100%,520px);height:min(82vh,560px);display:flex;flex-direction:column;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.25);";

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc;";

  const title = document.createElement("span");
  title.textContent = "우편번호 · 주소 찾기";
  title.style.cssText = "font-size:14px;font-weight:800;color:#0f172a;";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "닫기";
  closeBtn.dataset.vluePostcodeClose = "1";
  closeBtn.style.cssText =
    "border:1px solid #cbd5e1;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;background:#fff;color:#334155;cursor:pointer;";

  header.appendChild(title);
  header.appendChild(closeBtn);

  closeBtn.addEventListener("mousedown", (ev) => {
    ev.stopPropagation();
  });
  closeBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
  });

  const embed = document.createElement("div");
  embed.id = EMBED_ID;
  embed.style.cssText = "flex:1;min-height:0;width:100%;";

  panel.appendChild(header);
  panel.appendChild(embed);
  layer.appendChild(panel);
  document.body.appendChild(layer);
  return layer;
}

function hidePostcodeLayer() {
  const layer = document.getElementById(LAYER_ID);
  const embed = document.getElementById(EMBED_ID);
  if (layer) layer.style.display = "none";
  if (embed) embed.innerHTML = "";
}

/**
 * @param {(p: { roadAddress: string; zonecode: string; buildingName: string }) => void} onComplete
 */
export function openDaumPostcode(onComplete) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 주소 검색을 사용할 수 있습니다."));
  }

  return loadPostcodeScript().then(() => {
    if (!window.daum?.Postcode) {
      throw new Error("우편번호 모듈이 준비되지 않았습니다. 잠시 후 다시 시도하거나 주소를 직접 입력해 주세요.");
    }

    const layer = ensurePostcodeLayer();
    const embed = document.getElementById(EMBED_ID);
    const closeBtn = layer.querySelector("[data-vlue-postcode-close]");
    if (!embed) {
      throw new Error("주소 검색 UI를 열 수 없습니다.");
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      hidePostcodeLayer();
    };

    const onSelect = (data) => {
      const road = (data.roadAddress || data.autoRoadAddress || "").trim();
      const jibun = (data.jibunAddress || "").trim();
      const line = road || jibun;
      if (!line) return;
      onComplete({
        roadAddress: line,
        zonecode: String(data.zonecode || ""),
        buildingName: String(data.buildingName || "")
      });
      finish();
    };

    closeBtn.onclick = finish;
    layer.onclick = (ev) => {
      if (ev.target === layer) finish();
    };

    embed.innerHTML = "";
    layer.style.display = "flex";

    const postcode = new window.daum.Postcode({
      oncomplete: onSelect,
      onclose: finish,
      width: "100%",
      height: "100%",
      maxSuggestItems: 8
    });

    try {
      postcode.embed(embed);
    } catch {
      finish();
      throw new Error("주소 검색 창을 표시하지 못했습니다. 주소를 직접 입력해 주세요.");
    }
  });
}

/** E2E·로컬 — 우편 API 없이 등본 주소 단계 통과 */
export const DEV_SAMPLE_ROAD_ADDRESS = "서울특별시 강남구 테헤란로 152";
