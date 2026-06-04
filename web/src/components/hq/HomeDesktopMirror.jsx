import { useEffect, useRef, useState } from "react";
import VLUE_SHIELD_LOGO from "../../assets/vlue-shield-logo.svg?url";

export default function HomeDesktopMirror({ layout }) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(0.55);
  const [contentHeight, setContentHeight] = useState(2400);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const sync = () => {
      const w = el.clientWidth || 1;
      setScale(Math.min(1, w / 1920));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;
    const sync = () => setContentHeight(el.offsetHeight || 2400);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  if (!layout) return null;

  const scaledW = 1920 * scale;
  const scaledH = contentHeight * scale;

  return (
    <div ref={wrapRef} className="w-full bg-[#eef2f8]">
      <div className="relative" style={{ width: scaledW, height: scaledH }}>
        <div
          ref={innerRef}
          className="absolute left-0 top-0 origin-top-left bg-[#f8fafc]"
          style={{ width: 1920, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-10 py-4">
          <div className="flex items-center gap-4">
            <img src={VLUE_SHIELD_LOGO} alt="" className="h-11 w-11 rounded-xl" />
            <span className="text-[28px] font-black tracking-tight text-blue-600">VLUE</span>
          </div>
          <div className="flex items-center gap-6 text-[15px] font-semibold text-slate-500">
            <span className="text-blue-600">홈</span>
            <span>채팅</span>
            <span>스토어</span>
            <span>MY</span>
          </div>
        </header>

        <div className="px-10 py-8">
          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-[32px] font-black text-slate-900">VLUE PICK</h2>
                <p className="text-[16px] font-semibold text-slate-500">VLUE 공식 파트너프로모션</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {layout.vluePick.map((b) => (
                <article key={b.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-56">
                    <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-4 top-4 rounded-md bg-blue-600 px-3 py-1 text-[13px] font-black text-white">
                      VLUE 공식
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-[12px] font-bold uppercase text-blue-600">{b.subLabel}</p>
                    <h3 className="mt-1 text-[22px] font-black text-slate-900">{b.title}</h3>
                    <p className="mt-2 text-[15px] text-slate-600">{b.tagline}</p>
                    <span className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-[14px] font-black text-white">
                      {b.cta || "자세히"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[32px] font-black text-slate-900">VLUE AI 추천 콘텐츠</h2>
                <p className="text-[16px] font-semibold text-slate-500">맞춤큐레이션</p>
              </div>
              <span className="rounded-full bg-blue-50 px-4 py-2 text-[14px] font-black text-blue-600">AI</span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {layout.aiRecommend.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-48">
                    <img src={item.img} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[12px] font-black text-white">
                      {item.tag}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-[20px] font-black leading-snug text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-[15px] text-slate-500">{item.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <div className="mb-4">
              <h2 className="text-[32px] font-black text-slate-900">우리동네 핫플레이스</h2>
              <p className="text-[16px] font-semibold text-slate-500">AI 송출 · 지역·관심도 반영</p>
            </div>
            <div className="grid grid-cols-4 gap-5">
              {layout.hotPlaces.map((store) => (
                <article key={store.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-40">
                    <img src={store.img} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white">
                      {store.tag}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-[17px] font-black text-slate-900">{store.name}</h3>
                    <p className="mt-1 text-[14px] font-semibold text-slate-500">
                      {store.distance}km · ⭐ {store.rating} · ❤ {Number(store.likes || 0).toLocaleString()}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-[32px] font-black text-slate-900">카테고리 조회</h2>
            <div className="flex flex-wrap gap-4">
              {layout.categories.map((c) => (
                <div
                  key={c.id}
                  className="flex min-h-[120px] min-w-[140px] flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-5 text-white shadow-md"
                >
                  <span className="text-4xl">{c.emoji}</span>
                  <span className="text-[16px] font-black">{c.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}
