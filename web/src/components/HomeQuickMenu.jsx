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
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
      <rect x="3" y="9" width="42" height="28" rx="8" fill="#1D4ED8" />
      <rect x="6" y="12" width="36" height="22" rx="6" fill="#3B82F6" />
      <circle cx="16" cy="21" r="4.2" fill="#fff" />
      <rect x="23" y="17.2" width="14" height="3.2" rx="1.6" fill="#fff" />
      <rect x="23" y="22.6" width="9" height="3" rx="1.5" fill="#DBEAFE" />
      <circle cx="35.5" cy="31.5" r="8" fill="#16A34A" />
      <path d="m31.8 31.6 2.3 2.3 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconScan() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
      <rect x="5" y="5" width="38" height="38" rx="12" fill="#0891B2" />
      <rect x="11" y="12" width="26" height="20" rx="4" fill="#fff" />
      <circle cx="19" cy="19" r="3" fill="#22D3EE" />
      <path d="M24 17.5h9M24 22h6" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 36.5h20" stroke="#CFFAFE" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="37" cy="12" r="7" fill="#F59E0B" />
      <path d="m37 8.6 1 2.3 2.4.2-1.9 1.6.6 2.4L37 13.8l-2.1 1.3.6-2.4-1.9-1.6 2.4-.2z" fill="#fff" />
    </svg>
  );
}

function IconShowcase() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
      <rect x="8" y="8" width="26" height="32" rx="6" fill="#C4B5FD" />
      <rect x="12" y="5" width="26" height="34" rx="7" fill="#7C3AED" />
      <rect x="16" y="9" width="18" height="12" rx="3" fill="#DDD6FE" />
      <circle cx="21" cy="14" r="2" fill="#7C3AED" />
      <path d="m16.5 20.5 4-4 3 3 6-6 4.5 7" fill="none" stroke="#7C3AED" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="16" y="24" width="14" height="2.4" rx="1.2" fill="#EDE9FE" />
      <rect x="16" y="28.5" width="9" height="2.4" rx="1.2" fill="#C4B5FD" />
      <circle cx="34" cy="33" r="8" fill="#F43F5E" />
      <path d="M34 37.2s-4.6-2.8-4.6-5.2a2.5 2.5 0 0 1 4.6-1.3 2.5 2.5 0 0 1 4.6 1.3c0 2.4-4.6 5.2-4.6 5.2z" fill="#fff" />
    </svg>
  );
}

function IconFamily() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
      <path d="M24 44s14-10.2 14-20.2C38 15.2 31.7 9 24 9S10 15.2 10 23.8C10 33.8 24 44 24 44z" fill="#059669" />
      <path d="M24 40.5s11.2-8.4 11.2-16.6C35.2 16.6 30.2 12 24 12s-11.2 4.6-11.2 11.9c0 8.2 11.2 16.6 11.2 16.6z" fill="#10B981" />
      <circle cx="24" cy="22.5" r="6.2" fill="#fff" />
      <circle cx="24" cy="20.6" r="2.2" fill="#047857" />
      <path d="M20.2 25.6c.7-1.6 2-2.4 3.8-2.4s3.1.8 3.8 2.4" fill="none" stroke="#047857" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconSms() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
      <path d="M10 8h26a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H22l-8 7v-7h-4a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" fill="#6D28D9" />
      <path d="M12 11h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22.5L16 36.2V31H12a4 4 0 0 1-4-4V15a4 4 0 0 1 4-4z" fill="#8B5CF6" />
      <rect x="15" y="17" width="16" height="2.6" rx="1.3" fill="#fff" />
      <rect x="15" y="22.2" width="11" height="2.6" rx="1.3" fill="#EDE9FE" />
      <circle cx="36.5" cy="14" r="7" fill="#F59E0B" />
      <path d="m36.5 10.6 1 2.3 2.4.2-1.9 1.6.6 2.4-2.1-1.3-2.1 1.3.6-2.4-1.9-1.6 2.4-.2z" fill="#fff" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
      <path d="M24 4 8 10.5v12.2c0 8.6 6 14.6 16 18.3 10-3.7 16-9.7 16-18.3V10.5L24 4z" fill="#0F766E" />
      <path d="M24 8.2 12 13.2v9.2c0 6.6 4.6 11.4 12 14.4 7.4-3 12-7.8 12-14.4v-9.2L24 8.2z" fill="#14B8A6" />
      <path d="m17.2 23.2 4.2 4.2 9-9.2" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ITEMS = [
  {
    id: "dcc",
    label: "디지털인증명함",
    icon: IconCard,
    action: () => window.dispatchEvent(new Event(LETTERING_OPEN_BIZCARD_SETTINGS_EVENT))
  },
  {
    id: "scan",
    label: "AI명함스캔",
    icon: IconScan,
    action: () => window.dispatchEvent(new Event(OPEN_BIZCARD_SCANNER_EVENT))
  },
  {
    id: "showcase",
    label: "SNS쇼케이스",
    icon: IconShowcase,
    action: () => window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT))
  },
  {
    id: "family",
    label: "가족위치",
    icon: IconFamily,
    action: () => window.dispatchEvent(new CustomEvent("vlue-open-location", { detail: { mode: "family" } }))
  },
  {
    id: "sms",
    label: "AI문자검사",
    icon: IconSms,
    action: () => window.dispatchEvent(new Event(OPEN_SMS_INBOX_EVENT))
  },
  {
    id: "patch",
    label: "안심패치",
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
      className={`mx-2.5 mt-2 shrink-0 rounded-2xl border px-1 py-3 shadow-sm ${
        isDarkMode ? "border-white/10 bg-[#111827]" : "border-gray-100 bg-white"
      }`}
      aria-label="바로가기"
    >
      <div className="grid grid-cols-3 gap-x-1 gap-y-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-1 active:scale-95"
            >
              <span className={`relative drop-shadow-[0_4px_6px_rgba(15,23,42,0.18)] ${item.id === "scan" ? "home-quick-scan" : ""}`}>
                <Icon />
                {item.id === "scan" ? <span className="home-quick-scan__line" aria-hidden /> : null}
                {item.patch ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-emerald-600 px-1.5 py-px text-[9px] font-black leading-tight text-white shadow-sm">
                    {patchComplete ? "완료" : "ON"}
                  </span>
                ) : null}
              </span>
              <span
                className={`max-w-full text-center text-[12px] font-extrabold leading-tight tracking-tight ${
                  isDarkMode ? "text-white" : "text-gray-950"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
