import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isVlueKidsApp } from "../../lib/vlueKidsApp.js";
import {
  fetchJoinedProtectionGroups,
  fetchOwnedProtectionGroup,
  purchaseProtectionSlots,
  sendProtectionSos,
  setProtectionLocationSharing
} from "../../lib/familyProtectionApi.js";

export const SLOT_PRICE_KRW = 2500;

export function useFamilyMapFolders(enabled) {
  const [tab, setTab] = useState("owned");
  const [owned, setOwned] = useState(null);
  const [joined, setJoined] = useState([]);
  const [sharing, setSharing] = useState(true);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const [ownedRes, joinedRes] = await Promise.all([
        fetchOwnedProtectionGroup(),
        fetchJoinedProtectionGroups()
      ]);
      const group = ownedRes?.group || null;
      const groups = Array.isArray(joinedRes?.groups) ? joinedRes.groups : [];
      setOwned(group);
      setJoined(groups);
      const mine = groups.find((row) => row.myMembership);
      if (typeof mine?.myMembership?.isLocationSharing === "boolean") {
        setSharing(mine.myMembership.isLocationSharing);
      }
      setReady(true);
    } catch {
      setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    reload();
    const timer = window.setInterval(reload, 15000);
    return () => window.clearInterval(timer);
  }, [enabled, reload]);

  const visibleIds = useMemo(() => {
    if (tab === "owned") {
      return (owned?.members || []).map((member) => member.userId);
    }
    return joined.map((group) => group.ownerId);
  }, [tab, owned, joined]);

  return { tab, setTab, owned, joined, sharing, setSharing, ready, visibleIds, reload };
}

export function FamilyFolderSwitcher({ folders, dark, onNotice, expanded = false, onExpandedChange }) {
  const [payOpen, setPayOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const slots = folders.owned?.slots;
  const used = slots?.used ?? 0;
  const capacity = slots?.capacity ?? 0;
  const full = folders.tab === "owned" && Boolean(slots) && used >= capacity && !isVlueKidsApp();
  const tabBtn = (id, label) =>
    `min-w-0 flex-1 rounded-full px-2 py-2 text-[11px] font-black tracking-tight ${
      folders.tab === id
        ? "bg-[#00D2FF] text-[#04121a]"
        : dark
          ? "text-white/75"
          : "text-slate-600"
    }`;

  const pay = async () => {
    setBusy(true);
    try {
      const result = await purchaseProtectionSlots(count);
      await folders.reload();
      setPayOpen(false);
      onNotice?.(`보호 슬롯 ${result.added || count}명을 추가했습니다. 월 ${((result.added || count) * SLOT_PRICE_KRW).toLocaleString("ko-KR")}원`);
    } catch (err) {
      onNotice?.(err?.message || "슬롯 결제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        className={`pointer-events-auto absolute left-3 top-[calc(64px+env(safe-area-inset-top))] z-30 rounded-full px-3 py-1.5 text-[11px] font-black backdrop-blur-xl ${dark ? "border border-white/10 bg-[#0c1220]/80 text-white" : "border border-black/5 bg-white/90 text-slate-800"}`}
        onClick={() => onExpandedChange?.(true)}
      >
        가족 {folders.owned ? `${used}/${capacity}` : ""}
      </button>
    );
  }

  return (
    <>
      <div className={`pointer-events-auto absolute inset-x-3 top-[calc(64px+env(safe-area-inset-top))] z-30 rounded-[22px] p-1.5 backdrop-blur-xl ${dark ? "border border-white/10 bg-[#0c1220]/80" : "border border-black/5 bg-white/90"}`}>
        <div className="mb-1 flex justify-end px-1">
          <button type="button" className={`text-[11px] font-bold ${dark ? "text-white/70" : "text-slate-500"}`} onClick={() => onExpandedChange?.(false)}>
            접기
          </button>
        </div>
        <div className={`flex rounded-full p-0.5 ${dark ? "bg-white/5" : "bg-slate-100"}`}>
          <button type="button" className={tabBtn("owned", "")} onClick={() => folders.setTab("owned")}>
            📁 내가 보호하는 가족
          </button>
          <button type="button" className={tabBtn("ward", "")} onClick={() => folders.setTab("ward")}>
            📁 나를 보호하는 가족
          </button>
        </div>
        {folders.tab === "owned" ? (
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-2 pb-1">
            <p className={`text-[11px] font-bold ${dark ? "text-white" : "text-slate-800"}`}>
              {folders.owned
                ? `등록된 가족 ${used} / ${capacity}명`
                : "등록된 가족 0명 · 초대 코드를 먼저 만들어 주세요"}
            </p>
            {full ? (
              <button type="button" className="rounded-full bg-[#00D2FF] px-2.5 py-1 text-[10px] font-black text-[#04121a]" onClick={() => setPayOpen(true)}>
                + 보호자 추가하기 (월 {SLOT_PRICE_KRW.toLocaleString("ko-KR")}원/명)
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {payOpen && !isVlueKidsApp() ? (
        <div className="fixed inset-0 z-[640] flex items-end justify-center bg-black/50 p-4" onClick={() => setPayOpen(false)}>
          <div className={`w-full max-w-md rounded-3xl p-4 ${dark ? "bg-[#0c1220] text-white" : "bg-white text-slate-900"}`} onClick={(event) => event.stopPropagation()}>
            <p className="text-[16px] font-black">보호 슬롯 추가</p>
            <p className={`mt-1 text-[12px] ${dark ? "text-white/70" : "text-slate-500"}`}>
              1명당 월 {SLOT_PRICE_KRW.toLocaleString("ko-KR")}원. 결제 후 가족 보호 인원이 늘어납니다.
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <button type="button" className="h-9 w-9 rounded-full bg-slate-200 font-black text-slate-900" onClick={() => setCount((n) => Math.max(1, n - 1))}>−</button>
              <span className="text-[18px] font-black">{count}명</span>
              <button type="button" className="h-9 w-9 rounded-full bg-slate-200 font-black text-slate-900" onClick={() => setCount((n) => Math.min(10, n + 1))}>+</button>
            </div>
            <p className="mt-2 text-center text-[13px] font-bold">월 {(count * SLOT_PRICE_KRW).toLocaleString("ko-KR")}원</p>
            <button type="button" disabled={busy} className="mt-3 w-full rounded-2xl bg-[#00D2FF] py-3 text-[14px] font-black text-[#04121a] disabled:opacity-50" onClick={() => void pay()}>
              {busy ? "처리 중…" : "결제하고 슬롯 추가"}
            </button>
            <a href="https://www.vlue.kr/#pricing" target="_blank" rel="noreferrer" className="mt-2 block w-full py-2 text-center text-[12px] font-bold text-blue-600 underline">
              인증신청 요금 정책 보기
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function FamilyFolderPanels({
  folders,
  dark,
  members,
  glass,
  guidingUserId = "",
  onNavigateMember,
  onStopGuide
}) {
  const [sosBusy, setSosBusy] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const quiet = dark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-800";
  const chipOn = "bg-[#00D2FF] text-[#04121a]";

  const toggleShare = async () => {
    const next = !folders.sharing;
    folders.setSharing(next);
    try {
      await setProtectionLocationSharing(next);
    } catch {
      folders.setSharing(!next);
    }
  };

  const sos = async () => {
    setSosBusy(true);
    try {
      await sendProtectionSos();
    } catch {
      /* 보호자가 없어도 전화는 연다 */
    } finally {
      setSosBusy(false);
      window.location.href = "tel:112";
    }
  };

  const profiles = members.length ? members : [];
  const chipLimit = 4;
  const overflow = profiles.length > chipLimit;
  const visibleProfiles = overflow ? profiles.slice(0, chipLimit - 1) : profiles;
  const goToMember = (member) => {
    setRosterOpen(false);
    onNavigateMember?.(member);
  };
  const profileRow = (
    <div className="space-y-2">
      <ul className="flex gap-2 overflow-hidden pb-1">
        {visibleProfiles.map((member) => {
          const active = guidingUserId && guidingUserId === member.userId;
          return (
            <li key={member.userId || member.id} className="min-w-0 shrink">
              <button
                type="button"
                className={`max-w-[7.5rem] truncate rounded-2xl px-3 py-2 text-[11px] font-bold ${active ? chipOn : quiet}`}
                onClick={() => goToMember(member)}
              >
                {member.displayName || member.name || "가족"}
              </button>
            </li>
          );
        })}
        {overflow ? (
          <li className="shrink-0">
            <button
              type="button"
              className={`rounded-2xl px-3 py-2 text-[11px] font-black ${quiet}`}
              onClick={() => setRosterOpen(true)}
            >
              전체 {profiles.length}
            </button>
          </li>
        ) : null}
      </ul>
      {guidingUserId ? (
        <button
          type="button"
          className="w-full rounded-2xl bg-[#04121a] py-2.5 text-[13px] font-black text-white"
          onClick={() => onStopGuide?.()}
        >
          이동 종료
        </button>
      ) : null}
      {rosterOpen
        ? createPortal(
            <div className="fixed inset-0 z-[720] flex items-end bg-black/55" onClick={() => setRosterOpen(false)}>
              <div
                className={`max-h-[70vh] w-full overflow-y-auto rounded-t-[28px] px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 ${dark ? "bg-[#0c1220] text-white" : "bg-white text-slate-900"}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={`mx-auto mb-3 h-1 w-10 rounded-full ${dark ? "bg-white/20" : "bg-slate-200"}`} />
                <p className="text-[16px] font-black">가족 구성원</p>
                <p className={`mt-1 text-[12px] ${dark ? "text-white/60" : "text-slate-500"}`}>
                  이름을 누르면 그 위치로 이동합니다.
                </p>
                <ul className="mt-3 space-y-2">
                  {profiles.map((member) => {
                    const active = guidingUserId && guidingUserId === member.userId;
                    return (
                      <li key={member.userId || member.id}>
                        <button
                          type="button"
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left ${active ? chipOn : quiet}`}
                          onClick={() => goToMember(member)}
                        >
                          <span className="font-black">{member.displayName || member.name || "가족"}</span>
                          <span className="text-[11px] font-bold opacity-80">
                            {active ? "이동 중" : member.self ? "내 위치" : "이동"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {guidingUserId ? (
                  <button
                    type="button"
                    className="mt-3 w-full rounded-2xl bg-[#04121a] py-3 text-[14px] font-black text-white"
                    onClick={() => {
                      setRosterOpen(false);
                      onStopGuide?.();
                    }}
                  >
                    이동 종료
                  </button>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );

  if (folders.tab === "owned") {
    const rows = folders.owned?.members || [];
    return (
      <div className={`space-y-2 rounded-[24px] p-2.5 ${glass}`}>
        {profileRow}
        {!rows.length ? <p className="px-1 text-[11px] opacity-70">보호 중인 가족이 없습니다. 가족보호에서 초대 코드를 만들어 주세요.</p> : null}
      </div>
    );
  }

  return (
    <div className={`space-y-2 rounded-[24px] p-2.5 ${glass}`}>
      {profileRow}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-black">내 실시간 위치 공유</p>
        <button
          type="button"
          role="switch"
          aria-checked={folders.sharing}
          onClick={() => void toggleShare()}
          className={`relative h-7 w-12 rounded-full ${folders.sharing ? "bg-[#00D2FF]" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${folders.sharing ? "left-5" : "left-0.5"}`} />
        </button>
      </div>
      <ul className="max-h-32 space-y-1.5 overflow-y-auto">
        {folders.joined.length ? folders.joined.map((group) => (
          <li key={group.id} className={`rounded-2xl px-3 py-2 ${quiet}`}>
            <p className="text-[13px] font-black">{group.ownerName || "보호자"}</p>
            <p className="text-[10px] opacity-70">보호 중 · {group.slots?.used ?? 0}/{group.slots?.capacity ?? 4}명</p>
          </li>
        )) : <li className="text-[11px] opacity-70">나를 보호하는 가족이 없습니다.</li>}
      </ul>
      <button type="button" disabled={sosBusy} onClick={() => void sos()} className="w-full rounded-2xl bg-rose-500 py-3 text-[14px] font-black text-white disabled:opacity-60">
        {sosBusy ? "호출 중…" : "SOS 응급 호출"}
      </button>
    </div>
  );
}
