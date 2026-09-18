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

  const sponsors = Array.isArray(layout.customSponsorList) ? layout.customSponsorList : [];

  const patchSponsor = (index, field, value) => {
    const next = sponsors.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    patch("customSponsorList", next);
  };

  const addSponsor = () => {
    patch("customSponsorList", [
      ...sponsors,
      {
        id: `sponsor-${Date.now()}`,
        advertiser: "",
        headline: "",
        body: "",
        mediaUrl: "",
        iconUrl: "",
        ctaLabel: "방문하기",
        landingUrl: ""
      }
    ]);
  };

  const removeSponsor = (index) => {
    patch(
      "customSponsorList",
      sponsors.filter((_, i) => i !== index)
    );
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
        <h3 className="text-[18px] font-black text-slate-900">1. VLUÉ PICK 배너</h3>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-black text-slate-900">5. 추천 스폰서 커스텀 슬롯</h3>
            <p className="mt-1 text-[13px] font-semibold text-slate-500">
              유료·커스텀 쇼케이스. 비어 있으면 홈은 AdMob 실시간 슬롯만 표시합니다. 미디어 URL은 고화질 이미지(아이콘 단독 금지).
            </p>
          </div>
          <button
            type="button"
            onClick={addSponsor}
            className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-[13px] font-black text-blue-700"
          >
            슬롯 추가
          </button>
        </div>
        <div className="mt-5 space-y-6">
          {sponsors.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-[14px] font-semibold text-slate-400">
              등록된 커스텀 스폰서가 없습니다. AdMob 네이티브가 자동 노출됩니다.
            </p>
          ) : null}
          {sponsors.map((s, i) => (
            <div key={s.id || i} className="rounded-xl border border-slate-100 bg-slate-50/80 p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[13px] font-black text-emerald-700">스폰서 슬롯 {i + 1}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => patch("customSponsorList", moveItem(sponsors, i, i - 1))}
                    className="rounded-lg border px-3 py-1 text-[12px] font-bold disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === sponsors.length - 1}
                    onClick={() => patch("customSponsorList", moveItem(sponsors, i, i + 1))}
                    className="rounded-lg border px-3 py-1 text-[12px] font-bold disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSponsor(i)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-[12px] font-bold text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="grid gap-4">
                <Field label="광고주명 (Advertiser)">
                  <input
                    className={inputCls()}
                    value={s.advertiser || ""}
                    onChange={(e) => patchSponsor(i, "advertiser", e.target.value)}
                    placeholder="예: BMW"
                  />
                </Field>
                <Field label="헤드라인 (Headline)">
                  <input
                    className={inputCls()}
                    value={s.headline || ""}
                    onChange={(e) => patchSponsor(i, "headline", e.target.value)}
                    placeholder="메인 타이틀"
                  />
                </Field>
                <Field label="본문 (Body)">
                  <input
                    className={inputCls()}
                    value={s.body || ""}
                    onChange={(e) => patchSponsor(i, "body", e.target.value)}
                    placeholder="한 줄 설명"
                  />
                </Field>
                <Field label="미디어 URL (mediaContent · 고화질)">
                  <input
                    className={inputCls()}
                    value={s.mediaUrl || ""}
                    onChange={(e) => patchSponsor(i, "mediaUrl", e.target.value)}
                    placeholder="https://… 썸네일·오버레이 배경"
                  />
                </Field>
                <Field label="아이콘 URL (선택 · 코너 로고만)">
                  <input
                    className={inputCls()}
                    value={s.iconUrl || ""}
                    onChange={(e) => patchSponsor(i, "iconUrl", e.target.value)}
                    placeholder="로고 아이콘 — 메인 비주얼로 쓰지 않음"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="CTA 문구">
                    <input
                      className={inputCls()}
                      value={s.ctaLabel || ""}
                      onChange={(e) => patchSponsor(i, "ctaLabel", e.target.value)}
                      placeholder="방문하기"
                    />
                  </Field>
                  <Field label="랜딩 URL (2차 탭)">
                    <input
                      className={inputCls()}
                      value={s.landingUrl || ""}
                      onChange={(e) => patchSponsor(i, "landingUrl", e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
