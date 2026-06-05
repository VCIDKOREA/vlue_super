import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Table2,
  Loader,
  Save,
  Plus,
  FolderOpen,
  Wand2,
  AlertCircle,
  Cloud,
  CloudOff,
  History,
  Columns,
  Filter,
  Download,
  Shield,
  Search,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { MarketingAuthUser } from './AuthModal';
import {
  createExcelWorkbook,
  fetchExcelTemplates,
  fetchExcelWorkbook,
  fetchExcelWorkbooks,
  generateExcelWorkbook,
  saveExcelWorkbook,
} from '../../../lib/vlueOfficeExcelApi.js';
import SensitiveRightClickGuard from './SensitiveRightClickGuard';
import {
  DEMO_PREVIEW_WORKBOOK_ID,
  DEMO_TEMPLATE_CATALOG,
  EXCEL_CAPABILITY_CHIPS,
  PROMPT_SUGGESTIONS,
  buildDemoModel,
  friendlyApiError,
  isNetworkFetchError,
} from './officeExcelDemo';
import './excel-workshop.css';

type WorkbookModel = {
  meta?: { title?: string; templateId?: string };
  sheets?: Array<{
    id: string;
    name: string;
    cellData?: Record<string, { v?: string | number | null; f?: string | null }>;
  }>;
};

const AI_STEPS = ['의도 분석', '템플릿 매칭', '열·수식 구성', '샘플 행 채우기'];

function parseRc(key: string) {
  const m = /^r(\d+)c(\d+)$/.exec(key);
  if (!m) return null;
  return { r: Number(m[1]), c: Number(m[2]) };
}

function colLabel(c: number): string {
  let n = c;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function gridFromSheet(sheet: NonNullable<WorkbookModel['sheets']>[number] | undefined) {
  const cells = sheet?.cellData || {};
  let maxR = 0;
  let maxC = 0;
  const map = new Map<string, string>();
  const formulas = new Map<string, string>();
  for (const [key, cell] of Object.entries(cells)) {
    const rc = parseRc(key);
    if (!rc) continue;
    maxR = Math.max(maxR, rc.r);
    maxC = Math.max(maxC, rc.c);
    map.set(key, cell?.v != null ? String(cell.v) : '');
    if (cell?.f) formulas.set(key, cell.f);
  }
  const rows = Math.max(maxR + 3, 14);
  const cols = Math.max(maxC + 1, 8);
  return { rows, cols, map, formulas, sheetName: sheet?.name || 'Sheet1' };
}

function modelFromGrid(
  base: WorkbookModel | null,
  sheetName: string,
  rows: number,
  cols: number,
  map: Map<string, string>
): WorkbookModel {
  const cellData: Record<string, { v: string }> = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = map.get(`r${r}c${c}`) ?? '';
      if (v.trim()) cellData[`r${r}c${c}`] = { v };
    }
  }
  const sheetId = base?.sheets?.[0]?.id || 'sheet1';
  return {
    meta: {
      title: base?.meta?.title || 'AI 엑셀 워크북',
      templateId: base?.meta?.templateId,
    },
    sheets: [
      {
        id: sheetId,
        name: sheetName,
        rowCount: rows,
        columnCount: cols,
        cellData,
      },
    ],
  };
}

function applyModelToState(
  m: WorkbookModel,
  setModel: (v: WorkbookModel) => void,
  setGridMap: (v: Map<string, string>) => void
) {
  setModel(m);
  setGridMap(gridFromSheet(m.sheets?.[0]).map);
}

interface Props {
  user: MarketingAuthUser | null;
  onLoginClick: () => void;
}

export default function OfficeExcelWorkshop({ user, onLoginClick }: Props) {
  const [templates, setTemplates] = useState<Array<{ id: string; title: string }>>([]);
  const [workbooks, setWorkbooks] = useState<Array<{ id: string; title: string; headRevisionNum: number }>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [baseRevisionNum, setBaseRevisionNum] = useState(0);
  const [model, setModel] = useState<WorkbookModel | null>(null);
  const [gridMap, setGridMap] = useState(() => new Map<string, string>());
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('group_buy_order_v1');
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');
  const [apiNotice, setApiNotice] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [selectedCell, setSelectedCell] = useState({ r: 0, c: 0 });
  const [aiStep, setAiStep] = useState(-1);
  const [wbSearch, setWbSearch] = useState('');
  const previewBootstrapped = useRef(false);

  const grid = useMemo(() => gridFromSheet(model?.sheets?.[0]), [model]);

  const filledCells = useMemo(() => {
    let n = 0;
    gridMap.forEach((v) => {
      if (v.trim()) n += 1;
    });
    return n;
  }, [gridMap]);

  const filteredWorkbooks = useMemo(() => {
    const q = wbSearch.trim().toLowerCase();
    if (!q) return workbooks;
    return workbooks.filter((w) => w.title.toLowerCase().includes(q));
  }, [workbooks, wbSearch]);

  const enterDemoPreview = useCallback(() => {
    const preview = buildDemoModel('group_buy_order_v1', { withSamples: true });
    applyModelToState(preview, setModel, setGridMap);
    setActiveId(DEMO_PREVIEW_WORKBOOK_ID);
    setBaseRevisionNum(1);
    setWorkbooks([
      { id: DEMO_PREVIEW_WORKBOOK_ID, title: '체험 · 공구 주문 취합표', headRevisionNum: 1 },
    ]);
    setTemplates(DEMO_TEMPLATE_CATALOG.map((t) => ({ id: t.id, title: t.title })));
  }, []);

  const loadLists = useCallback(async () => {
    if (!user) return;
    try {
      const [t, w] = await Promise.all([fetchExcelTemplates(), fetchExcelWorkbooks()]);
      setDemoMode(false);
      setApiNotice('');
      setTemplates(t.templates?.length ? t.templates : DEMO_TEMPLATE_CATALOG.map((x) => ({ id: x.id, title: x.title })));
      const list = w.workbooks || [];
      setWorkbooks(list);
      if (!list.length && !previewBootstrapped.current) {
        previewBootstrapped.current = true;
        enterDemoPreview();
      }
    } catch (e) {
      setDemoMode(true);
      setApiNotice(friendlyApiError(e));
      if (!isNetworkFetchError(e)) {
        setError(friendlyApiError(e));
      } else {
        setError('');
      }
      if (!previewBootstrapped.current) {
        previewBootstrapped.current = true;
        enterDemoPreview();
      }
    }
  }, [user, enterDemoPreview]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const openWorkbook = async (id: string) => {
    if (demoMode && id === DEMO_PREVIEW_WORKBOOK_ID) {
      const preview = buildDemoModel(selectedTemplate, { withSamples: true });
      applyModelToState(preview, setModel, setGridMap);
      setActiveId(id);
      setSaveMsg('');
      return;
    }
    if (demoMode) {
      setActiveId(id);
      setSaveMsg('체험 모드: 선택한 워크북은 미리보기 데이터입니다.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await fetchExcelWorkbook(id);
      setActiveId(data.workbook.id);
      setBaseRevisionNum(data.workbook.headRevisionNum);
      setModel(data.model || null);
      setGridMap(gridFromSheet(data.model?.sheets?.[0]).map);
      setSaveMsg('');
    } catch (e) {
      setDemoMode(true);
      setApiNotice(friendlyApiError(e));
      enterDemoPreview();
    } finally {
      setBusy(false);
    }
  };

  const runDemoGenerate = async () => {
    setAiStep(0);
    for (let i = 0; i < AI_STEPS.length; i++) {
      setAiStep(i);
      await new Promise((r) => setTimeout(r, 380));
    }
    const next = buildDemoModel(selectedTemplate, {
      prompt: prompt.trim(),
      title: prompt.trim().slice(0, 40) || undefined,
      withSamples: true,
    });
    applyModelToState(next, setModel, setGridMap);
    setActiveId(DEMO_PREVIEW_WORKBOOK_ID);
    setBaseRevisionNum((n) => n + 1);
    setWorkbooks([
      {
        id: DEMO_PREVIEW_WORKBOOK_ID,
        title: next.meta?.title || 'AI 생성 워크북',
        headRevisionNum: baseRevisionNum + 1,
      },
    ]);
    setAiStep(-1);
    setSaveMsg('AI가 표 구조·샘플 데이터를 구성했습니다. 셀을 수정해 보세요. (체험 모드 — 서버 연결 후 클라우드 저장)');
  };

  const handleGenerate = async () => {
    if (!user) {
      onLoginClick();
      return;
    }
    if (!prompt.trim()) {
      setError('만들고 싶은 장부를 한 줄로 입력해 주세요. (예: 이번 달 공구 주문 취합표)');
      return;
    }
    setBusy(true);
    setError('');
    setSaveMsg('');
    if (demoMode) {
      try {
        await runDemoGenerate();
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const data = await generateExcelWorkbook({
        promptText: prompt.trim(),
        templateId: selectedTemplate,
        workbookId: activeId && activeId !== DEMO_PREVIEW_WORKBOOK_ID ? activeId : undefined,
      });
      if (data.workbookId) {
        await openWorkbook(data.workbookId);
      }
      await loadLists();
      setSaveMsg('AI가 워크북을 생성했습니다. 셀을 수정한 뒤 저장하세요.');
    } catch (e) {
      setDemoMode(true);
      setApiNotice(friendlyApiError(e));
      await runDemoGenerate();
    } finally {
      setBusy(false);
    }
  };

  const handleNewBlank = async () => {
    if (!user) {
      onLoginClick();
      return;
    }
    if (demoMode) {
      const blank = buildDemoModel(selectedTemplate, { withSamples: false, title: '새 워크북' });
      applyModelToState(blank, setModel, setGridMap);
      setActiveId(DEMO_PREVIEW_WORKBOOK_ID);
      setSaveMsg('빈 양식을 열었습니다. AI로 만들기 또는 직접 입력하세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await createExcelWorkbook({ title: '새 워크북', templateId: selectedTemplate });
      await openWorkbook(data.workbook.id);
      await loadLists();
    } catch (e) {
      setDemoMode(true);
      setApiNotice(friendlyApiError(e));
      const blank = buildDemoModel(selectedTemplate, { withSamples: false, title: '새 워크북' });
      applyModelToState(blank, setModel, setGridMap);
      setActiveId(DEMO_PREVIEW_WORKBOOK_ID);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      onLoginClick();
      return;
    }
    if (!activeId || !model) {
      setError('저장할 워크북을 먼저 열거나 AI로 생성해 주세요.');
      return;
    }
    if (demoMode || activeId === DEMO_PREVIEW_WORKBOOK_ID) {
      const nextModel = modelFromGrid(model, grid.sheetName, grid.rows, grid.cols, gridMap);
      setModel(nextModel);
      setSaveMsg('체험 모드: 변경 내용이 이 브라우저 미리보기에 반영되었습니다. API 연결 후 PC·앱과 동기화됩니다.');
      return;
    }
    setBusy(true);
    setError('');
    setSaveMsg('');
    try {
      const nextModel = modelFromGrid(model, grid.sheetName, grid.rows, grid.cols, gridMap);
      const data = await saveExcelWorkbook(activeId, {
        baseRevisionNum,
        model: nextModel,
        changeSummary: 'www 웹 에디터 저장',
      });
      setBaseRevisionNum(data.revisionNum);
      setModel(data.model);
      setSaveMsg(`저장 완료 (rev ${data.revisionNum}) — PC·모바일 앱에서도 동일 데이터가 보입니다.`);
      await loadLists();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'REVISION_CONFLICT') {
        setError('다른 화면에서 수정되었습니다. 목록에서 다시 열어 주세요.');
        await loadLists();
      } else if (isNetworkFetchError(e)) {
        setDemoMode(true);
        setApiNotice(friendlyApiError(e));
        setSaveMsg('서버 미연결 — 로컬 미리보기에만 반영되었습니다.');
      } else {
        setError(err.message || '저장 실패');
      }
    } finally {
      setBusy(false);
    }
  };

  const setCell = (r: number, c: number, value: string) => {
    setGridMap((prev) => {
      const next = new Map(prev);
      next.set(`r${r}c${c}`, value);
      return next;
    });
  };

  const formulaDisplay = gridMap.get(`r${selectedCell.r}c${selectedCell.c}`) ?? '';
  const cellRef = `${colLabel(selectedCell.c)}${selectedCell.r + 1}`;

  if (!user) {
    return (
      <div className="rounded-3xl border border-violet-200 bg-violet-50 p-8 text-center">
        <Table2 className="w-12 h-12 text-violet-600 mx-auto mb-4" />
        <h2 className="text-lg font-black text-slate-900 mb-2">로그인 후 웹 작업실 이용</h2>
        <p className="text-sm text-slate-600 mb-6" style={{ wordBreak: 'keep-all' }}>
          AI엑셀에디터는 <strong>www.vlue.kr 웹</strong>에서만 제작합니다.
          <br />
          PC·모바일은 설치형 앱이며, 웹과 동일 계정·데이터로 연동됩니다.
        </p>
        <button type="button" onClick={onLoginClick} className="btn-primary px-8">
          로그인 / 가입
        </button>
      </div>
    );
  }

  return (
    <SensitiveRightClickGuard className="excel-workshop">
      <div className="excel-workshop__strip">
        {EXCEL_CAPABILITY_CHIPS.map((chip) => (
          <div key={chip.label} className="excel-workshop__chip">
            <strong>{chip.label}</strong>
            <span>{chip.detail}</span>
          </div>
        ))}
      </div>

      <div className="excel-workshop__layout">
        <aside className="excel-workshop__sidebar">
          <div className="excel-workshop__panel">
            <div className="excel-workshop__panel-head">
              <span>AI 템플릿</span>
              <span className="excel-workshop__badge">12+</span>
            </div>
            <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
              {DEMO_TEMPLATE_CATALOG.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`excel-workshop__template-card ${selectedTemplate === t.id ? 'is-active' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <strong>{t.title}</strong>
                    <span className="excel-workshop__badge">{t.badge}</span>
                  </div>
                  <small>{t.description}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="excel-workshop__panel">
            <div className="excel-workshop__panel-head">
              <span>내 워크북</span>
              <button
                type="button"
                onClick={handleNewBlank}
                disabled={busy}
                className="text-violet-700 hover:underline text-[10px] font-bold"
              >
                + 새 시트
              </button>
            </div>
            <div className="p-2">
              <div className="relative mb-2">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={wbSearch}
                  onChange={(e) => setWbSearch(e.target.value)}
                  placeholder="워크북 검색"
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                />
              </div>
              <ul className="max-h-36 overflow-y-auto space-y-0.5">
                {filteredWorkbooks.map((wb) => (
                  <li key={wb.id}>
                    <button
                      type="button"
                      onClick={() => openWorkbook(wb.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] truncate ${
                        activeId === wb.id
                          ? 'bg-violet-100 text-violet-800 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <FolderOpen className="w-3 h-3 inline mr-1 opacity-60" />
                      {wb.title}
                      <span className="float-right text-[9px] text-slate-400">rev{wb.headRevisionNum}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
            <Shield className="w-3 h-3 inline mr-0.5 opacity-70" />
            엑셀 제작은 www 전용 · PC·앱은 동일 계정으로 열람·동기화
          </p>
        </aside>

        <div className="excel-workshop__main">
          <div className="excel-workshop__ai">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-black text-violet-900">AI 워크북 생성</span>
                <span className="text-[10px] font-bold text-violet-600 bg-white/80 px-2 py-0.5 rounded-full border border-violet-200">
                  웹 전용 · GPT 구조화
                </span>
              </div>
              <span
                className={`excel-workshop__sync-pill ${demoMode ? 'excel-workshop__sync-pill--demo' : 'excel-workshop__sync-pill--live'}`}
              >
                {demoMode ? <CloudOff className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                {demoMode ? '체험 미리보기' : '클라우드 연동'}
              </span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="예: 3월 공구 주문 취합표 — 이름, 연락처, 수량, 입금여부, 합계 행 포함"
              className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm mb-2 resize-none bg-white/90"
            />
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="excel-workshop__prompt-chip"
                  onClick={() => setPrompt(s)}
                >
                  {s.length > 28 ? `${s.slice(0, 28)}…` : s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="rounded-xl border border-slate-200 text-xs px-2 py-2 bg-white min-w-[140px]"
              >
                {(templates.length ? templates : DEMO_TEMPLATE_CATALOG).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md"
              >
                {busy ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                AI로 만들기
              </button>
            </div>
            {aiStep >= 0 && (
              <div className="excel-workshop__ai-steps">
                {AI_STEPS.map((label, i) => (
                  <span
                    key={label}
                    className={`excel-workshop__ai-step ${i < aiStep ? 'is-done' : ''} ${i === aiStep ? 'is-active' : ''}`}
                  >
                    {i < aiStep ? '✓ ' : ''}
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {apiNotice && (
            <div className="excel-workshop__notice excel-workshop__notice--warn">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{apiNotice}</span>
            </div>
          )}
          {error && (
            <div className="excel-workshop__notice excel-workshop__notice--err">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {saveMsg && (
            <div className="excel-workshop__notice excel-workshop__notice--ok">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {saveMsg}
            </div>
          )}

          <div className="excel-workshop__sheet-shell">
            <div className="excel-workshop__ribbon">
              <div className="excel-workshop__ribbon-group">
                <button type="button" className="excel-workshop__ribbon-btn" disabled title="앱에서 지원">
                  <Columns className="w-3 h-3" /> 열
                </button>
                <button type="button" className="excel-workshop__ribbon-btn" disabled>
                  <Filter className="w-3 h-3" /> 필터
                </button>
              </div>
              <div className="excel-workshop__ribbon-group">
                <button type="button" className="excel-workshop__ribbon-btn" disabled>
                  <History className="w-3 h-3" /> 이력
                </button>
                <button type="button" className="excel-workshop__ribbon-btn" disabled>
                  <Download className="w-3 h-3" />보내기
                </button>
              </div>
              <div className="excel-workshop__ribbon-group ml-auto">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy}
                  className="excel-workshop__save-btn"
                >
                  {busy ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  저장 · 동기화
                </button>
              </div>
            </div>

            <div className="excel-workshop__formula">
              <span className="excel-workshop__cell-ref">{cellRef}</span>
              <span className="text-[10px] text-slate-400 font-bold">fx</span>
              <input
                readOnly
                className="excel-workshop__formula-input"
                value={formulaDisplay}
                placeholder="셀 값 또는 수식"
              />
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/80">
              <span className="text-xs font-bold text-slate-800 truncate">
                {model?.meta?.title || '워크북'} · {grid.sheetName}
              </span>
              {!demoMode && activeId && (
                <span className="text-[10px] text-slate-500 font-mono">rev {baseRevisionNum}</span>
              )}
            </div>

            <div className="excel-workshop__tabs">
              <span className="excel-workshop__tab">{grid.sheetName}</span>
              <button type="button" disabled className="opacity-40 text-[10px] px-2">
                <Plus className="w-3 h-3 inline" /> 시트 추가
              </button>
            </div>

            <div className="excel-workshop__grid-wrap">
              <table className="excel-workshop__grid">
                <thead>
                  <tr>
                    <th className="excel-workshop__corner" />
                    {Array.from({ length: grid.cols }, (_, c) => (
                      <th key={c} className="excel-workshop__col-head">
                        {colLabel(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: grid.rows }, (_, r) => (
                    <tr key={r} className={r === 0 ? 'excel-workshop__row--header' : ''}>
                      <td className="excel-workshop__row-head">{r + 1}</td>
                      {Array.from({ length: grid.cols }, (_, c) => {
                        const selected = selectedCell.r === r && selectedCell.c === c;
                        return (
                          <td
                            key={c}
                            className={selected ? 'excel-workshop__cell--selected' : ''}
                          >
                            <input
                              type="text"
                              value={gridMap.get(`r${r}c${c}`) ?? ''}
                              onChange={(e) => setCell(r, c, e.target.value)}
                              onFocus={() => setSelectedCell({ r, c })}
                              className="excel-workshop__cell-input"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="excel-workshop__statusbar">
              <span>
                <strong>{filledCells}</strong>개 채움 · {grid.rows}×{grid.cols} · 템플릿{' '}
                <strong>{selectedTemplate.replace(/_v\d+$/, '')}</strong>
              </span>
              <span>
                {demoMode ? '로컬 체험' : 'VLUE Office Excel'} · www 제작 → 앱 동기화
              </span>
            </div>
          </div>
        </div>
      </div>
    </SensitiveRightClickGuard>
  );
}
