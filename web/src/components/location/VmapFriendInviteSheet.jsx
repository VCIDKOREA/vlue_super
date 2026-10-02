import { useEffect, useMemo, useRef, useState } from "react";
import { fetchVmapFriends, inviteVmapFriends } from "../../lib/locationApi.js";

/**
 * V-Map 친구 초대 시트 — VLUE 수락 친구 목록 + 검색 선택
 */
export default function VmapFriendInviteSheet({
  open,
  roomId,
  dark = true,
  onClose,
  onInvited,
  onError
}) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!open || !roomId) return undefined;
    let cancelled = false;
    setLoading(true);
    setQuery("");
    setSelected(new Set());
    fetchVmapFriends(roomId)
      .then((data) => {
        if (cancelled) return;
        setFriends(Array.isArray(data.friends) ? data.friends : []);
      })
      .catch((error) => {
        if (!cancelled) onErrorRef.current?.(error?.message || "친구 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, roomId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => {
      const name = String(friend.displayName || "").toLowerCase();
      const handle = String(friend.publicHandle || "").toLowerCase();
      return name.includes(q) || handle.includes(q);
    });
  }, [friends, query]);

  const toggle = (userId, disabled) => {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const sendInvite = async () => {
    if (sending || !roomId || selected.size < 1) return;
    setSending(true);
    try {
      const data = await inviteVmapFriends(roomId, [...selected]);
      onInvited?.(data);
      onClose?.();
    } catch (error) {
      onError?.(error?.message || "초대를 보내지 못했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const panel = dark
    ? "border-white/10 bg-[#0c1220] text-white"
    : "border-black/10 bg-white text-slate-900";
  const field = dark
    ? "border-white/12 bg-white/10 text-white placeholder:text-white/40"
    : "border-black/10 bg-slate-50 text-slate-900 placeholder:text-slate-400";
  const row = dark ? "bg-white/5 hover:bg-white/10" : "bg-slate-50 hover:bg-slate-100";

  return (
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
                VLUE 친구를 검색해 선택하세요
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
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름 · 핸들 검색"
            className={`mt-3 w-full rounded-full border px-4 py-2.5 text-[14px] outline-none ${field}`}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {loading ? (
            <p className={`px-2 py-8 text-center text-[13px] ${dark ? "text-white/50" : "text-slate-500"}`}>
              친구 목록 불러오는 중…
            </p>
          ) : filtered.length === 0 ? (
            <p className={`px-2 py-8 text-center text-[13px] ${dark ? "text-white/50" : "text-slate-500"}`}>
              {friends.length ? "검색 결과가 없습니다." : "초대할 VLUE 친구가 없습니다."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((friend) => {
                const id = friend.userId;
                const on = selected.has(id);
                const disabled = Boolean(friend.inRoom);
                const initial = String(friend.displayName || "?").trim().slice(0, 1) || "?";
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggle(id, disabled)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition disabled:opacity-45 ${row} ${
                        on ? "ring-2 ring-[#00D2FF]" : ""
                      }`}
                    >
                      {friend.photoUrl ? (
                        <img
                          src={friend.photoUrl}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#083044] text-[15px] font-bold text-white">
                          {initial}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{friend.displayName}</span>
                        <span className={`block truncate text-[11px] ${dark ? "text-white/45" : "text-slate-500"}`}>
                          {disabled
                            ? "이미 참여 중"
                            : friend.publicHandle
                              ? `@${friend.publicHandle}`
                              : "VLUE 친구"}
                        </span>
                      </span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${
                          on
                            ? "bg-[#00D2FF] text-[#04121a]"
                            : dark
                              ? "border border-white/20 text-white/40"
                              : "border border-black/15 text-slate-300"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={`border-t px-4 py-3 ${dark ? "border-white/10" : "border-black/5"}`}>
          <button
            type="button"
            disabled={sending || selected.size < 1}
            onClick={() => void sendInvite()}
            className="w-full rounded-full bg-[#00D2FF] py-3 text-[14px] font-semibold text-[#04121a] disabled:opacity-50"
          >
            {sending
              ? "초대 보내는 중…"
              : selected.size
                ? `${selected.size}명 초대하기`
                : "친구를 선택하세요"}
          </button>
        </div>
      </div>
    </div>
  );
}
