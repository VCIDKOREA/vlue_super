import SpaceResultView from "./SpaceResultView.jsx";

export default function SpaceHistoryView({ records, emptyLabel = "저장된 점검 기록이 없습니다. 실제 카메라 프레임에서 관찰이 생긴 결과만 남깁니다." }) {
  if (!records?.length) {
    return <p className="rounded-xl border border-white/10 p-3 text-[13px] leading-snug text-slate-400">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <article key={record.id || index} className="rounded-xl border border-white/10 p-3">
          <SpaceResultView result={record} />
        </article>
      ))}
    </div>
  );
}
