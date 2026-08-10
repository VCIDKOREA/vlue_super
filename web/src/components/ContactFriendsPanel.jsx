import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { shareVlueContactInvite } from "../lib/contactInviteShare.js";
import { sendContactFriendRequest, matchContactsWithVlue } from "../lib/contactFriendsApi.js";
import { collectDeviceContactsForSync } from "../lib/collectDeviceContacts.js";
import {
  saveContactMatchCache,
  hasContactSyncConsent,
  setContactSyncConsent
} from "../lib/contactSyncStorage.js";
import { mergeDeviceContactsCache } from "../lib/contacts/deviceContactsCache.js";
import { upsertKnownPhonesFromFriends } from "../lib/contacts/knownPhonesIndex.js";
import { readLetteringPermissionStatus } from "../lib/letteringSettings.js";
import {
  CONTACT_CHOSUNG_INDEX,
  compareContactNames,
  contactNameBucket
} from "../lib/contactChosung.js";

const PAGE_SIZE = 20;

/**
 * 주소록 동기화 결과 — 가입자 [신청] / 미가입자 [추천]
 * 초성 ㄱ~ㅎ → EN 정렬 · 우측 인덱스 · 20명 페이지
 */
export default function ContactFriendsPanel({
  matchData,
  onMatchUpdate,
  onFriendAdded,
  onOpenChat,
  onResyncRequest,
  filterQuery = "",
  compact = false
}) {
  const [busyId, setBusyId] = useState(null);
  const [resyncing, setResyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [autoTried, setAutoTried] = useState(false);
  const [page, setPage] = useState(1);

  const registered = matchData?.registered || [];
  const unregistered = matchData?.unregistered || [];
  const contactsGranted = Boolean(readLetteringPermissionStatus()?.contacts);

  const rows = useMemo(() => {
    const q = String(filterQuery || "").trim().toLowerCase();
    const registeredRows = registered.map((user) => ({
      key: `reg:${user.userId}`,
      kind: "registered",
      name: user.displayName || user.contactName || "회원",
      subtitle: [user.publicHandle, user.phoneDisplay || user.contactName].filter(Boolean).join(" · ") || "VLUE 가입",
      user,
      bucket: contactNameBucket(user.displayName || user.contactName || "")
    }));
    const inviteRows = unregistered.map((row) => ({
      key: `inv:${row.phoneE164}`,
      kind: "unregistered",
      name: row.contactName || row.phoneDisplay || "연락처",
      subtitle: row.phoneDisplay || row.phoneE164 || "",
      row,
      bucket: contactNameBucket(row.contactName || row.phoneDisplay || "")
    }));
    let all = [...registeredRows, ...inviteRows];
    if (q) {
      all = all.filter((item) => {
        const hay = [item.name, item.subtitle, item.user?.publicHandle, item.row?.phoneDisplay]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    all.sort((a, b) => compareContactNames(a.name, b.name));
    return all;
  }, [registered, unregistered, filterQuery]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [filterQuery, registered.length, unregistered.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const bucketFirstPage = useMemo(() => {
    const map = {};
    rows.forEach((item, idx) => {
      const b = item.bucket || "#";
      if (map[b] == null) map[b] = Math.floor(idx / PAGE_SIZE) + 1;
    });
    return map;
  }, [rows]);

  const runSync = async ({ silent = false } = {}) => {
    if (!silent) setResyncing(true);
    setNotice("");
    try {
      const contacts = await collectDeviceContactsForSync({ allowDemoConfirm: false });
      if (!contacts?.length) {
        if (!silent) {
          setNotice(
            contactsGranted
              ? "기기에 저장된 연락처가 없거나 아직 불러오지 못했습니다. 다시 동기화를 눌러 주세요."
              : "주소록 권한을 허용한 뒤 다시 시도해 주세요."
          );
        }
        return false;
      }
      mergeDeviceContactsCache(contacts);
      const result = await matchContactsWithVlue(contacts);
      setContactSyncConsent(true);
      saveContactMatchCache(result);
      upsertKnownPhonesFromFriends({ contactMatchData: result });
      onMatchUpdate?.(result);
      if (!silent) {
        setNotice(
          `전화부 ${contacts.length}건 동기화 · 가입 ${result.registered?.length || 0} · 추천 ${(result.unregistered || []).length}`
        );
      }
      return true;
    } catch (e) {
      if (!silent) setNotice(e?.message || "동기화에 실패했습니다.");
      return false;
    } finally {
      if (!silent) setResyncing(false);
    }
  };

  useEffect(() => {
    if (matchData || autoTried) return;
    if (!contactsGranted && !hasContactSyncConsent()) return;
    setAutoTried(true);
    void runSync({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchData, contactsGranted, autoTried]);

  const handleResync = async () => {
    if (!hasContactSyncConsent() && !contactsGranted) {
      onResyncRequest?.();
      return;
    }
    await runSync({ silent: false });
  };

  const handleFriendRequest = async (user) => {
    setBusyId(user.userId);
    try {
      const res = await sendContactFriendRequest(
        user.userId,
        `${user.contactName || user.displayName}님, VLUE에서 연결해요.`
      );
      if (res.ok) {
        onFriendAdded?.({
          ...user,
          requestId: res.id,
          status: res.status || "pending"
        });
        onMatchUpdate?.({
          ...matchData,
          registered: registered.map((r) =>
            r.userId === user.userId ? { ...r, friendRequestPending: "sent" } : r
          )
        });
      } else if (res.reason === "already_friend") {
        window.alert("이미 친구입니다.");
      }
    } catch (e) {
      window.alert(e?.message || "친구 신청에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRecommend = async (row) => {
    setBusyId(row.phoneE164);
    try {
      const r = await shareVlueContactInvite({
        inviteeName: row.contactName,
        phoneE164: row.phoneE164
      });
      if (r.ok && !r.cancelled) {
        setNotice(`${row.contactName || "지인"}님에게 추천 공유를 열었습니다.`);
      }
    } finally {
      setBusyId(null);
    }
  };

  const jumpToBucket = (bucket) => {
    const p = bucketFirstPage[bucket];
    if (p) setPage(p);
  };

  const pageNumbers = useMemo(() => {
    const maxShow = 8;
    if (totalPages <= maxShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, page - Math.floor(maxShow / 2));
    let end = start + maxShow - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxShow + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  if (!matchData) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4 text-center">
        <p className="text-[13px] font-bold text-gray-800" style={{ wordBreak: "keep-all" }}>
          {autoTried || resyncing
            ? "전화부를 불러오는 수 없으면 아래 버튼으로 다시 시도해 주세요."
            : contactsGranted
              ? "주소록 권한이 허용되어 있습니다. 동기화하면 휴대폰 명단이 표시됩니다."
              : "전화부를 동기화하면 휴대폰에 저장된 명단이 표시됩니다."}
          <br />
          VLUE 사용 중이면 <span className="text-blue-700">신청</span>, 아니면{" "}
          <span className="text-violet-700">추천</span>으로 공유할 수 있습니다.
        </p>
        <button
          type="button"
          disabled={resyncing}
          onClick={() => {
            if (contactsGranted || hasContactSyncConsent()) void handleResync();
            else onResyncRequest?.();
          }}
          className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-black text-white disabled:opacity-60"
        >
          {resyncing ? "동기화 중…" : "전화부 동기화하기"}
        </button>
        {notice ? <p className="mt-2 text-[11px] font-bold text-rose-600">{notice}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!compact ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-black text-gray-700">
            전화부 명단 · 가입 {registered.length} · 추천 {unregistered.length}
          </p>
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
      ) : null}

      {notice ? <p className="text-center text-[11px] font-bold text-blue-600">{notice}</p> : null}

      {rows.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-3 py-6 text-center text-[12px] text-gray-500">
          표시할 연락처가 없습니다.
        </p>
      ) : (
        <div className="contact-friends-list-wrap relative flex gap-1">
          <div className="min-w-0 flex-1 space-y-2">
            <ul className="space-y-2">
              {pageRows.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-gray-900">{item.name}</p>
                    <p className="truncate text-[11px] text-gray-500">{item.subtitle}</p>
                  </div>
                  {item.kind === "registered" ? (
                    item.user.isFriend ? (
                      <button
                        type="button"
                        onClick={() => onOpenChat?.(item.user)}
                        className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700"
                      >
                        채팅
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === item.user.userId || item.user.friendRequestPending === "sent"}
                        onClick={() => handleFriendRequest(item.user)}
                        className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50"
                      >
                        {item.user.friendRequestPending === "sent" ? "신청됨" : "신청"}
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === item.row.phoneE164}
                      onClick={() => handleRecommend(item.row)}
                      className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50"
                    >
                      추천
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <nav
              className="contact-friends-pager flex flex-wrap items-center justify-center gap-0 pt-2 pb-1"
              aria-label="주소록 페이지"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded px-1 py-1 text-[12px] font-black text-gray-700 disabled:opacity-30"
                aria-label="이전 페이지"
              >
                ◀
              </button>
              {pageNumbers.map((n, idx) => (
                <span key={n} className="inline-flex items-center">
                  {idx > 0 ? <span className="text-[11px] font-bold text-gray-400">.</span> : null}
                  <button
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-[1.1rem] rounded px-0.5 py-1 text-[11px] font-black ${
                      n === page ? "text-blue-600 underline" : "text-gray-600"
                    }`}
                  >
                    {n}
                  </button>
                </span>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded px-1 py-1 text-[12px] font-black text-gray-700 disabled:opacity-30"
                aria-label="다음 페이지"
              >
                ▶
              </button>
            </nav>
            <p className="text-center text-[10px] font-semibold text-gray-400">
              {rows.length}명 · {page}/{totalPages}페이지 · {PAGE_SIZE}명씩
            </p>
          </div>

          <aside
            className="contact-friends-index sticky top-2 flex max-h-[70vh] shrink-0 flex-col items-center justify-start gap-px overflow-y-auto py-1 pl-0.5 pr-0"
            aria-label="초성 인덱스"
          >
            {CONTACT_CHOSUNG_INDEX.map((letter) => {
              const enabled = bucketFirstPage[letter] != null;
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!enabled}
                  onClick={() => jumpToBucket(letter)}
                  className={`min-h-[14px] w-5 rounded text-[9px] font-black leading-none ${
                    enabled
                      ? "text-blue-600 active:bg-blue-50"
                      : "text-gray-300"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </aside>
        </div>
      )}
    </div>
  );
}
