import { useCallback, useEffect, useState } from "react";
import {
  FIVE_WAY_SOURCES,
  fetchFiveWayProfile,
  patchFiveWayProfile,
  readCachedFiveWayProfile
} from "../../lib/fiveWayProfile.js";
import { VLUE_NICKNAME_MAX } from "../../lib/memberCardStorage.js";
import { fileToFittedAvatarDataUrl, writeProfilePhoto } from "../../lib/vlueAvatar.js";
import { startSocialOAuthLink } from "../../lib/socialAccountLinkApi.js";

const SOURCE_ACCENT = {
  kakao: "border-[#FEE500] bg-[#FEE500]/20",
  naver: "border-[#03C75A] bg-[#03C75A]/15",
  google: "border-slate-300 bg-white",
  instagram: "border-pink-400 bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-600/20",
  vlue: "border-blue-500 bg-blue-500/10"
};

/**
 * 5-Way 프로필 슬롯 + 상대방 표기 방식
 */
export default function FiveWayProfilePanel({ isDarkMode = false, onToast }) {
  const [state, setState] = useState(() => readCachedFiveWayProfile());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [vlueNick, setVlueNick] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await fetchFiveWayProfile();
      setState(next);
      const vlue = (next.slots || []).find((s) => s.source === "vlue");
      setVlueNick(String(vlue?.nickname || next.activeNickname || "").trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toast = (msg) => {
    if (typeof onToast === "function") onToast(msg);
  };

  const selectSource = async (source, selectable, linked) => {
    if (!selectable) {
      if (!linked) {
        try {
          setBusy(`link:${source}`);
          const url = await startSocialOAuthLink(source);
          window.location.href = url;
        } catch (e) {
          toast(e instanceof Error ? e.message : "연동을 시작할 수 없습니다.");
        } finally {
          setBusy("");
        }
      }
      return;
    }
    if (state?.activeProfileSource === source) return;
    setBusy(`src:${source}`);
    setError("");
    try {
      const next = await patchFiveWayProfile({ activeProfileSource: source });
      setState(next);
      toast(`${FIVE_WAY_SOURCES.find((s) => s.id === source)?.label || source} 프로필로 전환했습니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "전환 실패");
    } finally {
      setBusy("");
    }
  };

  const setDisplayMode = async (mode) => {
    if (state?.displayNameMode === mode) return;
    setBusy(`mode:${mode}`);
    try {
      const next = await patchFiveWayProfile({ displayNameMode: mode });
      setState(next);
      toast(mode === "legal" ? "실명으로 표시합니다." : "닉네임으로 표시합니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "표기 방식 변경 실패");
    } finally {
      setBusy("");
    }
  };

  const saveVlueNickname = async () => {
    const nick = String(vlueNick || "").trim().slice(0, VLUE_NICKNAME_MAX);
    if (!nick) {
      toast("닉네임을 입력해 주세요.");
      return;
    }
    if (state?.vlueNicknameLocked) {
      toast("VLUE 프로필 닉네임은 최초 1회만 설정할 수 있습니다.");
      return;
    }
    setBusy("vlue-nick");
    try {
      const next = await patchFiveWayProfile({
        activeProfileSource: "vlue",
        vlueNickname: nick
      });
      setState(next);
      toast("VLUE 프로필 닉네임이 저장되었습니다. (이후 변경 불가)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy("");
    }
  };

  const onVluePhoto = async (file) => {
    if (!file) return;
    setBusy("vlue-photo");
    try {
      const url = await fileToFittedAvatarDataUrl(file);
      writeProfilePhoto(url);
      const next = await patchFiveWayProfile({
        activeProfileSource: "vlue",
        ...( /^https?:\/\//i.test(url) ? { vluePhotoUrl: url } : {})
      });
      setState(next);
      toast("VLUE 프로필 사진을 저장했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진 업로드 실패");
    } finally {
      setBusy("");
    }
  };

  const box = isDarkMode
    ? "rounded-2xl border border-white/10 bg-[#151821] p-4"
    : "rounded-2xl border border-slate-200 bg-white p-4";
  const title = isDarkMode ? "text-gray-100" : "text-slate-900";
  const muted = isDarkMode ? "text-gray-400" : "text-slate-500";
  const slotBase = isDarkMode
    ? "rounded-xl border px-2.5 py-2 text-left transition disabled:opacity-45"
    : "rounded-xl border px-2.5 py-2 text-left transition disabled:opacity-45";

  const slots = state?.slots || FIVE_WAY_SOURCES.map((s) => ({
    source: s.id,
    label: s.label,
    linked: s.id === "vlue",
    selectable: s.id === "vlue",
    nickname: "",
    photoUrl: "",
    isActive: false,
    isDefault: false
  }));

  return (
    <div className={box}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className={`text-[14px] font-black ${title}`}>5-Way 프로필</h3>
          <p className={`mt-1 text-[11px] leading-snug ${muted}`}>
            연동된 소셜·VLUE 프로필 중 하나를 선택하면 앱 전체 사진·닉네임에 반영됩니다. DCC 명함은 본인인증
            실명으로 고정됩니다.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || Boolean(busy)}
          onClick={() => void refresh()}
          className={
            isDarkMode
              ? "shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-[10px] font-bold text-gray-300"
              : "shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600"
          }
        >
          새로고침
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const active = Boolean(slot.isActive);
          const accent = SOURCE_ACCENT[slot.source] || SOURCE_ACCENT.vlue;
          return (
            <button
              key={slot.source}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void selectSource(slot.source, slot.selectable, slot.linked)}
              className={`${slotBase} ${
                active
                  ? `${accent} ring-2 ring-blue-500`
                  : isDarkMode
                    ? "border-white/10 bg-white/5"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {slot.photoUrl ? (
                  <img
                    src={slot.photoUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover bg-slate-200"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const fallback = el.nextElementSibling;
                      if (fallback) fallback.hidden = false;
                    }}
                  />
                ) : null}
                <span
                  hidden={Boolean(slot.photoUrl)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                    isDarkMode ? "bg-white/10 text-gray-200" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {(slot.label || "?").slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[11px] font-black ${title}`}>
                    {slot.label}
                    {slot.isDefault ? (
                      <span className={`ml-1 text-[9px] font-bold ${muted}`}>기본</span>
                    ) : null}
                  </p>
                  <p className={`truncate text-[10px] ${muted}`}>
                    {!slot.linked && slot.source !== "vlue"
                      ? "연동 필요 · 탭하여 연동"
                      : slot.nickname || "닉네임 없음"}
                  </p>
                </div>
              </div>
              {active ? (
                <p className="mt-1 text-[9px] font-black text-blue-500">선택됨</p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
        <p className={`text-[12px] font-black ${title}`}>상대방에게 표기 방식</p>
        <p className={`mt-1 text-[10px] ${muted}`}>빅푸시 · 탭로고 · V-Map 등 (DCC 명함 제외)</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void setDisplayMode("legal")}
            className={`rounded-xl px-3 py-2.5 text-[12px] font-black ${
              state?.displayNameMode === "legal"
                ? "bg-blue-600 text-white"
                : isDarkMode
                  ? "bg-white/5 text-gray-200"
                  : "bg-slate-100 text-slate-800"
            }`}
          >
            이름(실명)으로 표시
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void setDisplayMode("nickname")}
            className={`rounded-xl px-3 py-2.5 text-[12px] font-black ${
              state?.displayNameMode !== "legal"
                ? "bg-blue-600 text-white"
                : isDarkMode
                  ? "bg-white/5 text-gray-200"
                  : "bg-slate-100 text-slate-800"
            }`}
          >
            닉네임으로 표시
          </button>
        </div>
        <p className={`mt-2 text-[10px] ${muted}`}>
          미리보기: <span className={`font-bold ${title}`}>{state?.publicDisplayName || "—"}</span>
          {state?.legalName ? (
            <>
              {" "}
              · DCC 실명: <span className={`font-bold ${title}`}>{state.legalName}</span>
            </>
          ) : null}
        </p>
      </div>

      {state?.activeProfileSource === "vlue" || slots.find((s) => s.source === "vlue")?.isActive ? (
        <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
          <p className={`text-[12px] font-black ${title}`}>VLUE 프로필 편집</p>
          <label className={`mt-2 block text-[11px] font-bold ${muted}`}>
            닉네임 {state?.vlueNicknameLocked ? "(확정 · 변경 불가)" : "(최초 1회만 설정)"}
            <input
              type="text"
              maxLength={VLUE_NICKNAME_MAX}
              value={vlueNick}
              disabled={Boolean(state?.vlueNicknameLocked) || Boolean(busy)}
              onChange={(e) => setVlueNick(e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] outline-none disabled:opacity-60 ${
                isDarkMode
                  ? "border-white/15 bg-[#1f2937] text-gray-100"
                  : "border-gray-200 bg-white text-gray-900"
              }`}
            />
          </label>
          {!state?.vlueNicknameLocked ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void saveVlueNickname()}
              className="mt-2 w-full rounded-xl bg-blue-600 py-2 text-[12px] font-black text-white"
            >
              닉네임 확정
            </button>
          ) : null}
          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-blue-400/50 py-3 text-[12px] font-bold text-blue-500">
            앨범에서 사진 업로드
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={Boolean(busy)}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onVluePhoto(f);
              }}
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-medium ${
            isDarkMode ? "bg-rose-500/10 text-rose-300" : "bg-rose-50 text-rose-700"
          }`}
        >
          {error}
        </p>
      ) : null}
      {loading ? <p className={`mt-2 text-[11px] ${muted}`}>불러오는 중…</p> : null}
    </div>
  );
}
