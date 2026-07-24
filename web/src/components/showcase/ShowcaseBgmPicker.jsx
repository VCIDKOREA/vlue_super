import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, HelpCircle, Loader2, Music2, Sparkles, Upload } from "lucide-react";
import CopyrightVerifySearch from "./CopyrightVerifySearch.jsx";
import {
  borrowShowcaseSound,
  fetchMyShowcaseSounds,
  fetchShowcaseSoundQuota,
  fetchSignatureSounds,
  notifyThemeBgmChange,
  registerShowcaseSound,
  soundToBgmPatch,
  uploadShowcaseSoundFile
} from "../../lib/showcase/showcaseSoundApi.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";

const CREATE_TYPES = [
  { id: "human_created", label: "직접 창작한 음원" },
  { id: "ai_assisted", label: "AI를 활용해 제작한 음원" },
  { id: "ai_generated", label: "AI 생성 음원" },
  { id: "remake_arrangement", label: "리메이크·편곡 음원" }
];

const AI_SERVICES = ["Suno", "Udio", "기타"];
const RIGHTS_TEXT =
  "본인은 등록하는 음원에 대해 VLUE에서 공개·재생할 수 있는 적법한 권리 또는 이용 권한을 보유하고 있음을 확인합니다. AI 음악 생성 서비스의 이용약관 및 라이선스 조건을 확인하였으며, 해당 음원을 VLUE에서 공개·재생하는 것이 허용되는지 확인했습니다. 타인의 저작물, 가사, 음성, 음원 등을 무단으로 사용하거나 권리를 침해한 콘텐츠를 등록하지 않습니다. 허위 등록 또는 권리 침해로 발생하는 모든 책임은 등록자에게 있습니다.";

function resolveMemberHandle(propHandle = "") {
  const fromProp = String(propHandle || "")
    .replace(/^@/, "")
    .trim();
  if (fromProp) return fromProp;
  try {
    return String(localStorage.getItem("vlue_member_handle") || "")
      .replace(/^@/, "")
      .trim();
  } catch {
    return "";
  }
}

function SoundHelp({ text }) {
  return (
    <button
      type="button"
      className="showcase-sound-help"
      title={text}
      aria-label={text}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.alert(text);
      }}
    >
      <HelpCircle size={13} strokeWidth={2.4} aria-hidden />
    </button>
  );
}

function isAiType(t) {
  return t === "ai_assisted" || t === "ai_generated" || t === "remake_arrangement";
}

/**
 * A. VLUE Signature Sound / B. User Original Sound
 */
export default function ShowcaseBgmPicker({ value, onChange, inputCls = "", memberHandle = "" }) {
  const handle = resolveMemberHandle(memberHandle);
  const originalTrackLabel = handle ? `@${handle} Original Track` : "Original Track";
  const [tab, setTab] = useState("signature");
  const [signatures, setSignatures] = useState([]);
  const [mine, setMine] = useState({ owned: [], borrowed: [] });
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const { setPlaybackPhase, unlockFromUserGesture } = useShowcaseBgm();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sig, my, q] = await Promise.all([
        fetchSignatureSounds(),
        fetchMyShowcaseSounds(),
        fetchShowcaseSoundQuota()
      ]);
      setSignatures(sig.items || []);
      setMine({ owned: my.owned || [], borrowed: my.borrowed || [] });
      setQuota(q.quota);
    } catch (e) {
      setError(e?.message || "음원 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setPlaybackPhase("idle");
    return () => setPlaybackPhase("idle");
  }, [load, setPlaybackPhase]);

  const applySound = async (sound, mode) => {
    try {
      if (value?.soundId && value.soundId !== sound.id) {
        await notifyThemeBgmChange();
      }
    } catch (e) {
      setError(e?.message || "주제곡 변경 제한");
      return;
    }
    unlockFromUserGesture();
    onChange?.(soundToBgmPatch(sound, mode));
    setPlaybackPhase("preview");
  };

  const clearBgm = () => {
    onChange?.({
      mode: "none",
      soundId: "",
      title: "",
      artistName: "",
      audioUrl: "",
      attributionLabel: "",
      linkBroken: false
    });
  };

  const selectedId = value?.soundId || "";

  return (
    <div className="showcase-sound-picker">
      <p className="showcase-sound-picker__policy">
        VLUE는 음원을 판매하거나 저작권을 최종 인증하지 않습니다. 적법한 권리·이용 권한이 있는 음원을
        쇼케이스에 연결합니다.
      </p>

      <div className="showcase-sound-picker__tabs">
        <button
          type="button"
          className={tab === "signature" ? "is-on" : ""}
          onClick={() => setTab("signature")}
        >
          <Sparkles size={14} /> VLUE Signature Sound
        </button>
        <button type="button" className={tab === "user" ? "is-on" : ""} onClick={() => setTab("user")}>
          <Upload size={14} /> User Original Sound
        </button>
      </div>

      {value?.mode && value.mode !== "none" ? (
        <div className="showcase-sound-picker__current">
          <Music2 size={14} />
          <div>
            <p className="font-bold">{value.title || "선택됨"}</p>
            <p className="text-[11px] text-slate-500">
              {value.artistName || "—"} · {value.attributionLabel || value.mode}
              {value.linkBroken ? " · 연결 끊김" : ""}
            </p>
          </div>
          <button type="button" className="showcase-sound-btn showcase-sound-btn--ghost" onClick={clearBgm}>
            없음
          </button>
        </div>
      ) : null}

      {quota && !quota.paid ? (
        <p className="showcase-sound-picker__quota">
          무료: 월 등록 {quota.registerCount}/{quota.registerLimit} · 주제곡 변경 주{" "}
          {quota.themeChangeCount}/{quota.themeChangeLimit}
        </p>
      ) : null}

      {error ? <p className="showcase-sound-picker__err">{error}</p> : null}
      {loading ? (
        <p className="showcase-sound-picker__loading">
          <Loader2 className="inline animate-spin" size={14} /> 불러오는 중…
        </p>
      ) : null}

      {tab === "signature" && !loading ? (
        <div className="showcase-sound-list">
          {signatures.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`showcase-sound-list__item${selectedId === s.id ? " is-selected" : ""}`}
              onClick={() => applySound(s, "signature")}
            >
              <span className="font-bold">{s.title}</span>
              <span className="text-[11px] text-slate-500">
                {s.artistName || "VLUE"} · {s.attributionLabel}
              </span>
              {selectedId === s.id ? <Check size={14} className="text-emerald-600" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "user" && !loading ? (
        <div className="showcase-sound-list">
          <button
            type="button"
            className="showcase-sound-btn showcase-sound-btn--primary"
            onClick={() => setRegisterOpen(true)}
            disabled={quota && !quota.canRegister}
          >
            <Upload size={14} /> 음원 등록
          </button>
          {quota && !quota.canRegister ? (
            <p className="text-[11px] text-amber-700">이번 달 무료 등록 한도를 모두 사용했습니다.</p>
          ) : null}

          <h4 className="showcase-sound-list__h">
            <span>{originalTrackLabel}</span>
            <SoundHelp text="내가 VLUE에 등록·업로드한 내 음원입니다. 쇼케이스 배경음악으로 선택해 사용할 수 있습니다." />
          </h4>
          {(mine.owned || []).map((s) => (
            <button
              key={s.id}
              type="button"
              className={`showcase-sound-list__item${selectedId === s.id ? " is-selected" : ""}`}
              onClick={() => applySound(s, "user")}
            >
              <span className="font-bold">{s.title}</span>
              <span className="text-[11px] text-slate-500">
                {s.attributionLabel} · {s.visibility === "public" ? "공개" : "비공개"}
              </span>
            </button>
          ))}
          {!mine.owned?.length ? (
            <p className="text-[12px] text-slate-500">등록한 Original Track이 없습니다.</p>
          ) : null}

          <h4 className="showcase-sound-list__h">
            <span>VLUE Shared Track</span>
            <SoundHelp text="공개된 다른 쇼케이스 음원을 가져와(퍼와) 내 쇼케이스에 연결한 음원입니다. 파일을 복사하지 않고 원본을 참조하며, 원본이 비공개·삭제되면 연결이 끊어질 수 있습니다." />
          </h4>
          {(mine.borrowed || []).map((b) => (
            <button
              key={b.borrowId}
              type="button"
              className={`showcase-sound-list__item${selectedId === b.sound?.id ? " is-selected" : ""}${
                b.sound?.linkBroken ? " is-broken" : ""
              }`}
              onClick={() => {
                if (b.sound?.linkBroken) {
                  setError("원본 음원이 비공개·삭제되어 연결이 끊어졌습니다.");
                  return;
                }
                applySound(b.sound, "borrowed");
              }}
            >
              <span className="font-bold">{b.sound?.title || "연결 끊김"}</span>
              <span className="text-[11px] text-slate-500">
                {b.sound?.linkBroken ? "연결 끊김" : b.sound?.attributionLabel}
              </span>
            </button>
          ))}
          {!mine.borrowed?.length ? (
            <p className="text-[12px] text-slate-500">퍼온 Shared Track이 없습니다.</p>
          ) : null}
        </div>
      ) : null}

      {registerOpen ? (
        <UserSoundRegisterSheet
          inputCls={inputCls}
          onClose={() => setRegisterOpen(false)}
          onRegistered={async (sound) => {
            setRegisterOpen(false);
            await load();
            await applySound(sound, "user");
          }}
        />
      ) : null}
    </div>
  );
}

function UserSoundRegisterSheet({ inputCls, onClose, onRegistered }) {
  const [createType, setCreateType] = useState("human_created");
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [fileMeta, setFileMeta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyrightVerify, setCopyrightVerify] = useState(null);
  const [consent, setConsent] = useState(false);
  const [consentRights, setConsentRights] = useState(false);
  const [consentThird, setConsentThird] = useState(false);
  const [consentAi, setConsentAi] = useState(false);
  const [commercialUse, setCommercialUse] = useState(false);
  const [aiMeta, setAiMeta] = useState({
    service: "Suno",
    serviceOther: "",
    generatedAt: "",
    plan: "paid",
    lyrics: "self",
    melody: "ai",
    vocalAi: false,
    finalEdit: "edited"
  });

  const ai = isAiType(createType);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const meta = await uploadShowcaseSoundFile(file);
      setFileMeta(meta);
    } catch (err) {
      setError(err?.message || "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (!consent || !consentRights || !consentThird || (ai && !consentAi)) {
        throw new Error("필수 동의 항목에 모두 체크해 주세요.");
      }
      if (!fileMeta?.audioUrl) throw new Error("음원 파일을 업로드해 주세요.");
      if (ai && !commercialUse) throw new Error("상업적 이용 권한 보유에 동의해 주세요.");

      const sound = await registerShowcaseSound({
        title,
        artistName,
        createType,
        audioUrl: fileMeta.audioUrl,
        objectKey: fileMeta.objectKey,
        contentType: fileMeta.contentType,
        fileSize: fileMeta.fileSize,
        visibility,
        aiMeta: ai
          ? {
              ...aiMeta,
              service:
                aiMeta.service === "기타"
                  ? String(aiMeta.serviceOther || "기타").trim() || "기타"
                  : aiMeta.service,
              finalEdited: aiMeta.finalEdit === "edited"
            }
          : null,
        copyrightVerify,
        commercialUseClaimed: ai ? commercialUse : true,
        rightsConsent: true
      });
      onRegistered?.(sound);
    } catch (err) {
      setError(err?.message || "등록 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="showcase-sound-register">
      <div className="showcase-sound-register__head">
        <h3>User Original Sound 등록</h3>
        <button type="button" onClick={onClose}>
          닫기
        </button>
      </div>

      <p className="showcase-sound-register__ban">
        등록 제한: 특정 가수 목소리 무단 복제, 기존 곡 무단 변형, 상업적 이용 금지 요금제 곡, 타인 가사
        무단 입력
      </p>

      <fieldset className="showcase-sound-register__types">
        <legend>음원 유형</legend>
        {CREATE_TYPES.map((t) => (
          <label key={t.id}>
            <input
              type="radio"
              name="createType"
              checked={createType === t.id}
              onChange={() => setCreateType(t.id)}
            />
            {t.label}
          </label>
        ))}
      </fieldset>

      <input className={inputCls} placeholder="음원 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input
        className={inputCls}
        placeholder="저작자·아티스트명"
        value={artistName}
        onChange={(e) => setArtistName(e.target.value)}
      />

      <label className="showcase-sound-register__file">
        <Upload size={14} /> 음원 파일 (mp3/m4a/wav · R2 Direct Upload)
        <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" onChange={onFile} disabled={uploading} />
      </label>
      {uploading ? <p>업로드 중…</p> : null}
      {fileMeta ? <p className="text-[11px] text-emerald-700">업로드 완료</p> : null}

      {!ai ? (
        <CopyrightVerifySearch
          defaultTitle={title}
          defaultAuthor={artistName}
          inputCls={inputCls}
          onSelect={(item) =>
            setCopyrightVerify({
              selected: item,
              verifiedAt: new Date().toISOString(),
              note: "등록정보 참고 선택"
            })
          }
        />
      ) : (
        <div className="showcase-sound-register__ai">
          <p className="font-bold text-[12px]">AI 음원 상세</p>
          <label>
            AI 서비스
            <select
              className={inputCls}
              value={aiMeta.service}
              onChange={(e) => setAiMeta((p) => ({ ...p, service: e.target.value }))}
            >
              {AI_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {aiMeta.service === "기타" ? (
            <input
              className={inputCls}
              placeholder="서비스명"
              value={aiMeta.serviceOther}
              onChange={(e) => setAiMeta((p) => ({ ...p, serviceOther: e.target.value }))}
            />
          ) : null}
          <label>
            AI 생성 시점
            <input
              type="date"
              className={inputCls}
              value={aiMeta.generatedAt}
              onChange={(e) => setAiMeta((p) => ({ ...p, generatedAt: e.target.value }))}
            />
          </label>
          <label>
            이용 요금제
            <select
              className={inputCls}
              value={aiMeta.plan}
              onChange={(e) => setAiMeta((p) => ({ ...p, plan: e.target.value }))}
            >
              <option value="free">무료</option>
              <option value="paid">유료</option>
            </select>
          </label>
          <label>
            가사
            <select
              className={inputCls}
              value={aiMeta.lyrics}
              onChange={(e) => setAiMeta((p) => ({ ...p, lyrics: e.target.value }))}
            >
              <option value="self">직접 작성</option>
              <option value="ai">AI 생성</option>
              <option value="collab">공동 작성</option>
            </select>
          </label>
          <label>
            멜로디·작곡
            <select
              className={inputCls}
              value={aiMeta.melody}
              onChange={(e) => setAiMeta((p) => ({ ...p, melody: e.target.value }))}
            >
              <option value="self">직접 창작</option>
              <option value="ai">AI 생성</option>
              <option value="collab">공동 작업</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={aiMeta.vocalAi}
              onChange={(e) => setAiMeta((p) => ({ ...p, vocalAi: e.target.checked }))}
            />
            보컬 AI 생성 포함
          </label>
          <label>
            최종 편집
            <select
              className={inputCls}
              value={aiMeta.finalEdit}
              onChange={(e) => setAiMeta((p) => ({ ...p, finalEdit: e.target.value }))}
            >
              <option value="edited">직접 편집함</option>
              <option value="none">하지 않음</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={commercialUse} onChange={(e) => setCommercialUse(e.target.checked)} />
            상업적 이용 권한 보유 (예)
          </label>
        </div>
      )}

      <label>
        공개 범위
        <select className={inputCls} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="private">비공개</option>
          <option value="public">공개 (타인 퍼가기 가능)</option>
        </select>
      </label>

      <div className="showcase-sound-register__consent">
        <p className="text-[11px] leading-relaxed text-slate-600">{RIGHTS_TEXT}</p>
        <label>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          위 권리·책임 확인에 동의합니다.
        </label>
        <label>
          <input type="checkbox" checked={consentRights} onChange={(e) => setConsentRights(e.target.checked)} />
          본인은 이 음원을 VLUE에 업로드하고 재생할 권리를 보유하고 있습니다.
        </label>
        <label>
          <input type="checkbox" checked={consentThird} onChange={(e) => setConsentThird(e.target.checked)} />
          타인의 저작물·음원·보컬·샘플·가사를 무단 사용하지 않았습니다.
        </label>
        {ai ? (
          <label>
            <input type="checkbox" checked={consentAi} onChange={(e) => setConsentAi(e.target.checked)} />
            AI 서비스 이용약관을 준수했습니다.
          </label>
        ) : null}
      </div>

      {error ? <p className="showcase-sound-picker__err">{error}</p> : null}

      <button type="button" className="showcase-sound-btn showcase-sound-btn--primary" disabled={busy} onClick={submit}>
        {busy ? "등록 중…" : "등록"}
      </button>
    </div>
  );
}

/** 공개 Signature/타인 음원 퍼가기 헬퍼 (쇼케이스 보기에서 호출) */
export async function borrowPublicShowcaseSound(soundId) {
  return borrowShowcaseSound(soundId);
}
