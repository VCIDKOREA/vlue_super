import { useEffect } from "react";
import BoltMarketingApp from "./bolt/App";
import "./bolt/index.css";

/** web2 bolt.new 마케팅 앱 전체 (소스맵에서 복원한 `site/bolt/`) */
export default function VlueMarketingApp() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.dataset.vlueShell = "www";
    document.body.style.fontFamily =
      "'Pretendard Variable', Pretendard, Inter, sans-serif";
    document.body.style.backgroundColor = "#F5F9FF";

    const applyRootScale = () => {
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      /* 네이버 본문(14~15px)에 맞춘 www 기준 — 설명 문구 가독성 */
      document.documentElement.style.fontSize = wide ? "118.75%" : "106.25%";
    };
    applyRootScale();
    window.addEventListener("resize", applyRootScale);

    return () => {
      delete document.body.dataset.vlueShell;
      document.body.style.fontFamily = "";
      document.body.style.backgroundColor = "";
      document.documentElement.style.fontSize = "";
      window.removeEventListener("resize", applyRootScale);
    };
  }, []);

  return (
    <div data-vlue-site="marketing">
      <BoltMarketingApp />
    </div>
  );
}
