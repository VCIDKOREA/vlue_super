import { useState } from "react";
import { Camera, Image as ImageIcon, MapPin, Users, Shield } from "lucide-react";
import ModalCloseButton from "./common/ModalCloseButton";
import {
  markRuntimePermissionsDone,
  requestAppRuntimePermissions
} from "../lib/appRuntimePermissions.js";
import { markContactSyncPending } from "../lib/contactSyncStorage.js";

const ITEMS = [
  {
    id: "contacts",
    icon: Users,
    title: "연락처",
    desc: "지인 찾기·친구 신청·미가입 추천에 사용합니다."
  },
  {
    id: "camera",
    icon: Camera,
    title: "카메라",
    desc: "명함 스캔·프로필·쇼케이스 촬영에 사용합니다."
  },
  {
    id: "photos",
    icon: ImageIcon,
    title: "사진첩",
    desc: "쇼케이스·디지털 명함 사진 등록에 사용합니다."
  },
  {
    id: "location",
    icon: MapPin,
    title: "위치",
    desc: "기관·업체 검색과 위치 기반 안내에 사용합니다."
  }
];

/**
 * 가입 후 최초 1회 — 시스템 허용 팝업을 실제로 연쇄 요청
 */
export default function AppRuntimePermissionsModal({ open, onClose, onContinueContacts }) {
  const [busy, setBusy] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  if (!open) return null;

  const finish = (goContacts) => {
    markRuntimePermissionsDone();
    if (goContacts) markContactSyncPending();
    onClose?.();
    if (goContacts) onContinueContacts?.();
  };

  const handleAllow = async () => {
    setBusy(true);
    setStatusNote("시스템 권한 창을 띄우는 중입니다. 모두 허용해 주세요.");
    try {
      const results = await requestAppRuntimePermissions();
      const missing = ITEMS.filter(
        (item) => results.requiredIds?.includes(item.id) && !results[item.id]
      ).map((item) => item.title);
      if (missing.length) {
        setStatusNote(
          results.native
            ? `아직 허용되지 않음: ${missing.join(" · ")}. 시스템 창에서 모두 허용한 뒤 다시 「허용하고 계속」을 눌러 주세요.`
            : `브라우저에서 ${missing.join(" · ")} 허용이 필요합니다. 주소 표시줄·팝업에서 허용해 주세요.`
        );
        setBusy(false);
        return;
      }
      setStatusNote("필수 권한이 허용되었습니다.");
      finish(true);
    } catch {
      setStatusNote("권한 요청 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  const handleLater = () => {
    finish(true);
  };

  return (
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-black/45 px-3 pb-6 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="runtime-perms-title"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <ModalCloseButton variant="default" onClick={handleLater} disabled={busy} />

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <Shield className="h-6 w-6 text-blue-600" aria-hidden />
        </div>

        <h2 id="runtime-perms-title" className="text-[18px] font-black text-gray-900" style={{ wordBreak: "keep-all" }}>
          VLUE 이용을 위해 접근을 허용해 주세요
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500" style={{ wordBreak: "keep-all" }}>
          허용을 누르면 시스템 권한 창이 이어서 표시됩니다. 연락처·카메라·사진첩·위치를 모두 허용해야 합니다.
        </p>

        <ul className="mt-4 space-y-2.5">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-black text-slate-900">{item.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500" style={{ wordBreak: "keep-all" }}>
                    {item.desc}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        {statusNote ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-snug text-amber-950" style={{ wordBreak: "keep-all" }}>
            {statusNote}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleAllow}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "권한 요청 중…" : "허용하고 계속"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleLater}
            className="w-full rounded-2xl border border-gray-200 py-3 text-[13px] font-bold text-gray-600 hover:bg-gray-50"
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  );
}
