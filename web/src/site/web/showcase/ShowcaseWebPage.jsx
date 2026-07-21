import { useEffect, useState } from "react";
import { Check, ExternalLink, Paperclip } from "lucide-react";
import { resolveVlueShowcaseByPhone } from "../../../lib/resolveVlueShowcaseByPhone.js";
import { getVlueDownloadLinks } from "../../../lib/vlueClientAccess.js";
import { openVlueDownload } from "../../../lib/vlueDownloadActions.js";
import "./showcase-web.css";

function downloadAttachment(file) {
  const url = String(file?.url || "").trim();
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName || file.label || "download";
  a.rel = "noopener noreferrer";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function ShowcaseWebPage({ phone }) {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    resolveVlueShowcaseByPhone(phone).then((data) => {
      if (!cancelled) setPayload(data);
    });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  const links = getVlueDownloadLinks();

  const handleAppDownload = () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    if (/iphone|ipad|ipod/i.test(ua)) {
      if (!openVlueDownload("appStore")) window.location.assign(links.downloadPage);
      return;
    }
    if (/android/i.test(ua)) {
      if (!openVlueDownload("playStore")) window.location.assign(links.downloadPage);
      return;
    }
    window.location.assign(links.downloadPage);
  };

  if (!payload) {
    return (
      <div className="showcase-web">
        <p className="showcase-web__loading">불러오는 중…</p>
      </div>
    );
  }

  const { card, phone: phoneDisplay, verified, isPaid, attachments, outlinks } = payload;
  const photo = String(card.photoUrl || "").trim();
  const moodText = String(card.companyIntro || "").trim();
  const displayName = String(card.name || "").trim();
  const vlueId = String(card.publicHandle || card.loginId || "").trim();
  const vlueIdLabel = vlueId ? (vlueId.startsWith("@") ? vlueId : `@${vlueId}`) : "";
  const orgLine = isPaid
    ? [card.organization, card.title].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="showcase-web">
      <header className="showcase-web__trust" role="status">
        <span className="showcase-web__trust-icon" aria-hidden>
          <Check strokeWidth={3} size={11} />
        </span>
        <span className="showcase-web__trust-text">
          {verified ? "VLUE 인증 완료 번호" : "VLUE 번호 확인"}
        </span>
      </header>

      <div className="showcase-web__inner">
        <section className="showcase-web__hero" aria-label="디지털 프로필">
          <p className="showcase-web__eyebrow">안심 통신 프로필</p>
          <h1 className="showcase-web__phone">{phoneDisplay}</h1>

          {displayName ? <p className="showcase-web__name">{displayName}</p> : null}

          {!isPaid && vlueIdLabel ? <p className="showcase-web__meta showcase-web__meta--id">{vlueIdLabel}</p> : null}

          {isPaid && orgLine ? <p className="showcase-web__meta">{orgLine}</p> : null}

          {!isPaid && !displayName && !vlueIdLabel ? <p className="showcase-web__meta">VLUE 일상 프로필</p> : null}

          {moodText ? <p className="showcase-web__intro">{moodText}</p> : null}

          {verified ? <span className="showcase-web__badge-row">VLUE Showcase</span> : null}

          {photo ? <img className="showcase-web__photo" src={photo} alt="" /> : null}
        </section>

        {attachments.length > 0 ? (
          <section className="showcase-web__section" aria-label="첨부파일">
            <h2 className="showcase-web__section-title">첨부파일</h2>
            <div className="showcase-web__card-stack">
              {attachments.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className="showcase-web__file-btn"
                  onClick={() => downloadAttachment(file)}
                >
                  <span className="showcase-web__file-icon" aria-hidden>
                    <Paperclip size={18} strokeWidth={2} />
                  </span>
                  <span className="showcase-web__file-copy">
                    <span className="showcase-web__file-label">{file.label}</span>
                    <span className="showcase-web__file-meta">{file.fileName}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {outlinks.length > 0 ? (
          <section className="showcase-web__section" aria-label="외부 링크">
            <h2 className="showcase-web__section-title">링크</h2>
            <div className="showcase-web__card-stack">
              {outlinks.map((link) => (
                <a
                  key={link.id}
                  className="showcase-web__outlink"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="showcase-web__outlink-label">
                    {link.platform === "instagram"
                      ? "Instagram"
                      : link.platform === "youtube"
                        ? "YouTube"
                        : link.label}
                  </span>
                  <span className="showcase-web__outlink-arrow" aria-hidden>
                    <ExternalLink size={15} strokeWidth={2} />
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="showcase-web__cta-wrap">
        <button type="button" className="showcase-web__cta" onClick={handleAppDownload}>
          1초 만에 내 번호도 안심 보호하기 (무료)
        </button>
      </div>
    </div>
  );
}
