import { isDccExposureComplete } from "../lib/dccExposure.js";

function PublicPrivateRow({ label, hint, value, onChange, isDarkMode }) {
  const unset = typeof value !== "boolean";
  const btn = (active, text, next) => (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={`min-w-[72px] flex-1 rounded-xl px-3 py-2.5 text-[12px] font-black transition-colors ${
        active
          ? next
            ? "bg-blue-600 text-white shadow-sm"
            : "bg-slate-700 text-white shadow-sm"
          : isDarkMode
            ? "bg-white/5 text-gray-300 ring-1 ring-white/10"
            : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {text}
    </button>
  );
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${
        unset
          ? isDarkMode
            ? "ring-2 ring-amber-400/80 bg-black/20"
            : "ring-2 ring-amber-400 bg-white"
          : isDarkMode
            ? "bg-black/20"
            : "bg-white/90"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`min-w-0 text-[13px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
          {label}
        </p>
        <div className="flex w-[148px] shrink-0 gap-1.5">
          {btn(value === true, "공개", true)}
          {btn(value === false, "비공개", false)}
        </div>
      </div>
      {hint ? (
        <p className={`mt-1.5 text-[10px] leading-snug ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 디지털인증명함 검색·팔로워 노출 목록 — 공개/비공개 직접 지정
 */
export default function DccExposureSettingsPanel({ choice, onChange, isDarkMode = false }) {
  const complete = isDccExposureComplete(choice);
  const set = (key, val) => onChange({ ...choice, [key]: val });

  return (
    <section
      className={`rounded-2xl border-2 p-3.5 space-y-3 ${
        complete
          ? isDarkMode
            ? "border-sky-400/40 bg-sky-500/10"
            : "border-sky-300 bg-sky-50"
          : isDarkMode
            ? "border-amber-400/70 bg-amber-500/10"
            : "border-amber-400 bg-amber-50"
      }`}
    >
      <div>
        <p className={`text-[13px] font-black ${isDarkMode ? "text-sky-200" : "text-sky-800"}`}>
          디지털인증명함 노출 설정
        </p>
        <p className={`mt-1 text-[11px] leading-relaxed ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
          검색과 팔로워에게 전화번호·주소를 각각 공개할지 고르세요. 이름은 항상 표시됩니다.
          공유 쇼케이스·지인 친구·통화 수신은 이 설정과 무관합니다.
        </p>
        {!complete ? (
          <p className={`mt-1.5 text-[11px] font-bold ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>
            아래 목록을 모두 공개 또는 비공개로 지정해야 명함이 저장됩니다.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className={`px-0.5 text-[11px] font-black ${isDarkMode ? "text-sky-300" : "text-sky-700"}`}>
          검색
        </p>
        <PublicPrivateRow
          isDarkMode={isDarkMode}
          label="검색에 전화번호"
          hint="비공개면 010-****-**** 로만 보이고 전화바로연결이 막힙니다."
          value={choice.phoneSearch}
          onChange={(v) => set("phoneSearch", v)}
        />
        <PublicPrivateRow
          isDarkMode={isDarkMode}
          label="검색에 주소"
          hint="비공개면 시·군·구만 보입니다."
          value={choice.addressSearch}
          onChange={(v) => set("addressSearch", v)}
        />
      </div>

      <div className="space-y-2">
        <p className={`px-0.5 text-[11px] font-black ${isDarkMode ? "text-indigo-300" : "text-indigo-700"}`}>
          팔로워
        </p>
        <PublicPrivateRow
          isDarkMode={isDarkMode}
          label="팔로워에게 전화번호"
          hint="비공개면 나를 팔로우한 사람에게도 010-****-**** 이며 바로연결이 막힙니다."
          value={choice.phoneFollow}
          onChange={(v) => set("phoneFollow", v)}
        />
        <PublicPrivateRow
          isDarkMode={isDarkMode}
          label="팔로워에게 주소"
          hint="비공개면 팔로워에게도 시·군·구만 보입니다."
          value={choice.addressFollow}
          onChange={(v) => set("addressFollow", v)}
        />
      </div>
    </section>
  );
}
