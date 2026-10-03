import { useEffect, useRef, useState } from "react";
import { writeAppSettings } from "../../lib/vlueAppSettings.js";
import {
  clipIntroLines,
  introNeedsMoreLines,
  INTRO_PREVIEW_LINES
} from "../../lib/mycase/mycaseIntroRichText.js";
import MyCaseIntroRichText from "./MyCaseIntroRichText.jsx";

const MAX_LEN = 200;
const DRAFT_KEY = "vlue_mycase_intro_draft_v1";

function readDraft() {
  try {
    return String(sessionStorage.getItem(DRAFT_KEY) || "");
  } catch {
    return "";
  }
}

function writeDraft(text) {
  try {
    const next = String(text || "");
    if (!next.trim()) sessionStorage.removeItem(DRAFT_KEY);
    else sessionStorage.setItem(DRAFT_KEY, next.slice(0, MAX_LEN));
  } catch {
    /* ignore */
  }
}

/**
 * 케이스함 프로필 — 이름 아래 케이스 소개글 (텍스트·링크)
 */
export default function MyCaseIntroEditor({ value = "", onSaved }) {
  const saved = String(value || "");
  const [editing, setEditing] = useState(() => !saved.trim() || Boolean(readDraft().trim()));
  const [draft, setDraft] = useState(() => {
    const pending = readDraft();
    return pending.trim() ? pending : saved;
  });
  const [expanded, setExpanded] = useState(false);
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  const onSavedRef = useRef(onSaved);
  const editingRef = useRef(editing);
  draftRef.current = draft;
  savedRef.current = saved;
  onSavedRef.current = onSaved;
  editingRef.current = editing;

  useEffect(() => {
    if (editing) return;
    setDraft(saved);
  }, [saved, editing]);

  useEffect(() => {
    setExpanded(false);
  }, [saved]);

  /* 저장된 값이 비면 입력 UI를 다시 연다 */
  useEffect(() => {
    if (!saved.trim() && !editing) {
      setEditing(true);
      setDraft(readDraft() || "");
    }
  }, [saved, editing]);

  /* 탭 이탈(언마운트) 시 편집 중 내용 자동 저장 */
  useEffect(() => {
    return () => {
      if (!editingRef.current) return;
      const text = String(draftRef.current || "")
        .replace(/\r\n/g, "\n")
        .trim()
        .slice(0, MAX_LEN);
      if (!text) {
        writeDraft("");
        return;
      }
      writeDraft("");
      if (text !== String(savedRef.current || "").trim()) {
        writeAppSettings({ statusMessage: text });
        onSavedRef.current?.(text);
      }
    };
  }, []);

  const persist = (next) => {
    const normalized = String(next || "")
      .replace(/\r\n/g, "\n")
      .trim()
      .slice(0, MAX_LEN);
    writeDraft("");
    writeAppSettings({ statusMessage: normalized });
    onSaved?.(normalized);
    setEditing(!normalized);
    setDraft(normalized);
    setExpanded(false);
  };

  const onDraftChange = (text) => {
    setDraft(text);
    writeDraft(text);
  };

  if (editing) {
    return (
      <div className="ig-mycase__intro">
        <textarea
          className="ig-mycase__intro-input"
          value={draft}
          maxLength={MAX_LEN}
          rows={4}
          placeholder="케이스 소개글 또는 링크를 입력하세요"
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={() => {
            const text = String(draft || "").replace(/\r\n/g, "\n").trim().slice(0, MAX_LEN);
            if (text && text !== saved.trim()) persist(text);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              persist(draft);
            }
          }}
        />
        <div className="ig-mycase__intro-actions">
          <button
            type="button"
            className="ig-mycase__intro-btn ig-mycase__intro-btn--primary"
            onClick={() => persist(draft)}
          >
            확인
          </button>
          {saved.trim() ? (
            <button
              type="button"
              className="ig-mycase__intro-btn"
              onClick={() => {
                writeDraft("");
                setDraft(saved);
                setEditing(false);
              }}
            >
              취소
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!saved.trim()) {
    return (
      <div className="ig-mycase__intro">
        <button
          type="button"
          className="ig-mycase__intro-btn ig-mycase__intro-btn--primary"
          onClick={() => {
            setDraft("");
            setEditing(true);
          }}
        >
          소개글·링크 추가
        </button>
      </div>
    );
  }

  const needsMore = introNeedsMoreLines(saved, INTRO_PREVIEW_LINES);
  const visibleText = expanded || !needsMore ? saved : clipIntroLines(saved, INTRO_PREVIEW_LINES);

  return (
    <div className="ig-mycase__intro">
      <p className="ig-mycase__status ig-mycase__status--linked">
        <MyCaseIntroRichText text={visibleText} />
        {needsMore && !expanded ? (
          <button
            type="button"
            className="ig-mycase__intro-more"
            onClick={() => setExpanded(true)}
          >
            …더보기
          </button>
        ) : null}
      </p>
      <div className="ig-mycase__intro-actions">
        <button
          type="button"
          className="ig-mycase__intro-btn"
          onClick={() => {
            setDraft(saved);
            setEditing(true);
          }}
        >
          수정
        </button>
        <button
          type="button"
          className="ig-mycase__intro-btn ig-mycase__intro-btn--danger"
          onClick={() => persist("")}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
