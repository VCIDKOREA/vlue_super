import SpaceResultView from "./SpaceResultView.jsx";

export default function SpaceHistoryView({ records, emptyLabel = "저장된 점검 기록이 없습니다. 실제 카메라 프레임에서 관찰이 생긴 결과만 남깁니다." }) {
  if (!records?.length) {
    return <p className="border border-white/15 p-3 text-[13px] leading-snug text-white/50">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <article key={record.id || index} className="border border-white/15 p-3">
          <SpaceResultView result={record} />
        </article>
      ))}
    </div>
  );
}
