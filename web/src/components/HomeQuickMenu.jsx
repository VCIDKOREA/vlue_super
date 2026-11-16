import { useEffect, useState } from "react";
import { LETTERING_OPEN_BIZCARD_SETTINGS_EVENT } from "../lib/letteringBizcardStorage.js";
import { SHOWCASE_OPEN_SETTINGS_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import { readLocalPatch, remainingFrom } from "../lib/safetyPatch.js";
import { OPEN_SAFETY_PATCH_EVENT } from "./AnsimPatchButton.jsx";

const OPEN_BIZCARD_SCANNER_EVENT = "vlue-open-bizcard-scanner";
const OPEN_SMS_INBOX_EVENT = "vlue-open-sms-inbox";

function patchIsComplete() {
  return remainingFrom(readLocalPatch()?.lastPatchedAt) > 0;
}

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="3" fill="currentColor" opacity="0.18" />
      <rect x="2.5" y="5" width="19" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.2" cy="11" r="2" fill="currentColor" />
      <path d="M12.2 9.6h6.2M12.2 12.6h4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17.6" cy="16.2" r="3.1" fill="currentColor" />
      <path d="m16.3 16.2 0.9 0.9 1.7-1.8" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconScan() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8.2V6.2A2.2 2.2 0 0 1 6.2 4H8.4" />
      <path d="M15.6 4h2.2A2.2 2.2 0 0 1 20 6.2v2" />
      <path d="M20 15.6v2.2A2.2 2.2 0 0 1 17.8 20H15.6" />
      <path d="M8.4 20H6.2A2.2 2.2 0 0 1 4 17.8v-2.2" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconShowcase() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <rect x="2.8" y="3.2" width="13.6" height="15.2" rx="3.4" fill="currentColor" opacity="0.16" />
      <rect x="2.8" y="3.2" width="13.6" height="15.2" rx="3.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="7.4" cy="8.2" r="1.7" fill="currentColor" />
      <path d="M5.2 14.4c.55-1.35 1.5-2 2.2-2s1.65.65 2.2 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M18.5 12.1c0-.95-.75-1.7-1.7-1.7-.55 0-1.05.28-1.35.72-.3-.44-.8-.72-1.35-.72-.95 0-1.7.75-1.7 1.7 0 1.7 3.05 3.25 3.05 3.25s3.05-1.55 3.05-3.25z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconFamily() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M12 21.2s6.4-4.7 6.4-9.2a6.4 6.4 0 1 0-12.8 0c0 4.5 6.4 9.2 6.4 9.2z" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="11.6" r="2.1" fill="currentColor" />
    </svg>
  );
}

function IconSms() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M5 5.5h14a2.2 2.2 0 0 1 2.2 2.2v6.2A2.2 2.2 0 0 1 19 16.1h-6.2L8 19.2v-3.1H5A2.2 2.2 0 0 1 2.8 13.9V7.7A2.2 2.2 0 0 1 5 5.5z" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.4 10.6h9.2M7.4 13.2h5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M12 3.2 5.2 6v5.6c0 4 2.6 6.8 6.8 8.4 4.2-1.6 6.8-4.4 6.8-8.4V6L12 3.2z" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m8.8 11.8 2.2 2.2 4.2-4.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ITEMS = [
  {
    id: "dcc",
    label: "디지털인증명함",
    tone: "bg-blue-50 text-blue-600",
    icon: IconCard,
    action: () => window.dispatchEvent(new Event(LETTERING_OPEN_BIZCARD_SETTINGS_EVENT))
  },
  {
    id: "scan",
    label: "AI명함스캔",
    tone: "bg-cyan-50 text-cyan-700",
    icon: IconScan,
    spark: true,
    action: () => window.dispatchEvent(new Event(OPEN_BIZCARD_SCANNER_EVENT))
  },
  {
    id: "showcase",
    label: "SNS쇼케이스",
    tone: "bg-indigo-50 text-indigo-600",
    icon: IconShowcase,
    action: () => window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT))
  },
  {
    id: "family",
    label: "가족위치",
    tone: "bg-emerald-50 text-emerald-600",
    icon: IconFamily,
    action: () => window.dispatchEvent(new CustomEvent("vlue-open-location", { detail: { mode: "family" } }))
  },
  {
    id: "sms",
    label: "AI문자검사",
    tone: "bg-violet-50 text-violet-600",
    icon: IconSms,
    action: () => window.dispatchEvent(new Event(OPEN_SMS_INBOX_EVENT))
  },
  {
    id: "patch",
    label: "안심패치",
    tone: "bg-teal-50 text-teal-700",
    icon: IconShield,
    patch: true,
    action: () => window.dispatchEvent(new Event(OPEN_SAFETY_PATCH_EVENT))
  }
];

export default function HomeQuickMenu({ isDarkMode = false }) {
  const [patchComplete, setPatchComplete] = useState(() => patchIsComplete());

  useEffect(() => {
    const sync = () => setPatchComplete(patchIsComplete());
    sync();
    const timer = window.setInterval(sync, 1000);
    window.addEventListener("vlue-safety-patch-changed", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("vlue-safety-patch-changed", sync);
    };
  }, []);

  return (
    <section
      className={`mx-2.5 mt-2 shrink-0 rounded-2xl border px-1.5 py-2 shadow-sm ${
        isDarkMode ? "border-white/10 bg-[#111827]" : "border-gray-100 bg-white"
      }`}
      aria-label="바로가기"
    >
      <div className="grid grid-cols-3 gap-y-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 active:scale-95"
            >
              <span className="relative">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                  <Icon />
                </span>
                {item.spark ? (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-black text-white shadow-sm"
                    aria-hidden
                  >
                    ✦
                  </span>
                ) : null}
                {item.patch ? (
                  <span className="absolute -right-3 -top-1.5 rounded-full bg-emerald-500 px-1.5 py-px text-[8px] font-black leading-tight text-white shadow-sm">
                    {patchComplete ? "완료" : "ON"}
                  </span>
                ) : null}
              </span>
              <span className={`max-w-full text-center text-[10.5px] font-bold leading-tight ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
