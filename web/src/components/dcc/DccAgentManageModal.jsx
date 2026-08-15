import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";
import {
  createDccAgentProfile,
  deleteDccAgentProfile,
  updateDccAgentProfile
} from "../../lib/dccAgentProfilesApi.js";
import { agentOptionLabel } from "../../lib/dccAgentProfileState.js";
import { isCertifiedLine } from "../../lib/dccLineLabel.js";

const EMPTY_FORM = {
  displayName: "",
  title: "",
  department: "",
  photoUrl: "",
  photoFocus: "center"
};

export default function DccAgentManageModal({
  open,
  lines = [],
  selectedLineId = "",
  profiles = [],
  maxCount = 20,
  onClose,
  onSelectLine,
  onAssignAgent,
  onChanged,
  onToast
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFormOpen(false);
      setEditingId("");
      setForm(EMPTY_FORM);
    }
  }, [open]);

  const startCreate = () => {
    setEditingId("");
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const startEdit = (profile) => {
    setEditingId(profile.id);
    setForm({
      displayName: profile.displayName || "",
      title: profile.title || "",
      department: profile.department || "",
      photoUrl: profile.photoUrl || "",
      photoFocus: profile.photoFocus || "center"
    });
    setFormOpen(true);
  };

  const onPickPhoto = useCallback(async (file) => {
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
  }, [onToast]);

  const saveForm = async () => {
    const displayName = String(form.displayName || "").trim();
    if (!displayName) {
      onToast?.("담당자 이름을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        displayName,
        title: String(form.title || "").trim(),
        department: String(form.department || "").trim(),
        photoUrl: String(form.photoUrl || "").trim() || null,
        photoFocus: form.photoFocus || "center"
      };
      if (editingId) {
        await updateDccAgentProfile(editingId, payload);
        onToast?.("담당자 정보를 저장했습니다.");
      } else {
        await createDccAgentProfile(payload);
        onToast?.("담당자를 등록했습니다.");
      }
      setFormOpen(false);
      setEditingId("");
      await onChanged?.();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const removeProfile = async (profile) => {
    if (!window.confirm(`${agentOptionLabel(profile)} 프로필을 삭제할까요?`)) return;
    setBusy(true);
    try {
      await deleteDccAgentProfile(profile.id);
      onToast?.("담당자를 삭제했습니다.");
      await onChanged?.();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  const showLines = Array.isArray(lines) && lines.length > 0;

  return createPortal(
    <div className="dcc-agent-modal" role="dialog" aria-modal="true" aria-labelledby="dcc-agent-modal-title">
      <div className="dcc-agent-modal__sheet">
        <div className="dcc-agent-modal__head">
          <div>
            <h2 id="dcc-agent-modal-title" className="dcc-agent-modal__title">
              담당자 프로필
            </h2>
            <p className="dcc-agent-modal__sub">
              번호마다 담당자를 지정합니다. 번호를 고르면 그 번호의 DCC·쇼케이스를 설정합니다.
            </p>
          </div>
          <button type="button" className="dcc-agent-modal__close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="dcc-agent-modal__body">
          {showLines ? (
            <section className="dcc-agent-section">
              <h3 className="dcc-agent-section__title">번호</h3>
              {lines.map((line) => {
                const selected = line.id === selectedLineId;
                const agentName = String(line.displayName || "").trim();
                return (
                  <div
                    key={line.id}
                    className={`dcc-agent-row dcc-line-row${selected ? " is-active" : ""}`}
                  >
                    <button
                      type="button"
                      className="dcc-line-row__pick"
                      onClick={() => onSelectLine?.(line.id)}
                    >
                      <p className="dcc-agent-row__name">
                        {line.displayPhone}
                        {isCertifiedLine(line) ? " (인증번호)" : ""}
                        {agentName ? ` ${agentName}` : ""}
                        {line.agentId || agentName ? <span className="dcc-agent-row__badge">사용 중</span> : null}
                      </p>
                      <p className="dcc-agent-row__meta">
                        {line.kindLabel}
                        {selected ? " · 이 번호 설정 중" : " · 눌러서 이 번호 설정"}
                      </p>
                    </button>
                    <label className="dcc-line-row__agent">
                      담당자
                      <select
                        value={line.agentId || ""}
                        disabled={busy || profiles.length === 0}
                        aria-label={`${line.displayPhone} 담당자`}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next) void onAssignAgent?.(line.id, next);
                        }}
                      >
                        {profiles.length === 0 ? <option value="">담당자 없음</option> : null}
                        {!line.agentId ? <option value="">담당자 선택</option> : null}
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {agentOptionLabel(p)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </section>
          ) : null}

          <section className="dcc-agent-section">
            <h3 className="dcc-agent-section__title">담당자 프리셋</h3>
            {profiles.map((profile) => {
              const usedOn = lines.filter((l) => l.agentId === profile.id);
              return (
                <div key={profile.id} className="dcc-agent-row">
                  {profile.photoUrl ? (
                    <img className="dcc-agent-row__photo" src={profile.photoUrl} alt="" />
                  ) : (
                    <div className="dcc-agent-row__photo dcc-agent-row__photo--empty" aria-hidden>
                      {(profile.displayName || "?").slice(0, 1)}
                    </div>
                  )}
                  <div className="dcc-agent-row__text">
                    <p className="dcc-agent-row__name">{profile.displayName || "이름 없음"}</p>
                    <p className="dcc-agent-row__meta">
                      {[profile.title, profile.department].filter(Boolean).join(" · ") || "직급·부서 미입력"}
                      {usedOn.length
                        ? ` · ${usedOn.map((l) => l.displayPhone).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="dcc-agent-row__actions">
                    <button type="button" onClick={() => startEdit(profile)} disabled={busy}>
                      <Pencil size={12} />
                    </button>
                    <button type="button" className="is-danger" onClick={() => removeProfile(profile)} disabled={busy}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {formOpen ? (
              <div className="dcc-agent-form">
                <label>
                  이름
                  <input
                    type="text"
                    value={form.displayName}
                    maxLength={120}
                    onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                    placeholder="통화 화면에 보일 이름"
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
                    <img className="dcc-agent-row__photo" src={form.photoUrl} alt="" />
                  ) : (
                    <div className="dcc-agent-row__photo dcc-agent-row__photo--empty">사진</div>
                  )}
                  <label>
                    프로필 사진
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
                disabled={busy || profiles.length >= maxCount}
              >
                <Plus size={14} /> 담당자 추가
                {profiles.length >= maxCount ? ` (최대 ${maxCount}명)` : ""}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
