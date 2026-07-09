import { useEffect, useMemo } from "react";
import { parseShowcasePhoneFromPath } from "../../lib/showcaseWebRoute.js";
import ShowcaseWebPage from "./showcase/ShowcaseWebPage.jsx";

/** 알림톡 · 웹뷰 포털 — /site/web/showcase/:phone */
export default function ShowcaseWebApp() {
  const phone = useMemo(() => parseShowcasePhoneFromPath(window.location.pathname), []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.dataset.vlueShell = "showcase-web";
    document.body.style.fontFamily =
      "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
    document.body.style.backgroundColor = "#ffffff";
    document.title = phone ? `VLUE Showcase · ${phone}` : "VLUE Showcase";
    return () => {
      delete document.body.dataset.vlueShell;
      document.body.style.fontFamily = "";
      document.body.style.backgroundColor = "";
    };
  }, [phone]);

  return (
    <div data-vlue-site="showcase-web">
      <ShowcaseWebPage phone={phone || "01090000003"} />
    </div>
  );
}
