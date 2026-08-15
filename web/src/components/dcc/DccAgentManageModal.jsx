import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";
import {
  createDccAgentProfile,
  deleteDccAgentProfile,
  updateDccAgentProfile
} from "../../lib/dccAgentProfilesApi.js";
import { agentOptionLabel, applyDccAgentToLocalCard } from "../../lib/dccAgentProfileState.js";

const EMPTY_FORM = {
  displayName: "",
  title: "",
  department: "",
  photoUrl: "",
  photoFocus: "center"
};

export default function DccAgentManageModal({
  open,
  profiles = [],
  maxCount = 20,
  onClose,
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
      const res = editingId
        ? await updateDccAgentProfile(editingId, payload)
        : await createDccAgentProfile(payload);
      if (res.profile?.isActive) applyDccAgentToLocalCard(res.profile);
      onToast?.(editingId ? "담당자 정보를 저장했습니다." : "담당자를 등록했습니다.");
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

  return createPortal(
    <div className="dcc-agent-modal" role="dialog" aria-modal="true" aria-labelledby="dcc-agent-modal-title">
      <div className="dcc-agent-modal__sheet">
        <div className="dcc-agent-modal__head">
          <div>
            <h2 id="dcc-agent-modal-title" className="dcc-agent-modal__title">
              담당자 프로필
            </h2>
            <p className="dcc-agent-modal__sub">
              유선·대표번호에서 발·수신 시 노출될 담당자를 미리 등록하고, 드롭다운으로 바로 바꿉니다.
            </p>
          </div>
          <button type="button" className="dcc-agent-modal__close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="dcc-agent-modal__body">
          {profiles.map((profile) => (
            <div key={profile.id} className={`dcc-agent-row${profile.isActive ? " is-active" : ""}`}>
              {profile.photoUrl ? (
                <img className="dcc-agent-row__photo" src={profile.photoUrl} alt="" />
              ) : (
                <div className="dcc-agent-row__photo dcc-agent-row__photo--empty" aria-hidden>
                  {(profile.displayName || "?").slice(0, 1)}
                </div>
              )}
              <div className="dcc-agent-row__text">
                <p className="dcc-agent-row__name">
                  {profile.displayName || "이름 없음"}
                  {profile.isActive ? <span className="dcc-agent-row__badge">사용 중</span> : null}
                </p>
                <p className="dcc-agent-row__meta">
                  {[profile.title, profile.department].filter(Boolean).join(" · ") || "직급·부서 미입력"}
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
          ))}

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
        </div>
      </div>
    </div>,
    document.body
  );
}
