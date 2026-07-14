import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, AlertCircle, CreditCard, FolderOpen } from 'lucide-react';
import {
  readCardWallet,
  writeCardWallet,
  partitionCardWallet,
  resolveWalletProfile,
} from '../../../lib/cardWalletStorage.js';
import { fetchOfficeFiles } from '../../../lib/vlueOfficeApi.js';
import { ASSET_FILES_CHANGED, mapOfficeFilesForUi } from '../../../lib/vlueAssetFilesStorage.js';
import {
  PERSONAL_CASE_NOTES_CHANGED,
  readPersonalCaseNotes,
  removePersonalCaseNote,
} from '../../../lib/personalCaseNotesStorage.js';
import VaultSavedShowcaseRow from '../../../components/VaultSavedShowcaseRow.jsx';
import VaultSavedFileRow from '../../../components/VaultSavedFileRow.jsx';
import LetteringIncomingNotification from '../../../components/LetteringIncomingNotification.jsx';
import SensitiveRightClickGuard from '../components/SensitiveRightClickGuard';
import '../../../styles/wallet-hub-push.css';
import '../../../styles/showcase-call-glass.css';

interface ResourcesPageProps {
  user?: { email: string } | null;
}

const TABS = [
  { id: 'received', label: '명함저장' },
  { id: 'showcases', label: '저장된케이스' },
  { id: 'mydocs', label: '내문서' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type WalletItem = {
  id?: string;
  userId?: string;
  savedAt?: string;
  source?: string;
  snapshot?: Record<string, unknown>;
};

function ReceivedCardRow({
  item,
  profile,
  onRemove,
}: {
  item: WalletItem;
  profile: Record<string, unknown>;
  onRemove: (userId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const phone = String(profile.phone || '').trim();
  const userId = String(item.userId || '');

  return (
    <li className="wallet-hub-push">
      <div className="lettering-home-push-embed">
        <LetteringIncomingNotification
          verified
          previewMode
          showOwnerSettings={false}
          callPhase="connected"
          platform="android"
          isRecording={false}
          callDurationSec={0}
          recordingDurationSec={0}
          incomingNumber={phone}
          card={{
            ...profile,
            membershipTier: (profile.membershipTier as string) || 'premium',
          }}
          includeDigitalCard={false}
          expandContent={false}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onEndCall={() => setExpanded(false)}
          className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--home-glass wallet-hub-push__notification"
        />
      </div>
      {expanded && userId ? (
        <div className="wallet-hub-push__footer">
          <button
            type="button"
            className="wallet-hub-push__footer-btn wallet-hub-push__footer-btn--danger"
            onClick={() => onRemove(userId)}
          >
            삭제
          </button>
        </div>
      ) : null}
    </li>
  );
}

export default function ResourcesPage({ user }: ResourcesPageProps) {
  const [tab, setTab] = useState<TabId>('received');
  const [walletCards, setWalletCards] = useState<WalletItem[]>([]);
  const [vaultFiles, setVaultFiles] = useState<unknown[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [caseNotes, setCaseNotes] = useState(() => readPersonalCaseNotes());

  const refreshWallet = useCallback(() => {
    setWalletCards(readCardWallet() as WalletItem[]);
  }, []);

  const refreshCaseNotes = useCallback(() => {
    setCaseNotes(readPersonalCaseNotes());
  }, []);

  const refreshVaultFiles = useCallback(async () => {
    setVaultLoading(true);
    try {
      const data = await fetchOfficeFiles();
      setVaultFiles(mapOfficeFilesForUi(data.files || []));
    } catch {
      setVaultFiles([]);
    } finally {
      setVaultLoading(false);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  }, []);

  useEffect(() => {
    refreshWallet();
    refreshVaultFiles();
    refreshCaseNotes();
    const onWallet = () => refreshWallet();
    const onFiles = () => refreshVaultFiles();
    const onNotes = () => refreshCaseNotes();
    window.addEventListener('vlue-card-wallet-changed', onWallet);
    window.addEventListener(ASSET_FILES_CHANGED, onFiles);
    window.addEventListener(PERSONAL_CASE_NOTES_CHANGED, onNotes);
    return () => {
      window.removeEventListener('vlue-card-wallet-changed', onWallet);
      window.removeEventListener(ASSET_FILES_CHANGED, onFiles);
      window.removeEventListener(PERSONAL_CASE_NOTES_CHANGED, onNotes);
    };
  }, [refreshWallet, refreshVaultFiles, refreshCaseNotes]);

  const { showcases: showcaseCards, received: receivedCards } = useMemo(
    () => partitionCardWallet(walletCards),
    [walletCards]
  );

  const removeFromWallet = useCallback(
    (userId: string) => {
      const next = readCardWallet().filter((item: WalletItem) => item.userId !== userId);
      writeCardWallet(next);
      refreshWallet();
      showToast('삭제했습니다.');
    },
    [refreshWallet, showToast]
  );

  const activeLabel = TABS.find((t) => t.id === tab)?.label || '';

  return (
    <main className="min-h-screen bg-blue-tint pt-16">
      <div className="bg-primary-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-semibold">VLUE 개인케이스</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">개인케이스</h1>
          <p className="text-white/70 text-sm">
            앱과 동일하게 명함저장 · 저장된케이스 · 내문서를 관리합니다.
          </p>
        </div>
      </div>

      <SensitiveRightClickGuard className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-4">
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-semibold text-sm">로그인이 필요한 서비스입니다.</p>
              <p className="text-amber-600 text-xs mt-0.5">
                개인케이스는 회원가입 및 로그인 후 웹·앱에서 동일하게 이용할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-3xl bg-slate-50 shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="border-b border-slate-200/80 px-4 pt-4 pb-0 sm:px-5">
            <p className="text-[12px] text-slate-500 mb-3">{activeLabel}</p>
            <div
              role="tablist"
              aria-label="개인케이스 메뉴"
              className="flex gap-2 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {TABS.map((t) => {
                const count =
                  t.id === 'received'
                    ? receivedCards.length
                    : t.id === 'showcases'
                      ? showcaseCards.length
                      : 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-black transition-colors ${
                      tab === t.id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    {t.label}
                    {count > 0 ? (
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${
                          t.id === 'showcases' ? 'bg-indigo-500' : 'bg-blue-500'
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-5 sm:px-5 min-h-[280px]">
            {tab === 'received' && (
              <div className="space-y-4">
                {receivedCards.length === 0 ? (
                  <div className="rounded-2xl bg-white py-14 text-center ring-1 ring-slate-100">
                    <CreditCard className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-[14px] font-bold text-slate-500">받은 명함이 없습니다</p>
                  </div>
                ) : (
                  <ul className="wallet-hub-push-list space-y-3">
                    {receivedCards.map((item: WalletItem) => {
                      const profile = resolveWalletProfile(item, {});
                      return (
                        <ReceivedCardRow
                          key={item.id || item.userId}
                          item={item}
                          profile={profile}
                          onRemove={removeFromWallet}
                        />
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {tab === 'showcases' && (
              <div className="space-y-4">
                {showcaseCards.length === 0 ? (
                  <div className="rounded-2xl bg-white py-14 text-center ring-1 ring-slate-100">
                    <FolderOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-[14px] font-bold text-slate-500">저장된 케이스가 없습니다</p>
                    <p className="mt-2 px-6 text-[12px] leading-relaxed text-slate-400">
                      통화 목록에서 쇼케이스를 다시 본 뒤 「업체 저장하기」를 누르면 여기에 모입니다.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {showcaseCards.map((item: WalletItem) => (
                      <VaultSavedShowcaseRow
                        key={item.userId || item.savedAt}
                        item={item}
                        onRemove={removeFromWallet}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'mydocs' && (
              <div className="min-w-0 space-y-4 pb-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <p className="text-[13px] font-black text-slate-800">키패드 저장</p>
                    <span className="text-[11px] font-bold text-slate-400">{caseNotes.length}건</span>
                  </div>
                  {caseNotes.length === 0 ? (
                    <p className="rounded-xl bg-white px-4 py-6 text-center text-[12px] text-slate-500 ring-1 ring-slate-100">
                      통화 키패드에서 저장한 번호·메모가 여기에 모입니다.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {caseNotes.map((note) => (
                        <li key={note.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-black leading-snug text-slate-900">{note.name}</p>
                              {note.digits ? (
                                <p className="mt-1 text-[14px] font-semibold tabular-nums text-sky-700">
                                  {note.digits}
                                </p>
                              ) : null}
                              {note.content ? (
                                <p className="mt-1 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-slate-600">
                                  {note.content}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600"
                              onClick={() => {
                                removePersonalCaseNote(note.id);
                                showToast('삭제했습니다.');
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <p className="text-[13px] font-black text-slate-800">저장된 파일</p>
                    <button
                      type="button"
                      onClick={refreshVaultFiles}
                      disabled={vaultLoading}
                      className="rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 disabled:opacity-50"
                    >
                      {vaultLoading ? '…' : '새로고침'}
                    </button>
                  </div>
                  {vaultFiles.length === 0 ? (
                    <p className="rounded-xl bg-white px-4 py-8 text-center text-[12px] text-slate-500 ring-1 ring-slate-100">
                      PDF · 엑셀 · 스캔 문서가 여기에 모입니다.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {vaultFiles.map((f: { id?: string; name?: string }) => (
                        <VaultSavedFileRow
                          key={f.id || f.name}
                          file={f}
                          onToast={showToast}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {toast ? (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-bold text-white shadow-lg">
            {toast}
          </div>
        ) : null}
      </SensitiveRightClickGuard>
    </main>
  );
}
