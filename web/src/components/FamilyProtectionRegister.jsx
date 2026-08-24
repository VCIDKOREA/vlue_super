import { useEffect, useMemo, useState } from "react";
import { requestGuardianPassImpUid } from "../lib/parentalConsentApi.js";
import { normalizeMembershipKind } from "../lib/membershipBm.js";
import { displayFamilyUser, useFamilyProtection } from "../hooks/useFamilyProtection.js";
import { lookupFamilyInviteCandidates } from "../lib/familyProtectionApi.js";
import MembershipUpgradeModal from "./MembershipUpgradeModal.jsx";
import FamilySecurityDashboard from "./FamilySecurityDashboard.jsx";
import FamilyMembersCircleModal from "./FamilyMembersCircleModal.jsx";
import { EXPAND_FAMILY_KEY } from "../lib/posDashboardConstants.js";

/** 친구검색 — 가족 보호 등록·알림 설정 (대버튼 탭 시 펼침) */
export default function FamilyProtectionRegister({ isDarkMode = false, prefillHandle = "", onToast }) {
  const [expanded, setExpanded] = useState(false);
  const [wardHandle, setWardHandle] = useState("");
  const [familyRelation, setFamilyRelation] = useState("parent");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [slotHint, setSlotHint] = useState("");
  const [circleOpen, setCircleOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHint, setSearchHint] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const fp = useFamilyProtection();

  const membershipTier = useMemo(() => {
    try {
      return normalizeMembershipKind(
        localStorage.getItem("vlue_membership_kind") || localStorage.getItem("vlue_membership_tier") || "free"
      );
    } catch {
      return "free";
    }
  }, [expanded, fp.data?.memberSlots?.memberCount]);

  const slots = fp.data?.memberSlots;
  const slotMax =
    slots?.isPaid === false ? slots?.baseMaxMembers || 4 : slots?.maxMembers > 0 ? slots.maxMembers : slots?.baseMaxMembers || 4;
  const slotCountRaw =
    slots?.memberCount ??
    1 + fp.asGuardian.filter((l) => l.status === "active" || l.status === "pending").length;
  const slotCount = slots?.isPaid === false ? 0 : slotCountRaw;
  const showExpandCta =
    slots?.needsExtension ||
    slots?.inviteBlockCode === "FAMILY_SLOT_LIMIT" ||
    slots?.inviteBlockCode === "FAMILY_SLOT_NEEDS_EXTENSION" ||
    slotHint.includes("추가");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(EXPAND_FAMILY_KEY) === "1") {
        setExpanded(true);
        sessionStorage.removeItem(EXPAND_FAMILY_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-indigo-100 bg-white";
  const sub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const strong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const inputCls = isDarkMode
    ? "border-white/15 bg-[#1f2937] text-gray-100"
    : "border-gray-200 bg-white text-gray-900";

  const toast = (text) => {
    const msg = String(text || "").trim();
    if (!msg) return;
    if (typeof onToast === "function") {
      onToast(msg);
      return;
    }
    fp.setMsg(msg);
    setTimeout(() => fp.setMsg(""), 3200);
  };

  const handleExpand = () => {
    setExpanded((v) => {
      const next = !v;
      if (next && prefillHandle && !wardHandle.trim()) {
        setWardHandle(String(prefillHandle).replace(/^@+/, ""));
      }
      return next;
    });
  };

  const onSearch = async () => {
    setSlotHint("");
    setSearchHint("");
    setSelectedCandidate(null);
    setCandidates([]);
    const q = wardHandle.trim();
    if (!q) {
      setSearchHint("아이디 또는 전화번호를 입력해 주세요.");
      return;
    }
    setSearchBusy(true);
    try {
      const data = await lookupFamilyInviteCandidates(q);
      const list = Array.isArray(data?.candidates) ? data.candidates : [];
      setCandidates(list);
      if (!list.length) {
        setSearchHint(data?.message || "일치하는 회원을 찾지 못했습니다.");
      } else if (list.length === 1 && !list[0].alreadyLinked) {
        setSelectedCandidate(list[0]);
      }
    } catch (e) {
      setSearchHint(e?.message || "조회에 실패했습니다.");
    } finally {
      setSearchBusy(false);
    }
  };

  const inviteTargetKey = (c) => String(c?.inviteKey || c?.publicHandle || "").trim();

  const onInviteCandidate = async (candidate) => {
    const target = candidate || selectedCandidate;
    const key = inviteTargetKey(target);
    if (!key) {
      setSlotHint("먼저 가족을 조회한 뒤 목록에서 선택해 주세요.");
      return;
    }
    if (target?.alreadyLinked) {
      setSlotHint("이미 등록·초대된 가족입니다.");
      return;
    }
    setSlotHint("");
    try {
      try {
        const text = await fp.addLink(key, familyRelation, undefined);
        setWardHandle("");
        setCandidates([]);
        setSelectedCandidate(null);
        setSearchHint("");
        toast(text);
        return;
      } catch (first) {
        if (familyRelation !== "child" || first?.code !== "GUARDIAN_PASS_REQUIRED") {
          throw first;
        }
        const guardianImpUid = await requestGuardianPassImpUid();
        const text = await fp.addLink(key, familyRelation, guardianImpUid);
        setWardHandle("");
        setCandidates([]);
        setSelectedCandidate(null);
        setSearchHint("");
        toast(text);
      }
    } catch (e) {
      const msg = e?.message || "등록 실패";
      setSlotHint(msg);
      toast(msg);
      if (e?.needsExtension || e?.code === "FAMILY_SLOT_NEEDS_EXTENSION" || e?.code === "FAMILY_SLOT_LIMIT") {
        setUpgradeOpen(true);
      }
    }
  };

  const onAdd = async () => {
    if (selectedCandidate || candidates.length === 1) {
      await onInviteCandidate(selectedCandidate || candidates[0]);
      return;
    }
    setSlotHint("조회 후 목록에서 가족을 선택한 뒤 초대해 주세요.");
  };

  const activeCount = fp.asGuardian.filter((l) => l.status === "active").length;
  const guide = fp.guide;
  const uiMode = fp.data?.uiMode || (fp.data?.canInviteFamily ? "guardian_full" : "guide_only");
  const showGuardianPanel = uiMode === "guardian_full";
  const showWardPanel = uiMode === "ward_only";
  const settingsBox = isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50/90";

  const relationLabel = (link) => {
    if (link?.familyRelation === "child") return "자녀";
    if (link?.familyRelation === "relative") return "가족";
    return "부모(노부모)";
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleExpand}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left shadow-md transition active:scale-[0.99] ${
          expanded
            ? isDarkMode
              ? "border-indigo-400/40 bg-gradient-to-r from-indigo-600/30 to-violet-600/25"
              : "border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600"
            : isDarkMode
              ? "border-indigo-500/30 bg-gradient-to-r from-indigo-700/40 to-violet-700/35"
              : "border-indigo-100 bg-gradient-to-r from-indigo-500 to-violet-500"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${expanded && !isDarkMode ? "text-indigo-100" : "text-indigo-100/90"}`}>
            Family Protection
          </p>
          <p className={`mt-0.5 text-[17px] font-black leading-tight ${expanded && !isDarkMode ? "text-white" : "text-white"}`}>
            가족 보호
          </p>
          <p className={`mt-1 text-[11px] leading-snug ${expanded && !isDarkMode ? "text-indigo-50/95" : "text-indigo-100/85"}`}>
            등록 · 알림 설정 · 보호 현황
            {activeCount > 0 ? ` · 보호 중 ${activeCount}명` : ""}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px] font-black ${
            isDarkMode ? "bg-white/15 text-white" : "bg-white/20 text-white"
          }`}
          aria-hidden
        >
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded ? (
        <div className={`mt-2 rounded-2xl border p-3 shadow-sm ${panel}`}>
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              isDarkMode ? "border-indigo-500/30 bg-indigo-500/10" : "border-indigo-200 bg-indigo-50/90"
            }`}
          >
            <p className={`text-[12px] font-black ${isDarkMode ? "text-indigo-100" : "text-indigo-950"}`}>
              가족 보호 이용 현황: {slotCount} / {slotMax} 명
            </p>
            <p className={`mt-1 text-[10px] leading-relaxed ${sub}`}>
              {slots?.isPaid === false
                ? "일반 회원은 가족 보호 초대가 불가합니다 (0명)."
                : slots?.extraMemberPackActive
                  ? "추가 인원 패키지 적용 · 최대 8명까지 등록 가능합니다."
                  : "유료 1:3 — 본인 포함 기본 4명. 5~8명은 추가 요금(인원 확장)이 필요합니다."}
            </p>
            {showExpandCta ? (
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="mt-2 w-full rounded-lg bg-violet-600 py-2.5 text-[12px] font-black text-white shadow-sm"
              >
                추가 인원 확장하기
              </button>
            ) : null}
          </div>

          {guide ? (
            <div className={`rounded-xl border px-3 py-2.5 ${isDarkMode ? "border-blue-500/20 bg-blue-500/10" : "border-blue-100 bg-blue-50/80"}`}>
              <p className={`text-[11px] font-bold ${isDarkMode ? "text-blue-200" : "text-blue-800"}`}>이용 방법</p>
              <p className={`mt-1 text-[11px] leading-relaxed ${sub}`}>{guide.summary}</p>
              <ol className={`mt-1.5 list-decimal space-y-0.5 pl-4 text-[10px] ${sub}`}>
                {(guide.steps || []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setCircleOpen(true)}
            className={`mt-3 w-full rounded-xl border py-2.5 text-[12px] font-black ${
              isDarkMode ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-100" : "border-indigo-200 bg-indigo-50 text-indigo-800"
            }`}
          >
            구성원 확인
          </button>

          {showWardPanel ? (
            <div className={`mt-3 rounded-xl border px-3 py-3 ${isDarkMode ? "border-emerald-500/25 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50/90"}`}>
              <p className={`text-[12px] font-black ${isDarkMode ? "text-emerald-100" : "text-emerald-900"}`}>가족 보호 수신 안내</p>
              <p className={`mt-1.5 text-[11px] leading-relaxed ${sub}`}>
                무료·유료 회원 모두 가족 보호 <span className="font-bold">초대를 받을 수</span> 있습니다.
                초대 수락·거절은 <span className="font-bold">푸시 알림·알림함</span>에서 처리하세요.
              </p>
              <p className={`mt-1.5 text-[11px] leading-relaxed ${sub}`}>
                가족을 <span className="font-bold">직접 등록·신청</span>하려면 유료 회원(VLUE 멤버십)이 필요합니다.
              </p>
            </div>
          ) : null}

          {!showGuardianPanel && uiMode === "guide_only" ? (
            <div className={`mt-3 rounded-xl border px-3 py-3 ${isDarkMode ? "border-amber-500/25 bg-amber-500/10" : "border-amber-100 bg-amber-50/90"}`}>
              <p className={`text-[12px] font-black ${isDarkMode ? "text-amber-100" : "text-amber-900"}`}>유료 회원 전용 — 가족 보호 신청</p>
              <p className={`mt-1.5 text-[11px] leading-relaxed ${sub}`}>
                부모·자녀·가족을 등록하고 보호 알림을 설정하려면 VLUE 유료 멤버십이 필요합니다.
                초대를 받은 경우에는 알림함에서 수락·거절할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="mt-2 w-full rounded-lg bg-violet-600 py-2.5 text-[12px] font-black text-white"
              >
                멤버십 안내
              </button>
            </div>
          ) : null}

          {showGuardianPanel ? (
          <div className={`mt-3 space-y-2.5`}>
            <div className={`rounded-xl border p-2.5 ${settingsBox}`}>
              <p className={`text-[11px] font-bold ${strong}`}>부모(노부모) 보호</p>
              <p className={`mt-0.5 text-[10px] leading-relaxed ${sub}`}>
                VLUE 비회원과 장시간 통화, 원격제어 앱, 112·119·금감원 등 정부·공공기관 통화 시 알림 (네이티브 연동)
              </p>
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>앱 미접속</span>
                <input type="checkbox" checked={fp.noAppEnabled} onChange={(e) => fp.setNoAppEnabled(e.target.checked)} />
              </label>
              {fp.noAppEnabled ? (
                <label className={`mt-1 block text-[10px] ${sub}`}>
                  미접속 (시간)
                  <input type="number" min={1} max={168} value={fp.noAppHours} onChange={(e) => fp.setNoAppHours(e.target.value)} className={`mt-0.5 w-full rounded-lg border px-2 py-1.5 text-[12px] ${inputCls}`} />
                </label>
              ) : null}
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>부재중 전화</span>
                <input type="checkbox" checked={fp.missedCallEnabled} onChange={(e) => fp.setMissedCallEnabled(e.target.checked)} />
              </label>
              {fp.missedCallEnabled ? (
                <label className={`mt-1 block text-[10px] ${sub}`}>
                  부재중 (통 이상)
                  <input type="number" min={1} max={20} value={fp.missedCallThreshold} onChange={(e) => fp.setMissedCallThreshold(e.target.value)} className={`mt-0.5 w-full rounded-lg border px-2 py-1.5 text-[12px] ${inputCls}`} />
                </label>
              ) : null}
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>비회원 장시간 통화</span>
                <input type="checkbox" checked={fp.elderLongCallEnabled} onChange={(e) => fp.setElderLongCallEnabled(e.target.checked)} />
              </label>
              {fp.elderLongCallEnabled ? (
                <label className={`mt-1 block text-[10px] ${sub}`}>
                  기준 (분)
                  <input type="number" min={3} max={180} value={fp.elderLongCallMinutes} onChange={(e) => fp.setElderLongCallMinutes(e.target.value)} className={`mt-0.5 w-full rounded-lg border px-2 py-1.5 text-[12px] ${inputCls}`} />
                </label>
              ) : null}
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>원격제어 앱 (팀뷰어 등)</span>
                <input type="checkbox" checked={fp.elderRemoteAppEnabled} onChange={(e) => fp.setElderRemoteAppEnabled(e.target.checked)} />
              </label>
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>정부·공공기관 통화</span>
                <input type="checkbox" checked={fp.elderGovCallEnabled} onChange={(e) => fp.setElderGovCallEnabled(e.target.checked)} />
              </label>
            </div>

            <div className={`rounded-xl border p-2.5 ${settingsBox}`}>
              <p className={`text-[11px] font-bold ${strong}`}>자녀 보호</p>
              <p className={`mt-0.5 text-[10px] leading-relaxed ${sub}`}>
                도박·유해·VPN·딥웹 사이트, 계좌 입출금(자녀 동의 후). 학폭 갈취·불법 입금 탐지용
              </p>
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>유해·도박·VPN 사이트</span>
                <input type="checkbox" checked={fp.childSiteEnabled} onChange={(e) => fp.setChildSiteEnabled(e.target.checked)} />
              </label>
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>계좌 입출금 알림</span>
                <input type="checkbox" checked={fp.childBankEnabled} onChange={(e) => fp.setChildBankEnabled(e.target.checked)} />
              </label>
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>모든 입출금 알림</span>
                <input type="checkbox" checked={fp.childBankAllTx} onChange={(e) => fp.setChildBankAllTx(e.target.checked)} />
              </label>
              {!fp.childBankAllTx ? (
                <label className={`mt-1 block text-[10px] ${sub}`}>
                  금액 기준 (원 이상)
                  <input type="number" min={1000} step={1000} value={fp.childBankThresholdKrw} onChange={(e) => fp.setChildBankThresholdKrw(e.target.value)} className={`mt-0.5 w-full rounded-lg border px-2 py-1.5 text-[12px] ${inputCls}`} />
                </label>
              ) : null}
              <label className={`mt-2 flex items-center justify-between text-[11px] ${sub}`}>
                <span>미등록 상대 입·출금</span>
                <input type="checkbox" checked={fp.childUnknownPayeeEnabled} onChange={(e) => fp.setChildUnknownPayeeEnabled(e.target.checked)} />
              </label>
            </div>

            <button
              type="button"
              disabled={fp.busy}
              onClick={async () => {
                try {
                  toast(await fp.saveSettings());
                } catch (e) {
                  toast(e?.message || "저장 실패");
                }
              }}
              className={`w-full rounded-lg border py-2.5 text-[12px] font-bold disabled:opacity-50 ${
                isDarkMode ? "border-blue-400/30 bg-blue-500/20 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              보호 설정 저장
            </button>
          </div>
          ) : null}

          {showGuardianPanel ? (
          <>
          <p className={`mt-3 text-[11px] font-bold ${strong}`}>가족 등록</p>
          {!fp.data?.canInviteFamily && fp.data?.inviteBlockReason ? (
            <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>
              {fp.data.inviteBlockReason}
            </p>
          ) : null}

          <p className={`mt-2 text-[10px] font-semibold ${sub}`}>관계 선택 · 부모·자녀는 보호 기능, 가족은 알림만</p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setFamilyRelation("parent")}
              className={`flex-1 rounded-xl py-2.5 text-[12px] font-black ${
                familyRelation === "parent"
                  ? "bg-indigo-600 text-white"
                  : isDarkMode
                    ? "bg-white/10 text-gray-400"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              부모
            </button>
            <button
              type="button"
              onClick={() => setFamilyRelation("child")}
              className={`flex-1 rounded-xl py-2.5 text-[12px] font-black ${
                familyRelation === "child"
                  ? "bg-violet-600 text-white"
                  : isDarkMode
                    ? "bg-white/10 text-gray-400"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              자녀
            </button>
            <button
              type="button"
              onClick={() => setFamilyRelation("relative")}
              className={`flex-1 rounded-xl py-2.5 text-[12px] font-black ${
                familyRelation === "relative"
                  ? "bg-emerald-600 text-white"
                  : isDarkMode
                    ? "bg-white/10 text-gray-400"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              가족
            </button>
          </div>

          <label className={`mt-3 block text-[11px] font-bold ${strong}`}>가족 VLUE 아이디 · 전화번호</label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="text"
              inputMode="text"
              autoComplete="tel"
              value={wardHandle}
              onChange={(e) => {
                setWardHandle(e.target.value);
                setSelectedCandidate(null);
                setCandidates([]);
                setSearchHint("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSearch();
                }
              }}
              placeholder="예: mom, @아이디, 010-1234-5678"
              className={`min-w-0 flex-1 rounded-xl border px-3 py-3 text-[13px] font-bold outline-none ${inputCls}`}
            />
            <button
              type="button"
              disabled={fp.busy || searchBusy || !wardHandle.trim() || !fp.data?.canInviteFamily}
              onClick={() => void onSearch()}
              className="shrink-0 rounded-xl bg-slate-800 px-4 text-[13px] font-black text-white disabled:opacity-50"
            >
              {searchBusy ? "조회 중…" : "조회"}
            </button>
          </div>
          <p className={`mt-1.5 text-[10px] leading-relaxed ${sub}`}>
            먼저 조회해 이름·아이디를 확인한 뒤 초대해 주세요. 잘못 초대되는 것을 막기 위함입니다.
          </p>

          {searchHint ? (
            <p className={`mt-2 text-[11px] font-semibold ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>
              {searchHint}
            </p>
          ) : null}

          {candidates.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              <p className={`text-[11px] font-bold ${strong}`}>조회 결과 · 초대할 가족을 선택</p>
              {candidates.map((c) => {
                const selected = selectedCandidate?.userId === c.userId;
                return (
                  <button
                    key={c.userId}
                    type="button"
                    disabled={c.alreadyLinked}
                    onClick={() => setSelectedCandidate(c)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                      c.alreadyLinked
                        ? isDarkMode
                          ? "border-white/5 bg-white/5 opacity-60"
                          : "border-gray-100 bg-gray-50 opacity-70"
                        : selected
                          ? isDarkMode
                            ? "border-blue-400/50 bg-blue-500/20"
                            : "border-blue-300 bg-blue-50"
                          : isDarkMode
                            ? "border-white/10 bg-white/5"
                            : "border-gray-100 bg-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-[13px] font-black ${strong}`}>{c.displayName}</p>
                      <p className={`mt-0.5 truncate text-[11px] ${sub}`}>
                        {c.publicHandle ? `@${c.publicHandle}` : "아이디 없음"}
                        {c.phoneMasked ? ` · ${c.phoneMasked}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${
                        c.alreadyLinked
                          ? isDarkMode
                            ? "bg-white/10 text-gray-400"
                            : "bg-gray-100 text-gray-500"
                          : selected
                            ? "bg-blue-600 text-white"
                            : isDarkMode
                              ? "bg-white/10 text-gray-300"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.alreadyLinked
                        ? c.linkStatus === "pending"
                          ? "초대 중"
                          : "등록됨"
                        : selected
                          ? "선택됨"
                          : "선택"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            disabled={
              fp.busy ||
              searchBusy ||
              !fp.data?.canInviteFamily ||
              (!selectedCandidate && candidates.length !== 1) ||
              Boolean(selectedCandidate?.alreadyLinked) ||
              (candidates.length === 1 && candidates[0].alreadyLinked)
            }
            onClick={() => void onAdd()}
            className="mt-3 w-full rounded-xl bg-blue-600 py-3.5 text-[14px] font-black text-white shadow-sm disabled:opacity-50"
          >
            {familyRelation === "child"
              ? "PASS 인증 후 자녀 초대"
              : familyRelation === "relative"
                ? "선택한 가족 초대 (알림 수신)"
                : "선택한 가족 초대 (승인 요청)"}
          </button>

            </>
          ) : null}

          {fp.loading && !fp.data ? (
            <p className={`mt-3 text-center text-[11px] ${sub}`}>불러오는 중…</p>
          ) : (
            <>
              {fp.bankConsentsWard?.length > 0 && (
                <div className="mt-3">
                  <p className={`text-[11px] font-bold ${strong}`}>계좌 모니터링 동의 요청</p>
                  {fp.bankConsentsWard.map((c) => (
                    <div key={c.id} className={`mt-1.5 rounded-xl border px-2.5 py-2 ${isDarkMode ? "border-amber-500/30 bg-amber-500/10" : "border-amber-200 bg-amber-50"}`}>
                      <p className={`text-[11px] font-semibold ${strong}`}>{c.accountLabel || "자녀 계좌"} 입출금 알림</p>
                      <p className={`mt-0.5 text-[10px] ${sub}`}>보호자가 요청했습니다. 동의 시 입출금 내역이 전달됩니다.</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" disabled={fp.busy} onClick={async () => { try { toast(await fp.respondBankConsent(c.linkId, true)); } catch (e) { toast(e?.message); } }} className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-[10px] font-bold text-white">동의</button>
                        <button type="button" disabled={fp.busy} onClick={async () => { try { toast(await fp.respondBankConsent(c.linkId, false)); } catch (e) { toast(e?.message); } }} className="flex-1 rounded-lg border border-gray-200 py-1.5 text-[10px] font-bold text-gray-600">거절</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {fp.asWard.length > 0 && (
                <div className="mt-3">
                  <p className={`text-[11px] font-bold ${strong}`}>받은 가족 보호 요청</p>
                  <p className={`mt-0.5 text-[10px] ${sub}`}>수락·거절은 푸시 알림 또는 알림함에서 처리하세요.</p>
                  {fp.asWard.map((link) => (
                    <div
                      key={link.id}
                      className={`mt-1.5 flex items-center justify-between rounded-xl border px-2.5 py-2 ${
                        isDarkMode ? "border-white/10" : "border-gray-100"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`truncate text-[12px] font-bold ${strong}`}>
                          {displayFamilyUser(link.guardianUser)} · {relationLabel(link)}
                        </p>
                        <p className={`text-[10px] ${sub}`}>
                          {link.status === "pending" ? "승인 대기 — 알림함에서 처리" : "보호 활성"}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${isDarkMode ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                        확인
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showGuardianPanel && fp.asGuardian.length > 0 && (
                <div className="mt-3">
                  <p className={`text-[11px] font-bold ${strong}`}>등록한 가족</p>
                  {fp.asGuardian.map((link) => (
                    <div
                      key={link.id}
                      className={`mt-1.5 flex items-center justify-between rounded-xl border px-2.5 py-2 ${
                        isDarkMode ? "border-white/10" : "border-gray-100"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`truncate text-[12px] font-bold ${strong}`}>
                          {displayFamilyUser(link.wardUser)} · {relationLabel(link)}
                        </p>
                        <p className={`text-[10px] ${sub}`}>
                          {link.status === "active"
                            ? link.familyRelation === "relative"
                              ? "알림 연결됨"
                              : "보호 중"
                            : "승인 대기"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        {link.status === "active" && link.familyRelation === "child" ? (
                          <button
                            type="button"
                            disabled={fp.busy}
                            onClick={async () => {
                              try {
                                toast(await fp.requestBankConsentForLink(link.id, "자녀 계좌"));
                              } catch (e) {
                                toast(e?.message || "요청 실패");
                              }
                            }}
                            className="rounded-lg bg-violet-600 px-2 py-1 text-[9px] font-bold text-white"
                          >
                            계좌 동의 요청
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={fp.busy}
                          onClick={async () => {
                            try {
                              toast(await fp.revokeLink(link.id));
                            } catch (e) {
                              toast(e?.message || "해지 실패");
                            }
                          }}
                          className="rounded-lg border border-red-200 px-2 py-1 text-[9px] font-bold text-red-600"
                        >
                          해지
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showGuardianPanel && fp.data ? (
                <FamilySecurityDashboard isDarkMode={isDarkMode} onToast={toast} />
              ) : null}

              {showGuardianPanel && fp.alerts.length > 0 && (
                <div className="mt-3">
                  <p className={`text-[11px] font-bold ${strong}`}>최근 보호 알림</p>
                  {fp.alerts.slice(0, 6).map((a) => (
                    <div
                      key={a.id}
                      className={`mt-1.5 rounded-xl border px-2.5 py-2 ${
                        isDarkMode ? "border-amber-500/20 bg-amber-500/10" : "border-amber-100 bg-amber-50/80"
                      }`}
                    >
                      <p className={`text-[12px] font-bold ${isDarkMode ? "text-amber-200" : "text-amber-900"}`}>{a.title}</p>
                      <p className={`mt-0.5 text-[11px] ${sub}`}>{a.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {fp.data?.degraded && !fp.data?.offlineDemo ? (
            <p className={`mt-2 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${isDarkMode ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              서버 일부 데이터를 불러오지 못했습니다. 데모 가족(엄마·동생)은 계속 표시됩니다.
            </p>
          ) : null}

          <p className={`mt-3 text-[9px] leading-snug ${sub}`}>
            앱 접속은 실행·화면 복귀 시에만 기록됩니다. 부재중 전화는 휴대폰 통화앱 연동 시 자동 집계됩니다.
          </p>

          {fp.msg ? (
            <p
              className={`mt-2 text-center text-[11px] font-semibold ${
                fp.data?.offlineDemo ? (isDarkMode ? "text-amber-300" : "text-amber-700") : "text-blue-600"
              }`}
            >
              {fp.msg}
            </p>
          ) : null}

          {slotHint ? (
            <p className={`mt-2 text-center text-[11px] font-bold ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
              {slotHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <FamilyMembersCircleModal open={circleOpen} onClose={() => setCircleOpen(false)} isDarkMode={isDarkMode} />

      <MembershipUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        membershipTier={membershipTier}
        isDarkMode={isDarkMode}
        onMembershipTierChange={() => {
          setUpgradeOpen(false);
          setSlotHint("");
        }}
      />
    </div>
  );
}
