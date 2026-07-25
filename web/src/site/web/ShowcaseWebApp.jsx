import { useEffect, useMemo } from "react";
import { parseShowcasePhoneFromPath } from "../../lib/showcaseWebRoute.js";
import { ShowcaseBgmProvider } from "../../context/ShowcaseBgmContext.jsx";
import ShowcaseWebPage from "./showcase/ShowcaseWebPage.jsx";
import "../../styles/tent-showcase.css";
import "../../styles/showcase-call-glass.css";

/** 알림톡 · 카톡 공개 링크 — /site/web/showcase/:phone (DCC+ 풀 쇼케이스) */
export default function ShowcaseWebApp() {
  const phone = useMemo(() => parseShowcasePhoneFromPath(window.location.pathname), []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.dataset.vlueShell = "showcase-web";
    document.body.style.fontFamily =
      "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
    document.body.style.backgroundColor = "#0B101B";
    document.title = phone ? `VLUE Showcase · ${phone}` : "VLUE Showcase";
    return () => {
      delete document.body.dataset.vlueShell;
      document.body.style.fontFamily = "";
      document.body.style.backgroundColor = "";
    };
  }, [phone]);

  return (
    <ShowcaseBgmProvider>
      <div data-vlue-site="showcase-web" className="showcase-web-app-root">
        <ShowcaseWebPage phone={phone || "01090000003"} />
      </div>
    </ShowcaseBgmProvider>
  );
}
