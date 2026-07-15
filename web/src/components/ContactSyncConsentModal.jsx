import { useState } from "react";
import { Users, Shield } from "lucide-react";
import ModalCloseButton from "./common/ModalCloseButton";
import { matchContactsWithVlue, recordContactSyncConsent } from "../lib/contactFriendsApi.js";
import { setContactSyncConsent, saveContactMatchCache } from "../lib/contactSyncStorage.js";
import { mergeDeviceContactsCache } from "../lib/contacts/deviceContactsCache.js";
import { upsertKnownPhonesFromFriends } from "../lib/contacts/knownPhonesIndex.js";
import { collectDeviceContactsForSync } from "../lib/collectDeviceContacts.js";
import {
  openNativeAppSettings,
  readLetteringPermissionStatus,
  requestLetteringPermissions
} from "../lib/letteringSettings.js";

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function ContactSyncConsentModal({ open, onClose, onSynced }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const runSync = async (contacts) => {
    setBusy(true);
    setError("");
    try {
      await recordContactSyncConsent().catch(() => {});
      mergeDeviceContactsCache(contacts);
      const result = await matchContactsWithVlue(contacts);
      setContactSyncConsent(true);
      saveContactMatchCache(result);
      upsertKnownPhonesFromFriends({ contactMatchData: result });
      onSynced?.(result);
      onClose?.();
    } catch (e) {
      setError(e?.message || "연락처 동기화에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleAgree = async () => {
    setBusy(true);
    setError("");
    try {
      let contacts = await collectDeviceContactsForSync({ allowDemoConfirm: false });
      if (contacts?.length) {
        await runSync(contacts);
        return;
      }

      const status = readLetteringPermissionStatus();
      if (!status?.contacts) {
        const kick = requestLetteringPermissions();
        if (kick?.ok) {
          setError("주소록 권한 창에서 허용해 주세요. 허용 후 자동으로 다시 시도합니다…");
          await sleep(1800);
          for (let i = 0; i < 8; i++) {
            await sleep(700);
            const st = readLetteringPermissionStatus();
            if (st?.contacts) break;
          }
          contacts = await collectDeviceContactsForSync({ allowDemoConfirm: false });
          if (contacts?.length) {
            await runSync(contacts);
            return;
          }
        }
        openNativeAppSettings();
        setError("설정에서 「연락처(주소록)」 권한을 허용한 뒤 다시 「전화부 동기화 동의」를 눌러 주세요.");
        return;
      }

      setError("가져온 연락처가 없습니다. 기기에 저장된 번호가 있는지 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = () => {
    setContactSyncConsent(false);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 px-3 pb-6 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-sync-title"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <ModalCloseButton variant="default" onClick={handleDecline} disabled={busy} />

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <Users className="h-6 w-6 text-blue-600" aria-hidden />
        </div>

        <h2 id="contact-sync-title" className="text-[18px] font-black text-gray-900" style={{ wordBreak: "keep-all" }}>
          전화부를 동기화해 지인을 찾고 VLUE를 추천하세요
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500" style={{ wordBreak: "keep-all" }}>
          휴대폰에 저장된 명단을 불러옵니다. VLUE를 쓰는 번호는 <b>신청</b>, 아직 미가입이면 <b>추천</b>으로
          카톡·문자 공유가 가능합니다.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-[11px] text-gray-600">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span style={{ wordBreak: "keep-all" }}>
            연락처 원본은 기기에만 남고, 매칭에 필요한 번호만 암호화 전송됩니다.
          </span>
        </div>

        {error ? <p className="mt-3 text-center text-[12px] font-bold text-rose-600">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleAgree}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "동기화 중…" : "전화부 동기화 동의"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleDecline}
            className="w-full rounded-2xl border border-gray-200 py-3 text-[13px] font-bold text-gray-600 hover:bg-gray-50"
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  );
}
