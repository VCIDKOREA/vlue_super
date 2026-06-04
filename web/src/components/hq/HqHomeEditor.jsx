function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-black text-slate-800">{label}</span>
      {children}
    </label>
  );
}

function inputCls() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[16px] font-medium text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
}

function moveItem(list, from, to) {
  const next = [...list];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export default function HqHomeEditor({ layout, onChange, onPublish, publishing, publishMsg }) {
  const patch = (key, value) => onChange({ ...layout, [key]: value });

  const patchPick = (index, field, value) => {
    const next = layout.vluePick.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    patch("vluePick", next);
  };

  const patchAi = (index, field, value) => {
    const next = layout.aiRecommend.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    patch("aiRecommend", next);
  };

  const patchHot = (index, field, value) => {
    const next = layout.hotPlaces.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    patch("hotPlaces", next);
  };

  const patchCat = (index, field, value) => {
    const next = layout.categories.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    patch("categories", next);
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-[22px] font-black text-slate-900">홈 콘텐츠 관제</p>
          <p className="mt-1 text-[14px] font-semibold text-slate-500">입력 즉시 우측 PC 미러에 반영</p>
        </div>
        <button
          type="button"
          disabled={publishing}
          onClick={onPublish}
          className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-[15px] font-black text-white disabled:opacity-50"
        >
          {publishing ? "배포 중…" : "실서비스 배포"}
        </button>
      </div>
      {publishMsg ? <p className="rounded-xl bg-blue-50 px-4 py-3 text-[14px] font-bold text-blue-800">{publishMsg}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-[18px] font-black text-slate-900">1. VLUE PICK 배너</h3>
        <div className="mt-5 space-y-6">
          {layout.vluePick.map((b, i) => (
            <div key={b.id || i} className="rounded-xl border border-slate-100 bg-slate-50/80 p-5">
              <p className="mb-3 text-[13px] font-black text-blue-600">배너 {i + 1}</p>
              <div className="grid gap-4">
                <Field label="제목">
                  <input className={inputCls()} value={b.title} onChange={(e) => patchPick(i, "title", e.target.value)} />
                </Field>
                <Field label="부가 라벨">
                  <input className={inputCls()} value={b.subLabel} onChange={(e) => patchPick(i, "subLabel", e.target.value)} />
                </Field>
                <Field label="한 줄 소개">
                  <input className={inputCls()} value={b.tagline} onChange={(e) => patchPick(i, "tagline", e.target.value)} />
                </Field>
                <Field label="CTA">
                  <input className={inputCls()} value={b.cta} onChange={(e) => patchPick(i, "cta", e.target.value)} />
                </Field>
                <Field label="이미지 URL">
                  <input className={inputCls()} value={b.imageUrl} onChange={(e) => patchPick(i, "imageUrl", e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-[18px] font-black text-slate-900">2. AI 추천 콘텐츠</h3>
        <div className="mt-5 space-y-6">
          {layout.aiRecommend.map((item, i) => (
            <div key={item.id || i} className="rounded-xl border border-slate-100 bg-slate-50/80 p-5">
              <p className="mb-3 text-[13px] font-black text-blue-600">카드 {i + 1}</p>
              <div className="grid gap-4">
                <Field label="제목">
                  <input className={inputCls()} value={item.title} onChange={(e) => patchAi(i, "title", e.target.value)} />
                </Field>
                <Field label="태그">
                  <input className={inputCls()} value={item.tag} onChange={(e) => patchAi(i, "tag", e.target.value)} />
                </Field>
                <Field label="설명">
                  <input className={inputCls()} value={item.desc} onChange={(e) => patchAi(i, "desc", e.target.value)} />
                </Field>
                <Field label="이미지 URL">
                  <input className={inputCls()} value={item.img} onChange={(e) => patchAi(i, "img", e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-[18px] font-black text-slate-900">3. 우리동네 핫플레이스 · 순서</h3>
        <div className="mt-5 space-y-4">
          {layout.hotPlaces.map((store, i) => (
            <div
              key={store.id || i}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (Number.isNaN(from) || from === i) return;
                patch("hotPlaces", moveItem(layout.hotPlaces, from, i));
              }}
              className="cursor-grab rounded-xl border border-slate-100 bg-slate-50/80 p-5 active:cursor-grabbing"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-black text-violet-700">#{i + 1} · 드래그로 순서 변경</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => patch("hotPlaces", moveItem(layout.hotPlaces, i, i - 1))}
                    className="rounded-lg border px-3 py-1 text-[12px] font-bold disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === layout.hotPlaces.length - 1}
                    onClick={() => patch("hotPlaces", moveItem(layout.hotPlaces, i, i + 1))}
                    className="rounded-lg border px-3 py-1 text-[12px] font-bold disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="grid gap-4">
                <Field label="상점명">
                  <input className={inputCls()} value={store.name} onChange={(e) => patchHot(i, "name", e.target.value)} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="거리(km)">
                    <input
                      className={inputCls()}
                      type="number"
                      step="0.1"
                      value={store.distance}
                      onChange={(e) => patchHot(i, "distance", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="평점">
                    <input
                      className={inputCls()}
                      type="number"
                      step="0.1"
                      value={store.rating}
                      onChange={(e) => patchHot(i, "rating", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="태그">
                    <input className={inputCls()} value={store.tag} onChange={(e) => patchHot(i, "tag", e.target.value)} />
                  </Field>
                </div>
                <Field label="이미지 URL">
                  <input className={inputCls()} value={store.img} onChange={(e) => patchHot(i, "img", e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-[18px] font-black text-slate-900">4. 카테고리 퀵 메뉴</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {layout.categories.map((c, i) => (
            <div key={c.id || i} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <Field label="라벨">
                <input className={inputCls()} value={c.label} onChange={(e) => patchCat(i, "label", e.target.value)} />
              </Field>
              <Field label="이모지">
                <input className={inputCls()} value={c.emoji} onChange={(e) => patchCat(i, "emoji", e.target.value)} />
              </Field>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
