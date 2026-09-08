import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";
import { DCC_PROFILE_PHOTO_IMAGE_GUIDE } from "../../lib/fitImageFile.js";
import {
  activateDccAgentProfile,
  assignLinesToDccProfile,
  createDccAgentProfile,
  deleteDccAgentProfile,
  setRepresentativeDccProfile,
  updateDccAgentProfile
} from "../../lib/dccAgentProfilesApi.js";
import {
  agentOptionLabel,
  cacheBustMediaUrl,
  writeEditingMultiDccProfileId
} from "../../lib/dccAgentProfileState.js";
import { readLetteringFixedIdentity } from "../../lib/letteringBizcardStorage.js";
import { isCertifiedLine } from "../../lib/dccLineLabel.js";
import { writeSelectedDccLineId } from "../../lib/dccLineState.js";
import { SOHO_BROADCAST_MONTHLY_KRW } from "../../lib/membershipBm.js";
import "./dcc-agent-switcher.css";

const EMPTY_FORM = {
  label: "",
  displayName: "",
  title: "",
  department: "",
  photoUrl: "",
  photoFocus: "center"
};

export { writeEditingMultiDccProfileId };

/**
 * 멀티 DCC 프로필 관리
 * - 전화·이름(계정)은 공유, 그 외 DCC·쇼케이스·BGM·상호·계좌 등은 프로필별
 * - 2번째부터 결제 후 생성
 */
export default function DccAgentManageModal({
  open,
  lines = [],
  selectedLineId = "",
  profiles = [],
  maxCount = 20,
  allowedSlots = 1,
  monthlyKrw = SOHO_BROADCAST_MONTHLY_KRW,
  onClose,
  onSelectLine,
  onAssignAgent,
  onChanged,
  onToast,
  onEditProfileBroadcast,
  onSwitchProfile,
  onRequestPayCreate
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [draftLineIds, setDraftLineIds] = useState([]);

  const lineList = useMemo(() => (Array.isArray(lines) ? lines : []), [lines]);
  const slots = Number(allowedSlots) || Number(maxCount) || 1;
  const needPayToCreate = profiles.length >= slots;
  const sharedName = useMemo(() => {
    try {
      return String(readLetteringFixedIdentity().name || "").trim();
    } catch {
      return "";
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFormOpen(false);
      setEditingId("");
      setForm(EMPTY_FORM);
      setSelectedProfileId("");
      setDraftLineIds([]);
      return;
    }
    const preferred =
      profiles.find((p) => p.isRepresentative)?.id ||
      profiles.find((p) => p.isActive)?.id ||
      profiles[0]?.id ||
      "";
    setSelectedProfileId(preferred);
  }, [open, profiles]);

  useEffect(() => {
    if (!selectedProfileId) {
      setDraftLineIds([]);
      return;
    }
    const p = profiles.find((x) => x.id === selectedProfileId);
    setDraftLineIds(Array.isArray(p?.assignedLineIds) ? [...p.assignedLineIds] : []);
  }, [selectedProfileId, profiles]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;

  const startCreate = () => {
    if (needPayToCreate) {
      if (typeof onRequestPayCreate === "function") {
        onRequestPayCreate();
        return;
      }
      onToast?.(
        `멀티 프로필 추가에는 결제(월 ${Number(monthlyKrw).toLocaleString("ko-KR")}원)가 필요합니다. DCC·쇼케이스는 프로필마다 따로 설정됩니다.`
      );
      return;
    }
    setEditingId("");
    setForm({
      ...EMPTY_FORM,
      displayName: sharedName || ""
    });
    setFormOpen(true);
  };

  const startEdit = (profile) => {
    setEditingId(profile.id);
    setSelectedProfileId(profile.id);
    setForm({
      label: profile.label || "",
      displayName: sharedName || profile.displayName || "",
      title: profile.title || "",
      department: profile.department || "",
      photoUrl: profile.photoUrl || "",
      photoFocus: profile.photoFocus || "center"
    });
    setFormOpen(true);
  };

  const onPickPhoto = useCallback(
    async (file) => {
      if (!file) return;
      setUploading(true);
      try {
        const uploaded = await compressAndUploadMediaImageOrThrow(file, "photo");
        const next = String(uploaded?.url || "").trim();
        if (!next) throw new Error("사진 업로드에 실패했습니다.");
        setForm((prev) => ({ ...prev, photoUrl: next }));
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [onToast]
  );

  const saveForm = async () => {
    const displayName = String(sharedName || form.displayName || "").trim();
    if (!displayName) {
      onToast?.("계정 이름이 없습니다. 가입 실명을 확인해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        label: String(form.label || "").trim(),
        displayName,
        title: String(form.title || "").trim(),
        department: String(form.department || "").trim(),
        photoUrl: String(form.photoUrl || "").trim() || null,
        photoFocus: form.photoFocus || "center"
      };
      if (editingId) {
        await updateDccAgentProfile(editingId, payload);
        onToast?.("프로필 기본 정보를 저장했습니다.");
      } else {
        const created = await createDccAgentProfile(payload);
        const id = created?.profile?.id;
        if (id) setSelectedProfileId(id);
        onToast?.(
          "멀티 프로필을 만들었습니다. 상호·이메일·계좌·DCC·쇼케이스·BGM은 이 프로필에서 새로 설정하세요."
        );
      }
      setFormOpen(false);
      setEditingId("");
      await onChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
      if (/멀티 DCC|4,200|4200|결제|슬롯/i.test(msg)) {
        onToast?.(msg);
        onRequestPayCreate?.();
      } else {
        onToast?.(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeProfile = async (profile) => {
    if (profile.isRepresentative) {
      onToast?.("대표 프로필은 삭제할 수 없습니다. 다른 프로필을 대표로 지정한 뒤 삭제해 주세요.");
      return;
    }
    if (!window.confirm(`${agentOptionLabel(profile)} 프로필을 삭제할까요?`)) return;
    setBusy(true);
    try {
      await deleteDccAgentProfile(profile.id);
      onToast?.("프로필을 삭제했습니다.");
      await onChanged?.();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const toggleLine = (lineId) => {
    setDraftLineIds((prev) =>
      prev.includes(lineId) ? prev.filter((x) => x !== lineId) : [...prev, lineId]
    );
  };

  const saveLineAssignments = async () => {
    if (!selectedProfileId) return;
    setBusy(true);
    try {
      await assignLinesToDccProfile(selectedProfileId, draftLineIds);
      onToast?.(
        draftLineIds.length
          ? "지정한 번호에 이 프로필의 DCC·쇼케이스가 송출됩니다."
          : "번호 지정을 해제했습니다. 미지정 번호는 대표 프로필이 송출됩니다."
      );
      await onChanged?.();
      if (typeof onAssignAgent === "function" && draftLineIds[0]) {
        await onAssignAgent(draftLineIds[0], selectedProfileId);
      }
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "번호 배정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const makeRepresentative = async (profile) => {
    setBusy(true);
    try {
      await setRepresentativeDccProfile(profile.id);
      onToast?.("대표 프로필로 지정했습니다. 미지정·모르는 번호 상대에게 이 설정이 송출됩니다.");
      setSelectedProfileId(profile.id);
      await onChanged?.();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "대표 지정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const startBroadcastEdit = async (profile) => {
    setBusy(true);
    try {
      const lineId =
        (Array.isArray(profile.assignedLineIds) && profile.assignedLineIds[0]) ||
        selectedLineId ||
        lineList[0]?.id ||
        "";
      await activateDccAgentProfile(profile.id, lineId || undefined);
      writeEditingMultiDccProfileId(profile.id);
      if (lineId) {
        writeSelectedDccLineId(lineId);
        onSelectLine?.(lineId);
      }
      onToast?.(
        lineId
          ? `「${agentOptionLabel(profile)}」 편집 모드 — 지금 DCC·쇼케이스를 설정하면 이 프로필 전용으로 저장됩니다.`
          : `「${agentOptionLabel(profile)}」 — 먼저 송출 번호를 지정한 뒤 DCC·쇼케이스를 설정하세요.`
      );
      onEditProfileBroadcast?.(profile, lineId);
      onClose?.();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "편집 모드 전환에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="dcc-agent-modal" role="dialog" aria-modal="true" aria-labelledby="dcc-agent-modal-title">
      <div className="dcc-agent-modal__sheet">
        <div className="dcc-agent-modal__head">
          <div>
            <h2 id="dcc-agent-modal-title" className="dcc-agent-modal__title">
              멀티 DCC 프로필
            </h2>
            <p className="dcc-agent-modal__sub">
              목록을 누르면 즉시 그 프로필로 전환됩니다. <b>전화번호·이름</b>만 공유하고, 상호·계좌·이메일·웹·사진·DCC·쇼케이스·BGM은
              프로필마다 새로 설정합니다. 추가 프로필은 결제 후 생성됩니다.
            </p>
          </div>
          <button type="button" className="dcc-agent-modal__close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="dcc-agent-modal__body">
          <section className="dcc-agent-section">
            <h3 className="dcc-agent-section__title">
              프로필 목록 · {profiles.length}/{slots}
            </h3>
            {profiles.map((profile) => {
              const selected = profile.id === selectedProfileId;
              const photoSrc = cacheBustMediaUrl(profile.photoUrl, profile.updatedAt || profile.id);
              return (
                <div
                  key={profile.id}
                  className={`dcc-agent-row${selected ? " is-active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedProfileId(profile.id);
                    if (typeof onSwitchProfile === "function") {
                      void onSwitchProfile(profile);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedProfileId(profile.id);
                      if (typeof onSwitchProfile === "function") {
                        void onSwitchProfile(profile);
                      }
                    }
                  }}
                >
                  {photoSrc ? (
                    <img className="dcc-agent-row__photo" src={photoSrc} alt="" />
                  ) : (
                    <div className="dcc-agent-row__photo dcc-agent-row__photo--empty" aria-hidden>
                      {(profile.displayName || "?").slice(0, 1)}
                    </div>
                  )}
                  <div className="dcc-agent-row__text">
                    <p className="dcc-agent-row__name">
                      {profile.displayName || "이름 없음"}
                      {profile.isRepresentative ? (
                        <span className="dcc-agent-row__badge">대표</span>
                      ) : null}
                    </p>
                    <p className="dcc-agent-row__meta">
                      {[profile.title, profile.department].filter(Boolean).join(" · ") || "직급·부서 미입력"}
                      {profile.assignedPhones?.length
                        ? ` · ${profile.assignedPhones.join(", ")}`
                        : " · 번호 미지정"}
                      {profile.hasDcc || profile.hasShowcase ? " · 설정됨" : " · DCC·쇼케이스 미설정"}
                    </p>
                  </div>
                  <div className="dcc-agent-row__actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" title="기본 정보" onClick={() => startEdit(profile)} disabled={busy}>
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      title="삭제"
                      onClick={() => void removeProfile(profile)}
                      disabled={busy || profile.isRepresentative}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {formOpen ? (
              <div className="dcc-agent-form">
                <label>
                  프로필 타이틀
                  <input
                    type="text"
                    value={form.label}
                    maxLength={80}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="예: 회사 / 개인 / 사이드 프로젝트"
                  />
                </label>
                <label>
                  이름 (계정 공유)
                  <input
                    type="text"
                    value={sharedName || form.displayName}
                    maxLength={120}
                    readOnly
                    className="dcc-agent-form__readonly"
                    placeholder="가입 실명"
                  />
                </label>
                <label>
                  직급
                  <input
                    type="text"
                    value={form.title}
                    maxLength={120}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="과장, 팀장 등"
                  />
                </label>
                <label>
                  부서
                  <input
                    type="text"
                    value={form.department}
                    maxLength={120}
                    onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                    placeholder="영업팀, 고객지원 등"
                  />
                </label>
                <div className="dcc-agent-form__photo">
                  {form.photoUrl ? (
                    <img
                      className="dcc-agent-row__photo"
                      src={cacheBustMediaUrl(form.photoUrl, Date.now())}
                      alt=""
                    />
                  ) : (
                    <div className="dcc-agent-row__photo dcc-agent-row__photo--empty">사진</div>
                  )}
                  <label>
                    프로필 사진 (이 프로필 전용)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        void onPickPhoto(file);
                      }}
                    />
                  </label>
                  <p className="dcc-agent-form__photo-hint">{DCC_PROFILE_PHOTO_IMAGE_GUIDE.uploadHint}</p>
                </div>
                <div className="dcc-agent-form__actions">
                  <button type="button" className="is-ghost" onClick={() => setFormOpen(false)} disabled={busy}>
                    취소
                  </button>
                  <button type="button" className="is-primary" onClick={() => void saveForm()} disabled={busy || uploading}>
                    {busy || uploading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {editingId ? "저장" : "등록"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="dcc-agent-modal__add"
                onClick={startCreate}
                disabled={busy}
              >
                <Plus size={14} />
                {needPayToCreate
                  ? `결제 후 프로필 추가 (월 ${Number(monthlyKrw).toLocaleString("ko-KR")}원)`
                  : "프로필 추가"}
              </button>
            )}
          </section>

          {selectedProfile ? (
            <section className="dcc-agent-section">
              <h3 className="dcc-agent-section__title">
                선택 프로필 · {selectedProfile.displayName || "이름 없음"}
                {selectedProfile.isRepresentative ? " (대표)" : ""}
              </h3>
              <p className="dcc-agent-modal__sub" style={{ marginTop: 0 }}>
                아래에서 송출 번호를 지정하고, DCC·쇼케이스·BGM은 「편집」으로 이 프로필 전용으로 설정합니다.
              </p>

              <div className="dcc-agent-form__actions" style={{ marginBottom: 12 }}>
                {!selectedProfile.isRepresentative ? (
                  <button
                    type="button"
                    className="is-ghost"
                    disabled={busy}
                    onClick={() => void makeRepresentative(selectedProfile)}
                  >
                    <Star size={14} /> 대표로 지정
                  </button>
                ) : (
                  <span className="dcc-agent-row__meta">미지정·모르는 번호 → 이 대표 프로필 송출</span>
                )}
                <button
                  type="button"
                  className="is-primary"
                  disabled={busy}
                  onClick={() => void startBroadcastEdit(selectedProfile)}
                >
                  DCC · 쇼케이스 편집
                </button>
              </div>

              <h4 className="dcc-agent-section__title">송출 번호 지정</h4>
              {lineList.length === 0 ? (
                <p className="dcc-agent-row__meta">등록된 번호가 없습니다. 인증 휴대폰·내선·대표번호를 먼저 연결하세요.</p>
              ) : (
                <div className="space-y-2">
                  {lineList.map((line) => {
                    const checked = draftLineIds.includes(line.id);
                    const otherOwner = profiles.find(
                      (p) => p.id !== selectedProfileId && (p.assignedLineIds || []).includes(line.id)
                    );
                    return (
                      <label
                        key={line.id}
                        className={`dcc-agent-row${checked ? " is-active" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy}
                          onChange={() => toggleLine(line.id)}
                          style={{ marginRight: 8 }}
                        />
                        <div className="dcc-agent-row__text">
                          <p className="dcc-agent-row__name">
                            {line.displayPhone}
                            {isCertifiedLine(line) ? " (인증번호)" : ""}
                          </p>
                          <p className="dcc-agent-row__meta">
                            {line.kindLabel}
                            {otherOwner ? ` · 현재 「${otherOwner.displayName}」에 배정됨` : ""}
                          </p>
                        </div>
                        {checked ? <Check size={14} /> : null}
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    className="is-primary dcc-agent-modal__add"
                    disabled={busy}
                    onClick={() => void saveLineAssignments()}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                    번호 배정 저장
                  </button>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
