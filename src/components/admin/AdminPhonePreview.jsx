/** 어드민 — 스마트폰 가상 미리보기 프레임 */
export default function AdminPhonePreview({ label = "미리보기", children }) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-[11px] font-bold text-slate-500">{label}</p>
      <div className="relative w-[220px] rounded-[28px] border-[6px] border-slate-900 bg-slate-900 p-1 shadow-xl">
        <div className="absolute left-1/2 top-2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900" aria-hidden />
        <div className="relative mt-5 overflow-hidden rounded-[20px] bg-white">
          <div className="max-h-[420px] min-h-[380px] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
