import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Star, Trash2, UserRound, Users, X } from "lucide-react";
import {
  deleteDccAgentProfile,
  setDccProfileContacts,
  setRepresentativeDccProfile
} from "../../lib/dccAgentProfilesApi.js";
import {
  agentOptionLabel,
  cacheBustMediaUrl,
  writeEditingMultiDccProfileId
} from "../../lib/dccAgentProfileState.js";
import { createCleanMultiDccProfileAndSwitch } from "../../lib/multiDccSwitch.js";
import { readLetteringFixedIdentity } from "../../lib/letteringBizcardStorage.js";
import { SOHO_BROADCAST_MONTHLY_KRW } from "../../lib/membershipBm.js";
import "./dcc-agent-switcher.css";

export { writeEditingMultiDccProfileId };

/**
 * 계정 전환 — YouTube형 리스트.
 * 탭 = 즉시 전환 / +새 프로필 = 생성+전환 / 대표·연락처만 부가.
 */
export default function DccAgentManageModal({
  open,
  lines = [],
  profiles = [],
  maxCount = 20,
  allowedSlots = 1,
  monthlyKrw = SOHO_BROADCAST_MONTHLY_KRW,
  openCreateForm = false,
  onCreateFormConsumed,
  onClose,
  onChanged,
  onToast,
  onSwitchProfile,
  onRequestPayCreate,
  onCreateAndSwitch
}) {
  const [busy, setBusy] = useState(false);
  const [contactsForId, setContactsForId] = useState("");
  const [contactsDraft, setContactsDraft] = useState("");

  const slots = Number(allowedSlots) || Number(maxCount) || 1;
  const needPayToCreate = profiles.length >= slots;

  const identity = useMemo(() => {
    try {
      return readLetteringFixedIdentity();
    } catch {
      return { name: "", phone: "" };
    }
  }, [open]);

  const sharedName = String(identity.name || "").trim();
  const sharedPhone = String(identity.phone || "").trim();

  useEffect(() => {
    if (!open) {
      setContactsForId("");
      setContactsDraft("");
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !openCreateForm) return;
    onCreateFormConsumed?.();
    void createNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openCreateForm one-shot
  }, [open, openCreateForm]);

  const createNew = async () => {
    if (needPayToCreate) {
      onRequestPayCreate?.();
      return;
    }
    setBusy(true);
    try {
      if (typeof onCreateAndSwitch === "function") {
        await onCreateAndSwitch();
      } else {
        const profile = await createCleanMultiDccProfileAndSwitch({
          lines,
          nextIndex: profiles.length + 1,
          profiles
        });
        onToast?.(
          `「${profile.label || "새 프로필"}」로 전환했습니다. 이름·전화 외 정보는 새로 입력하세요.`
        );
        await onChanged?.();
        onClose?.();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "프로필 생성에 실패했습니다.";
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

  const switchRow = async (profile) => {
    if (!profile?.id || busy) return;
    if (profile.isActive) {
      onClose?.();
      return;
    }
    setBusy(true);
    try {
      await onSwitchProfile?.(profile);
    } finally {
      setBusy(false);
    }
  };

  const makeRepresentative = async (profile, e) => {
    e?.stopPropagation?.();
    if (!profile?.id || profile.isRepresentative) return;
    setBusy(true);
    try {
      await setRepresentativeDccProfile(profile.id);
      onToast?.("대표 계정으로 지정했습니다. 이름·전화 검색에 이 계정이 나타납니다.");
      await onChanged?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "대표 지정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const removeProfile = async (profile, e) => {
    e?.stopPropagation?.();
    if (profile.isRepresentative) {
      onToast?.("대표 계정은 삭제할 수 없습니다. 다른 계정을 대표로 지정한 뒤 삭제하세요.");
      return;
    }
    if (!window.confirm(`「${agentOptionLabel(profile)}」을(를) 삭제할까요?`)) return;
    setBusy(true);
    try {
      await deleteDccAgentProfile(profile.id);
      onToast?.("프로필을 삭제했습니다.");
      await onChanged?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const openContacts = (profile, e) => {
    e?.stopPropagation?.();
    setContactsForId(profile.id);
    setContactsDraft((profile.contactPhones || []).join("\n"));
  };

  const saveContacts = async () => {
    if (!contactsForId) return;
    setBusy(true);
    try {
      const phones = String(contactsDraft || "")
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await setDccProfileContacts(contactsForId, phones);
      onToast?.(
        phones.length
          ? "연락처를 저장했습니다. 지정된 번호와 통화 시 이 계정의 쇼케이스가 송출됩니다."
          : "연락처 지정을 해제했습니다."
      );
      setContactsForId("");
      await onChanged?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "연락처 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  const contactsProfile = profiles.find((p) => p.id === contactsForId) || null;

  return createPortal(
    <div className="dcc-agent-modal" role="dialog" aria-modal="true" aria-labelledby="dcc-agent-modal-title">
      <div className="dcc-agent-modal__sheet dcc-switcher-sheet">
        <div className="dcc-agent-modal__head">
          <div>
            <h2 id="dcc-agent-modal-title" className="dcc-agent-modal__title">
              계정 전환
            </h2>
          </div>
          <button type="button" className="dcc-agent-modal__close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="dcc-agent-modal__body">
          <div className="dcc-switcher-master">
            <div className="dcc-switcher-master__avatar" aria-hidden>
              <UserRound size={22} />
            </div>
            <div className="dcc-switcher-master__text">
              <p className="dcc-switcher-master__name">{sharedName || "내 계정"}</p>
              <p className="dcc-switcher-master__phone">{sharedPhone || "전화번호"}</p>
            </div>
          </div>

          <div className="dcc-switcher-divider" />

          <ul className="dcc-switcher-list">
            {profiles.map((profile) => {
              const photoSrc = cacheBustMediaUrl(profile.photoUrl, profile.updatedAt || profile.id);
              const contactCount = Array.isArray(profile.contactPhones)
                ? profile.contactPhones.length
                : 0;
              return (
                <li key={profile.id}>
                  <button
                    type="button"
                    className={`dcc-switcher-row${profile.isActive ? " is-active" : ""}`}
                    disabled={busy}
                    onClick={() => void switchRow(profile)}
                  >
                    {photoSrc ? (
                      <img className="dcc-switcher-row__photo" src={photoSrc} alt="" />
                    ) : (
                      <div className="dcc-switcher-row__photo dcc-switcher-row__photo--empty" aria-hidden>
                        {(profile.label || profile.displayName || "?").slice(0, 1)}
                      </div>
                    )}
                    <div className="dcc-switcher-row__text">
                      <p className="dcc-switcher-row__name">
                        {profile.label || profile.displayName || "프로필"}
                        {profile.isRepresentative ? (
                          <span className="dcc-switcher-row__badge">대표</span>
                        ) : null}
                      </p>
                      <p className="dcc-switcher-row__meta">
                        {sharedPhone || "공유 전화번호"}
                        {contactCount ? ` · 연락처 ${contactCount}` : ""}
                        {!profile.hasShowcase && !profile.hasDcc ? " · 새로 설정 필요" : ""}
                      </p>
                    </div>
                    {profile.isActive ? (
                      <Check className="dcc-switcher-row__check" size={18} strokeWidth={2.5} />
                    ) : null}
                  </button>
                  <div className="dcc-switcher-row__tools">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => openContacts(profile, e)}
                      title="연락처 지정"
                    >
                      <Users size={14} />
                      연락처
                    </button>
                    {!profile.isRepresentative ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => void makeRepresentative(profile, e)}
                        title="대표 계정"
                      >
                        <Star size={14} />
                        대표
                      </button>
                    ) : null}
                    {!profile.isRepresentative ? (
                      <button
                        type="button"
                        className="is-danger"
                        disabled={busy}
                        onClick={(e) => void removeProfile(profile, e)}
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className={`dcc-switcher-add${needPayToCreate ? " is-pay" : ""}`}
            disabled={busy}
            onClick={() => void createNew()}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {needPayToCreate
              ? `결제하고 새 프로필 · 월 ${Number(monthlyKrw).toLocaleString("ko-KR")}원`
              : "+ 새 프로필 만들기"}
          </button>
          <p className="dcc-switcher-hint">
            새 프로필은 이름·전화번호만 유지된 빈 계정입니다. 탭하면 앱 전체가 그 계정으로 바뀝니다.
          </p>
        </div>

        {contactsProfile ? (
          <div className="dcc-contacts-sheet" role="dialog" aria-label="연락처 지정">
            <div className="dcc-contacts-sheet__head">
              <h3>연락처 지정</h3>
              <button type="button" onClick={() => setContactsForId("")} aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            <p className="dcc-contacts-sheet__sub">
              「{contactsProfile.label || contactsProfile.displayName}」로 소통할 전화번호를 한 줄에
              하나씩 입력하세요. 지정된 번호와 통화 시 이 계정의 쇼케이스가 송출됩니다.
            </p>
            <textarea
              className="dcc-contacts-sheet__input"
              rows={6}
              value={contactsDraft}
              onChange={(e) => setContactsDraft(e.target.value)}
              placeholder={"010-1234-5678\n010-9876-5432"}
              disabled={busy}
            />
            <div className="dcc-contacts-sheet__actions">
              <button type="button" className="is-ghost" disabled={busy} onClick={() => setContactsForId("")}>
                취소
              </button>
              <button type="button" className="is-primary" disabled={busy} onClick={() => void saveContacts()}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                저장
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
