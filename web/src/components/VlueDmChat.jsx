import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackButton from "./common/BackButton";
import { getSupabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { vlueAuthHeaders, vlueAuthFetch } from "../lib/vlueAuthHeaders.js";
import { requirePrimaryForFeature } from "../lib/membershipAccessGuard.js";

function readMyUserId() {
  try {
    return localStorage.getItem("vlue_server_user_id") || "";
  } catch {
    return "";
  }
}

function mapApiMessage(m, myId) {
  if (m.messageType === "system") {
    return { id: m.id, type: "system", text: m.content, at: m.createdAt };
  }
  const mine = m.senderId === myId;
  return {
    id: m.id,
    type: mine ? "me" : "target",
    text: m.content,
    at: m.createdAt,
    senderName: m.senderName
  };
}

function mapRowFromRealtime(row, myId) {
  if (row.message_type === "system") {
    return { id: row.id, type: "system", text: row.content, at: row.created_at };
  }
  const mine = row.sender_id != null && row.sender_id === myId;
  return { id: row.id, type: mine ? "me" : "target", text: row.content, at: row.created_at };
}

function apiHeaders() {
  return vlueAuthHeaders();
}

export default function VlueDmChat() {
  const myId = readMyUserId();
  const [peers, setPeers] = useState([]);
  const [peersError, setPeersError] = useState("");
  const [peer, setPeer] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadError, setLoadError] = useState("");
  const [lastSaved, setLastSaved] = useState(null);
  const [vouchBusy, setVouchBusy] = useState("");
  const [vouchToast, setVouchToast] = useState("");
  const seenIds = useRef(new Set());
  const subRef = useRef(null);

  const supabaseOk = useMemo(() => isSupabaseConfigured(), []);

  const appendUnique = useCallback((row) => {
    if (seenIds.current.has(row.id)) return;
    seenIds.current.add(row.id);
    setMessages((prev) => {
      if (prev.some((m) => m.id === row.id)) return prev;
      return [...prev, row].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    });
  }, []);

  const loadPeers = useCallback(async () => {
    setPeersError("");
    if (!myId) {
      setPeersError("서버 사용자 ID가 없습니다. 온보딩·본인인증을 완료해 주세요.");
      return;
    }
    try {
      const res = await vlueAuthFetch("/api/chat/peers", { headers: apiHeaders() });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || res.statusText);
      }
      const data = await res.json();
      setPeers(data.users || []);
    } catch (e) {
      setPeersError(e.message || "목록을 불러오지 못했습니다.");
    }
  }, [myId]);

  useEffect(() => {
    loadPeers();
  }, [loadPeers]);

  useEffect(() => {
    return () => {
      if (subRef.current) {
        getSupabase()?.removeChannel(subRef.current);
        subRef.current = null;
      }
    };
  }, []);

  const sendVouchRequest = useCallback(
    async (e, u) => {
      e.stopPropagation();
      if (!myId) return;
      setVouchBusy(u.id);
      try {
        const res = await vlueAuthFetch("/api/vouch/request", {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ toUserId: u.id })
        });
        const j = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setVouchToast("이미 진행 중인 신뢰 인증 요청이 있습니다.");
        } else if (!res.ok) {
          throw new Error(j.error || res.statusText);
        } else {
          setVouchToast(`${u.displayName}님에게 신뢰 인증을 요청했습니다. 상대방은 앱 알림으로 확인할 수 있습니다.`);
        }
      } catch (err) {
        setVouchToast(err.message || "요청에 실패했습니다.");
      } finally {
        setVouchBusy("");
        setTimeout(() => setVouchToast(""), 4200);
      }
    },
    [myId]
  );

  const openThread = useCallback(
    async (p) => {
      setLoadError("");
      setLastSaved(null);
      setMessages([]);
      seenIds.current = new Set();
      setPeer(p);
      if (!myId) return;

      const access = await requirePrimaryForFeature("chat", {
        onBlocked: (msg) => setLoadError(msg)
      });
      if (!access.ok) return;

      let rid;
      try {
        const res = await vlueAuthFetch("/api/chat/rooms/open", {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ peerId: p.id })
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || res.statusText);
        }
        const data = await res.json();
        rid = data.roomId;
        setRoomId(rid);
      } catch (e) {
        setLoadError(e.message || "채팅방을 열 수 없습니다.");
        return;
      }

      try {
        const res = await vlueAuthFetch(`/api/chat/rooms/${rid}/messages`, { headers: apiHeaders() });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || res.statusText);
        }
        const data = await res.json();
        const list = (data.messages || []).map((m) => mapApiMessage(m, myId));
        list.forEach((m) => seenIds.current.add(m.id));
        setMessages(list);
        const last = list[list.length - 1];
        if (last?.id) {
          vlueAuthFetch(`/api/chat/rooms/${rid}/read`, {
            method: "POST",
            headers: apiHeaders(),
            body: JSON.stringify({ lastReadMessageId: last.id })
          }).catch(() => {});
        }
      } catch (e) {
        setLoadError(e.message || "메시지를 불러오지 못했습니다.");
      }

      const supabase = getSupabase();
      if (subRef.current) {
        supabase?.removeChannel(subRef.current);
        subRef.current = null;
      }
      if (!supabase) return;

      const channel = supabase
        .channel(`vlue-dm:${rid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${rid}` },
          (payload) => {
            const row = payload.new;
            if (!row) return;
            appendUnique(mapRowFromRealtime(row, myId));
          }
        )
        .subscribe();
      subRef.current = channel;
    },
    [myId, appendUnique]
  );

  const closeThread = useCallback(() => {
    if (subRef.current) {
      getSupabase()?.removeChannel(subRef.current);
      subRef.current = null;
    }
    setPeer(null);
    setRoomId(null);
    setMessages([]);
    setText("");
    setLoadError("");
    setLastSaved(null);
    seenIds.current = new Set();
  }, []);

  const send = useCallback(async () => {
    const t = text.trim();
    if (!t || !roomId || !myId) return;
    setText("");
    try {
      const res = await vlueAuthFetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ content: t, messageType: "normal" })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || res.statusText);
      const m = j.message;
      if (m?.id) {
        appendUnique({
          id: m.id,
          type: "me",
          text: m.content,
          at: m.createdAt
        });
        setLastSaved({ at: new Date().toISOString(), id: m.id, ok: true });
        vlueAuthFetch(`/api/chat/rooms/${roomId}/read`, {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ lastReadMessageId: m.id })
        }).catch(() => {});
      }
    } catch (e) {
      setLastSaved({ at: new Date().toISOString(), ok: false, err: e.message || "전송 실패" });
    }
  }, [roomId, myId, text, appendUnique]);

  if (!peer) {
    return (
      <section className="min-h-0 w-full flex-1 overflow-y-auto pb-24">
        <div className="pt-2 pb-3 text-[12px] text-gray-500 space-y-1">
          <p>
            <span className="font-normal text-gray-700">VLUE 회원 DM</span> — 가입된 사용자를 누르면 1:1 채팅이 열립니다. 오른쪽 「인증」으로 신뢰 인증(Vouch)을 요청할 수 있습니다.
          </p>
          {!myId && <p className="text-amber-700">로컬에 <code className="text-[11px]">vlue_server_user_id</code>가 없으면 전송·목록이 동작하지 않습니다.</p>}
          {!supabaseOk && <p className="text-amber-700">Supabase URL/anon 키가 없으면 Realtime은 꺼지고, API 저장만 됩니다 ( 환경변수 <code className="text-[11px]">VITE_SUPABASE_*</code> ).</p>}
        </div>
        {peersError && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{peersError}</div>}
        {vouchToast && (
          <div className="mb-2 rounded-xl border border-blue-100 bg-blue-50/90 px-3 py-2 text-[13px] text-blue-900">{vouchToast}</div>
        )}
        <ul className="border-t border-gray-100">
          {peers.map((u) => (
            <li key={u.id} className="flex items-stretch border-b border-gray-50">
              <button
                type="button"
                onClick={() => openThread(u)}
                className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-0 pr-1 text-left active:bg-blue-50/80"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-[14px] font-normal text-white">
                  {(u.displayName || "?").slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-normal text-[#111318]">{u.displayName}</span>
                  {u.email && <span className="block truncate text-[12px] font-normal text-[#65676b]">{u.email}</span>}
                </span>
              </button>
              <button
                type="button"
                disabled={vouchBusy === u.id}
                onClick={(e) => sendVouchRequest(e, u)}
                className="shrink-0 px-3 text-[12px] font-normal text-blue-600 disabled:opacity-40"
              >
                인증
              </button>
            </li>
          ))}
        </ul>
        {peers.length === 0 && !peersError && myId && (
          <p className="py-10 text-center text-[14px] text-gray-400">다른 회원이 없습니다. DB에 사용자를 추가한 뒤 다시 확인해 주세요.</p>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-1 min-h-0 flex-col bg-[linear-gradient(180deg,#f4f8ff_0%,#f8fbff_100%)]">
      <header className="flex shrink-0 items-center gap-1 border-b border-gray-100 bg-white/90 px-2 py-2 pt-[max(8px,env(safe-area-inset-top,0px))] backdrop-blur">
        <BackButton variant="inline" onBack={closeThread} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-normal text-gray-900">{peer.displayName}</p>
          <p className="truncate text-[11px] text-gray-400">room {roomId}</p>
        </div>
      </header>

      {loadError && <div className="mx-3 mt-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{loadError}</div>}

      <div className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((m) =>
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className="max-w-[92%] rounded-2xl bg-gray-100 px-3 py-2 text-center text-[12px] text-gray-600">{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex ${m.type === "me" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${
                  m.type === "me" ? "bg-blue-600 text-white" : "bg-white text-gray-900 shadow-sm ring-1 ring-gray-100"
                }`}
              >
                {m.text}
              </div>
            </div>
          )
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white/95 px-3 py-2 pb-6">
        {lastSaved && (
          <p className={`mb-1.5 text-[11px] ${lastSaved.ok ? "text-emerald-600" : "text-red-600"}`}>
            {lastSaved.ok
              ? `DB 저장 완료 · message id ${lastSaved.id} · ${new Date(lastSaved.at).toLocaleTimeString("ko-KR")}`
              : `저장 실패 — ${lastSaved.err}`}
          </p>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="메시지 입력"
            className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[15px] outline-none focus:border-blue-300"
          />
          <button
            type="button"
            onClick={send}
            disabled={!text.trim()}
            className="shrink-0 rounded-2xl bg-blue-600 px-4 py-2.5 text-[14px] font-normal text-white disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </div>
    </section>
  );
}
