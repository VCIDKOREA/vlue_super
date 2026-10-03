import { useEffect, useMemo, useRef, useState } from "react";
import { matchContactsWithVlue } from "../../lib/contactFriendsApi.js";
import { collectDeviceContactsForSync } from "../../lib/collectDeviceContacts.js";
import {
  hasContactSyncConsent,
  saveContactMatchCache,
  readContactMatchCache,
  setContactSyncConsent
} from "../../lib/contactSyncStorage.js";
import { mergeDeviceContactsCache } from "../../lib/contacts/deviceContactsCache.js";
import { readLetteringPermissionStatus } from "../../lib/letteringSettings.js";
import { inviteVmapFriends } from "../../lib/locationApi.js";
import { shareVmapInviteViaKakao, shareVmapInviteViaSms } from "../../lib/vmapInviteShare.js";
import ShareShowcaseChannelSheet from "../call/ShareShowcaseChannelSheet.jsx";

/**
 * V-Map 친구 초대 — 전화부 동기화 + 카톡/문자 초대링크 (쇼케이스 전달과 동일 UX)
 */
export default function VmapFriendInviteSheet({
  open,
  roomId,
  placeLabel = "",
  dark = true,
  onClose,
  onInvited,
  onError
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [channelOpen, setChannelOpen] = useState(false);
  const [channelBusy, setChannelBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const applyDeviceOnly = (contacts) => {
    const list = (contacts || [])
      .map((c, idx) => {
        const phoneE164 = String(c.phone || c.phoneE164 || "").trim();
        if (!phoneE164) return null;
        return {
          key: `d:${phoneE164}:${idx}`,
          kind: "unregistered",
          name: String(c.name || c.contactName || "연락처").trim() || "연락처",
          phone: phoneE164,
          phoneE164,
          userId: "",
          isFriend: false
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    setRows(list);
  };

  const applyMatch = (result) => {
    const registered = Array.isArray(result?.registered) ? result.registered : [];
    const unregistered = Array.isArray(result?.unregistered) ? result.unregistered : [];
    const list = [
      ...registered.map((user) => ({
        key: `r:${user.userId || user.phoneE164}`,
        kind: "registered",
        name: user.contactName || user.displayName || "친구",
        phone: user.phoneDisplay || user.phoneE164 || "",
        phoneE164: user.phoneE164 || "",
        userId: user.userId || "",
        isFriend: Boolean(user.isFriend)
      })),
      ...unregistered.map((row) => ({
        key: `u:${row.phoneE164}`,
        kind: "unregistered",
        name: row.contactName || "연락처",
        phone: row.phoneDisplay || row.phoneE164 || "",
        phoneE164: row.phoneE164 || "",
        userId: "",
        isFriend: false
      }))
    ].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    setRows(list);
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const cached = readContactMatchCache?.() || null;
      if (cached) applyMatch(cached);

      const contactsGranted = Boolean(readLetteringPermissionStatus()?.contacts);
      if (!contactsGranted && !hasContactSyncConsent()) {
        onErrorRef.current?.("주소록 권한을 허용한 뒤 다시 시도해 주세요.");
        setLoading(false);
        return;
      }

      const contacts = await collectDeviceContactsForSync({ allowDemoConfirm: false });
      if (!contacts?.length) {
        onErrorRef.current?.(
          contactsGranted
            ? "기기에 저장된 연락처가 없습니다."
            : "주소록 권한을 허용한 뒤 다시 시도해 주세요."
        );
        setLoading(false);
        return;
      }
      mergeDeviceContactsCache(contacts);
      try {
        const result = await matchContactsWithVlue(contacts);
        setContactSyncConsent(true);
        saveContactMatchCache(result);
        applyMatch(result);
      } catch (matchErr) {
        /* 매칭 API 실패해도 기기 연락처로는 카톡/문자 초대 가능 */
        applyDeviceOnly(contacts);
        onErrorRef.current?.(
          matchErr?.message
            ? `회원 매칭 실패 · 기기 연락처로 초대합니다 (${matchErr.message})`
            : "회원 매칭 실패 · 기기 연락처로 초대합니다"
        );
      }
    } catch (error) {
      onErrorRef.current?.(error?.message || "전화부 동기화에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !roomId) return undefined;
    setQuery("");
    setPending(null);
    setChannelOpen(false);
    void loadContacts();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s|-/g, "");
    if (!q) return rows;
    return rows.filter((row) => {
      const name = String(row.name || "").toLowerCase();
      const phone = String(row.phone || row.phoneE164 || "").toLowerCase().replace(/\s|-/g, "");
      return name.includes(q) || phone.includes(q);
    });
  }, [rows, query]);

  const openInvite = (row) => {
    setPending(row);
    setChannelOpen(true);
  };

  const runChannel = async (channel) => {
    if (!pending || !roomId || channelBusy) return;
    setChannelBusy(true);
    try {
      const toast = (msg) => onErrorRef.current?.(msg);
      const shareOpts = {
        roomId,
        placeLabel,
        phoneE164: pending.phoneE164,
        inviteeName: pending.name,
        omitInvitee: channel === "kakao",
        onToast: toast
      };
      const result =
        channel === "kakao"
          ? await shareVmapInviteViaKakao(shareOpts)
          : await shareVmapInviteViaSms(shareOpts);

      if (pending.userId && pending.isFriend) {
        try {
          await inviteVmapFriends(roomId, [pending.userId]);
        } catch {
          /* 링크 초대가 우선 — 푸시 실패는 무시 */
        }
      }

      if (result?.ok && !result?.cancelled) {
        onInvited?.({ invited: 1, channel: result.channel || channel });
      }
      setChannelOpen(false);
      setPending(null);
    } catch (error) {
      onErrorRef.current?.(error?.message || "초대를 보내지 못했습니다.");
    } finally {
      setChannelBusy(false);
    }
  };

  if (!open) return null;

  const panel = dark
    ? "border-white/10 bg-[#0c1220] text-white"
    : "border-black/10 bg-white text-slate-900";
  const field = dark
    ? "border-white/12 bg-white/10 text-white placeholder:text-white/40"
    : "border-black/10 bg-slate-50 text-slate-900 placeholder:text-slate-400";
  const rowCls = dark ? "bg-white/5 hover:bg-white/10" : "bg-slate-50 hover:bg-slate-100";

  return (
    <>
      <div
        className="fixed inset-0 z-[560] flex items-end justify-center bg-black/50 px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        onClick={onClose}
      >
        <div
          className={`mb-2 flex max-h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border shadow-2xl ${panel}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-4 pb-2 pt-3">
            <div className={`mx-auto mb-3 h-1 w-10 rounded-full ${dark ? "bg-white/20" : "bg-slate-200"}`} />
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[16px] font-semibold tracking-tight">친구 초대</p>
                <p className={`text-[12px] ${dark ? "text-white/55" : "text-slate-500"}`}>
                  전화부 연락처에서 카톡·문자로 초대합니다
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${dark ? "bg-white/10" : "bg-slate-100"}`}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름 · 전화번호 검색"
                className={`min-w-0 flex-1 rounded-full border px-4 py-2.5 text-[14px] outline-none ${field}`}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadContacts()}
                className="shrink-0 rounded-full bg-[#00D2FF] px-3 py-2 text-[12px] font-semibold text-[#04121a] disabled:opacity-50"
              >
                {loading ? "동기화…" : "동기화"}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
            {loading && rows.length === 0 ? (
              <p className={`px-2 py-8 text-center text-[13px] ${dark ? "text-white/50" : "text-slate-500"}`}>
                전화부 불러오는 중…
              </p>
            ) : filtered.length === 0 ? (
              <p className={`px-2 py-8 text-center text-[13px] ${dark ? "text-white/50" : "text-slate-500"}`}>
                {rows.length ? "검색 결과가 없습니다." : "전화부를 동기화하면 연락처가 표시됩니다."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {filtered.map((row) => {
                  const initial = String(row.name || "?").trim().slice(0, 1) || "?";
                  return (
                    <li key={row.key}>
                      <div className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 ${rowCls}`}>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#083044] text-[15px] font-bold text-white">
                          {initial}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">{row.name}</span>
                          <span className={`block truncate text-[11px] ${dark ? "text-white/45" : "text-slate-500"}`}>
                            {row.phone || "번호 없음"}
                            {row.kind === "registered" ? (row.isFriend ? " · VLUE 친구" : " · VLUE 회원") : ""}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openInvite(row)}
                          className="shrink-0 rounded-full bg-[#00D2FF] px-3 py-1.5 text-[12px] font-semibold text-[#04121a]"
                        >
                          초대
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ShareShowcaseChannelSheet
        open={channelOpen}
        busy={channelBusy}
        title="V-Map 초대 보내기"
        subtitle="카카오톡 또는 문자로 초대 링크를 보냅니다"
        smsHint="선택한 번호로 초대 문자를 보냅니다"
        onClose={() => {
          if (channelBusy) return;
          setChannelOpen(false);
          setPending(null);
        }}
        onPick={(channel) => void runChannel(channel)}
      />
    </>
  );
}
