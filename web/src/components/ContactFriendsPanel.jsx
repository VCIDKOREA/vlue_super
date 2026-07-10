import { useState } from "react";
import { UserCheck, UserPlus, ArrowUpRight, RefreshCw } from "lucide-react";
import { shareVlueContactInvite } from "../lib/contactInviteShare.js";
import { sendContactFriendRequest } from "../lib/contactFriendsApi.js";
import { pickDeviceContacts, isContactPickerSupported, getDemoContacts } from "../lib/contactDevicePicker.js";
import { matchContactsWithVlue } from "../lib/contactFriendsApi.js";
import { saveContactMatchCache, hasContactSyncConsent } from "../lib/contactSyncStorage.js";
import { mergeDeviceContactsCache } from "../lib/contacts/deviceContactsCache.js";
import { upsertKnownPhonesFromFriends } from "../lib/contacts/knownPhonesIndex.js";

export default function ContactFriendsPanel({
  matchData,
  onMatchUpdate,
  onFriendAdded,
  onOpenChat,
  onResyncRequest
}) {
  const [busyId, setBusyId] = useState(null);
  const [resyncing, setResyncing] = useState(false);

  const registered = matchData?.registered || [];
  const unregistered = matchData?.unregistered || [];

  const handleResync = async () => {
    if (!hasContactSyncConsent()) {
      onResyncRequest?.();
      return;
    }
    setResyncing(true);
    try {
      let contacts = await pickDeviceContacts();
      if (!contacts?.length && !isContactPickerSupported()) {
        contacts = getDemoContacts();
      }
      if (!contacts?.length) return;
      mergeDeviceContactsCache(contacts);
      const result = await matchContactsWithVlue(contacts);
      saveContactMatchCache(result);
      upsertKnownPhonesFromFriends({ contactMatchData: result });
      onMatchUpdate?.(result);
    } finally {
      setResyncing(false);
    }
  };

  const handleFriendRequest = async (user) => {
    setBusyId(user.userId);
    try {
      const res = await sendContactFriendRequest(
        user.userId,
        `${user.contactName}님, VLUE에서 연결해요.`
      );
      if (res.ok) onFriendAdded?.(user);
      onMatchUpdate?.({
        ...matchData,
        registered: registered.map((r) =>
          r.userId === user.userId ? { ...r, friendRequestPending: "sent" } : r
        )
      });
    } catch (e) {
      window.alert(e?.message || "친구 신청에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const handleInvite = async (row) => {
    setBusyId(row.phoneE164);
    try {
      await shareVlueContactInvite({ inviteeName: row.contactName, phoneE164: row.phoneE164 });
    } finally {
      setBusyId(null);
    }
  };

  if (!matchData) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4 text-center">
        <p className="text-[13px] font-bold text-gray-800" style={{ wordBreak: "keep-all" }}>
          주소록을 연동하면 VLUE 가입 지인을 자동으로 찾아드립니다.
        </p>
        <button
          type="button"
          onClick={() => onResyncRequest?.()}
          className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-black text-white"
        >
          연락처 동기화하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-black text-gray-700">주소록 기반 친구</p>
        <button
          type="button"
          disabled={resyncing}
          onClick={handleResync}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-600"
        >
          <RefreshCw className={`h-3 w-3 ${resyncing ? "animate-spin" : ""}`} aria-hidden />
          다시 동기화
        </button>
      </div>

      <section>
        <div className="mb-2 flex items-center gap-1.5">
          <UserCheck className="h-4 w-4 text-emerald-600" aria-hidden />
          <h3 className="text-[13px] font-black text-gray-900">이미 가입한 비즈니스 친구</h3>
          <span className="text-[11px] text-gray-400">({registered.length})</span>
        </div>
        {registered.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-3 py-4 text-center text-[12px] text-gray-500">
            주소록 중 VLUE 가입자가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {registered.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black text-gray-900">{user.displayName}</p>
                  <p className="text-[11px] text-gray-500">
                    {user.publicHandle || user.contactName} · 가입 완료
                  </p>
                </div>
                {user.isFriend ? (
                  <button
                    type="button"
                    onClick={() => onOpenChat?.(user)}
                    className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white"
                  >
                    메일톡
                  </button>
                ) : user.friendRequestPending === "sent" ? (
                  <span className="text-[11px] font-bold text-amber-600">신청됨</span>
                ) : user.friendRequestPending === "received" ? (
                  <span className="text-[11px] font-bold text-blue-600">수락 대기</span>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === user.userId}
                    onClick={() => handleFriendRequest(user)}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                  >
                    친구 신청
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-1.5">
          <UserPlus className="h-4 w-4 text-violet-600" aria-hidden />
          <h3 className="text-[13px] font-black text-gray-900">VLUE에 추천/초대하기</h3>
          <span className="text-[11px] text-gray-400">({unregistered.length})</span>
        </div>
        {unregistered.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-3 py-4 text-center text-[12px] text-gray-500">
            초대할 미가입 연락처가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {unregistered.map((row) => (
              <div
                key={row.phoneE164}
                className="flex items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black text-gray-900">{row.contactName}</p>
                  <p className="text-[11px] text-gray-500">{row.phoneDisplay}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === row.phoneE164}
                  onClick={() => handleInvite(row)}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                >
                  추천하기
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
