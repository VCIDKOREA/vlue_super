import { useCallback, useState } from "react";
import { MapPin } from "lucide-react";
import { DEV_SAMPLE_ROAD_ADDRESS, openDaumPostcode } from "../lib/daumPostcode.js";

function Field({ label, hint, children, isDarkMode }) {
  const labelCls = isDarkMode ? "text-[11px] font-black text-gray-100" : "text-[11px] font-black text-gray-900";
  const hintCls = isDarkMode ? "mt-0.5 text-[10px] text-gray-400" : "mt-0.5 text-[10px] text-gray-500";
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {hint ? <p className={hintCls}>{hint}</p> : null}
      {children}
    </label>
  );
}

/**
 * 디지털 명함 — 카카오(다음) 우편번호 주소 찾기 + 상세주소
 */
export default function LetteringBizcardAddressField({
  addressRoad,
  setAddressRoad,
  addressDetail,
  setAddressDetail,
  isDarkMode = false,
  inputBase
}) {
  const [finderError, setFinderError] = useState("");

  const btnPrimary = isDarkMode
    ? "rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white active:scale-[0.99]"
    : "rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white active:scale-[0.99]";
  const btnGhost = isDarkMode
    ? "rounded-xl border border-white/15 px-3 py-2 text-[11px] font-bold text-gray-300"
    : "rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold text-slate-600";
  const selectedBox = isDarkMode
    ? "rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-[11px] font-semibold text-emerald-200"
    : "rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-[11px] font-semibold text-emerald-900";

  const openAddressFinder = useCallback(() => {
    setFinderError("");
    openDaumPostcode(({ roadAddress }) => {
      setAddressRoad(roadAddress);
    }).catch((e) => {
      setFinderError(e?.message || "주소 찾기를 열 수 없습니다.");
    });
  }, [setAddressRoad]);

  const resetAddress = useCallback(() => {
    setAddressRoad("");
    setAddressDetail("");
    setFinderError("");
  }, [setAddressRoad, setAddressDetail]);

  return (
    <div className="sm:col-span-2 space-y-3">
      <Field
        label="주소 (선택)"
        hint="입력하지 않으면 명함에 표시되지 않습니다. 우편번호 · 주소 찾기로 도로명·지번을 선택한 뒤 상세주소를 입력하세요"
        isDarkMode={isDarkMode}
      >
        <div className="mt-1.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openAddressFinder} className={`inline-flex items-center gap-1.5 ${btnPrimary}`}>
              <MapPin className="h-3.5 w-3.5" />
              우편번호 · 주소 찾기
            </button>
            {addressRoad ? (
              <button type="button" onClick={resetAddress} className={btnGhost}>
                주소 초기화
              </button>
            ) : null}
          </div>
          <input
            type="text"
            value={addressRoad}
            onChange={(e) => setAddressRoad(e.target.value)}
            placeholder="주소를 입력할 수 있습니다."
            className={inputBase}
            autoComplete="street-address"
          />
          {addressRoad ? <p className={selectedBox}>선택됨: {addressRoad}</p> : null}
          {finderError ? <p className="text-[10px] font-bold text-red-500">{finderError}</p> : null}
          {import.meta.env.DEV ? (
            <button
              type="button"
              onClick={() => setAddressRoad(DEV_SAMPLE_ROAD_ADDRESS)}
              className={
                isDarkMode
                  ? "rounded-xl border border-dashed border-amber-500/50 px-2.5 py-1.5 text-[10px] font-bold text-amber-300"
                  : "rounded-xl border border-dashed border-amber-400/90 bg-amber-50/80 px-2.5 py-1.5 text-[10px] font-bold text-amber-950/90"
              }
            >
              개발 전용: 샘플 주소
            </button>
          ) : null}
        </div>
      </Field>
      <Field label="상세주소" hint="동·호수, 층, 건물명 등" isDarkMode={isDarkMode}>
        <input
          type="text"
          value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
          placeholder="예: 12층 1201호"
          className={inputBase}
          autoComplete="address-line2"
        />
      </Field>
    </div>
  );
}
