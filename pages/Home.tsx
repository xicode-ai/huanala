import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { useUserStore, useTransactionStore } from '../stores';
import { Sidebar } from './Sidebar';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { InputSession } from '../types';

const SOURCE_LABELS: Record<string, string> = {
  voice: '语音记账',
  bill_scan: '图片记账',
  manual: '手动输入',
};

const SOURCE_ICONS: Record<string, string> = {
  voice: 'graphic_eq',
  bill_scan: 'image',
  manual: 'edit',
};

// ── Component ───────────────────────────────────────────────────────

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, fetchUser, isLoading: userLoading } = useUserStore();
  const {
    sessions,
    fetchSessions,
    fetchMoreSessions,
    uploadBill,
    uploadVoice,
    isLoading: txLoading,
    isUploading,
    isFetchingMore,
    hasMore,
    lastBatchCount,
    clearLastBatchCount,
    monthlyExpenses,
    totalIncome,
  } = useTransactionStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [batchToast, setBatchToast] = useState<string | null>(null);

  const isLoading = userLoading || txLoading;

  // Speech-to-text hook
  const {
    startRecording,
    stopRecording,
    status: speechStatus,
    transcript,
    interimTranscript,
    error: speechError,
    duration,
    isAvailable: isSpeechAvailable,
    unavailableError,
  } = useSpeechToText();

  const isRecording = speechStatus === 'recording';
  const isTranscribing = speechStatus === 'transcribing';
  const displayVoiceError = voiceError ?? speechError?.message ?? null;

  // Refs
  const albumInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const prevTranscriptRef = useRef('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Effects ─────────────────────────────────────────────────────

  useEffect(() => {
    fetchUser();
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Submit transcript when recording completes
  useEffect(() => {
    if (speechStatus === 'idle' && transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      uploadVoice(transcript);
    }
  }, [speechStatus, transcript, uploadVoice]);

  useEffect(() => {
    if (lastBatchCount > 0 && !isUploading) {
      setBatchToast(`已创建 ${lastBatchCount} 条记录`);
      clearLastBatchCount();
      const timer = setTimeout(() => setBatchToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastBatchCount, isUploading, clearLastBatchCount]);

  // ── Infinite scroll via IntersectionObserver ─────────────────────

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry?.isIntersecting && hasMore && !isFetchingMore && !isLoading) {
        fetchMoreSessions();
      }
    },
    [hasMore, isFetchingMore, isLoading, fetchMoreSessions]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsMenuOpen(false);
      await uploadBill(file);
      if (albumInputRef.current) albumInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleStartRecording = async () => {
    setIsMenuOpen(false);
    setVoiceError(null);

    if (!isSpeechAvailable) {
      setVoiceError(unavailableError?.message || '语音识别不可用');
      return;
    }

    try {
      await startRecording();
    } catch (err) {
      console.error('[Home] startRecording failed:', err);
      setVoiceError(err instanceof Error ? err.message : '启动语音识别失败');
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
    } catch (err) {
      console.error('[Home] stopRecording failed:', err);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────

  const renderSessionCard = (s: InputSession, index: number) => (
    <div
      key={s.id}
      className="animate-in slide-in-from-bottom-5 duration-500 fill-mode-forwards"
      style={{ animationDelay: `${Math.min(index, 5) * 80}ms` }}
    >
      <div className="flex gap-4 pl-1">
        <div className="flex flex-col items-center w-12 pt-1 shrink-0">
          <span className="text-xs text-slate-400 font-medium">{s.time}</span>
          <div className="w-px h-full bg-slate-200 my-2 rounded-full min-h-[40px]"></div>
        </div>
        <div className="flex-1 pb-4">
          <button
            onClick={() => navigate(`/session/${s.id}`)}
            className="w-full text-left bg-gradient-to-br from-white to-blue-50/40 rounded-2xl p-4 shadow-card border border-blue-50 hover:shadow-md transition-shadow active:scale-[0.99]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name={SOURCE_ICONS[s.source] || 'layers'} className="text-primary text-[18px]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-700">{SOURCE_LABELS[s.source] || s.source}</span>
                  <span className="text-xs text-slate-400 ml-2">{s.recordCount} 条记录</span>
                </div>
              </div>
              <div className="bg-white border border-blue-100 px-3 py-1 rounded-full shadow-sm">
                <span className="text-primary font-bold text-sm">
                  -{s.currency}
                  {s.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{s.date}</span>
              <div className="flex items-center text-primary/70">
                <span>查看详情</span>
                <Icon name="chevron_right" className="text-[14px]" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main render ─────────────────────────────────────────────────

  return (
    <MobileLayout className="bg-background-light text-text-main">
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(1); opacity: 0.8; }
          50% { transform: scaleY(1.5); opacity: 1; }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      {/* Hidden File Inputs */}
      <input type="file" ref={albumInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />

      <header className="flex-none bg-background-light pt-safe-top z-20">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-main flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <Icon name="menu" className="text-[28px]" />
          </button>
          <div className="flex h-10 items-center justify-center rounded-full bg-slate-100 p-1 w-48">
            <button className="h-full flex-1 flex items-center justify-center rounded-full bg-white shadow-sm text-primary text-sm font-bold transition-all">
              <span>Records</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="h-full flex-1 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 text-sm font-medium transition-all"
            >
              <span>Insights</span>
            </button>
          </div>
          <button className="relative flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-text-main">
            <Icon name="notifications_none" className="text-[28px]" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-5">
        {/* Balance Card */}
        <div className="mt-2 w-full rounded-[2.5rem] bg-white text-text-main shadow-card p-7 relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-slate-400 text-sm font-medium tracking-wide">
                  {new Date().toLocaleDateString('en-US', { month: 'short' })} Expenses
                </p>
                <Icon name="visibility" className="text-slate-300 text-[18px] cursor-pointer" />
              </div>
              <div className="relative inline-block min-h-[4rem]">
                {isLoading ? (
                  <Skeleton className="h-14 w-48 mt-2" />
                ) : (
                  <h2 className="text-slate-800 text-[2.75rem] font-bold tracking-tight leading-tight relative z-10 animate-in fade-in duration-500">
                    ¥{monthlyExpenses.toFixed(2)}
                  </h2>
                )}
              </div>
              <div className="flex gap-6 mt-5">
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Income</p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <p className="text-slate-800 font-semibold animate-in fade-in">¥{totalIncome.toFixed(2)}</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Balance</p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <p className="text-slate-800 font-semibold animate-in fade-in">¥{user?.balance.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Donut Chart Visual */}
            <div className="relative size-28 shrink-0 flex items-center justify-center">
              {isLoading ? (
                <Skeleton className="size-28" variant="circle" />
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full border-[6px] border-blue-50 animate-in zoom-in duration-500"></div>
                  <div
                    className="absolute inset-0 rounded-full animate-in zoom-in duration-700"
                    style={{
                      background: 'conic-gradient(#4361EE 30%, transparent 0)',
                      WebkitMask: 'radial-gradient(transparent 56%, black 56%)',
                      mask: 'radial-gradient(transparent 56%, black 56%)',
                    }}
                  ></div>
                  <div className="text-center z-10 animate-in fade-in delay-200">
                    <p className="text-slate-400 text-[10px] font-medium mb-0.5">Daily Available</p>
                    <p className="text-primary text-lg font-bold">¥{user?.dailyAvailable}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8">
            {isLoading ? (
              <Skeleton className="h-4 w-full rounded-full" />
            ) : (
              <>
                <span className="text-xs text-slate-400 whitespace-nowrap animate-in fade-in">
                  Budget {user?.budgetUsedPercent}%
                </span>
                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary/30 w-[30%] rounded-full animate-in slide-in-from-left duration-1000"></div>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap animate-in fade-in">
                  Left ¥{user?.leftAmount}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Daily Prompt */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3 px-2">
            <h3 className="text-xl font-bold text-slate-800">
              Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h3>
            <span className="text-slate-400 text-sm">
              ({new Date().toLocaleDateString('en-US', { weekday: 'short' })})
            </span>
            <Icon name="chevron_right" className="text-slate-300 text-lg" />
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-[2rem] p-6 flex justify-between items-center shadow-card border border-white">
            <div>
              <p className="text-slate-800 font-bold text-lg mb-1">What happened today?</p>
              <div className="flex items-center gap-1 text-slate-400 text-sm">
                <span>Record anytime, speak freely</span>
                <Icon name="arrow_right_alt" className="text-[16px]" />
              </div>
            </div>
            <div className="size-16 flex items-center justify-center bg-blue-100/30 rounded-full relative">
              <span className="text-5xl drop-shadow-sm filter grayscale-[20%]">🐻</span>
              <div className="absolute -top-1 -right-1 size-3 bg-marigold rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="mt-10 mb-6">
          <div className="flex items-center gap-2 mb-6 px-2">
            <h3 className="text-lg font-bold text-slate-800">Recent</h3>
          </div>

          <div className="flex flex-col gap-6">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 pl-1">
                    <div className="flex flex-col items-center w-12 pt-1 shrink-0 gap-2">
                      <Skeleton className="w-8 h-3" />
                      <Skeleton className="w-0.5 h-10" />
                    </div>
                    <div className="flex-1 pb-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="w-24 h-8 rounded-full" />
                        <Skeleton className="w-16 h-8 rounded-full" />
                      </div>
                      <Skeleton className="w-32 h-4" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              sessions.map((s, index) => renderSessionCard(s, index))
            )}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-4 flex justify-center">
            {isFetchingMore && (
              <div className="flex items-center gap-2 text-slate-400 text-sm animate-in fade-in">
                <div className="size-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                <span>加载更多...</span>
              </div>
            )}
            {!hasMore && sessions.length > 0 && <p className="text-slate-300 text-xs">没有更多记录了</p>}
          </div>
        </div>
      </main>

      {/* Floating Action Bar Area */}
      <div
        className={`absolute bottom-0 left-0 w-full z-30 transition-all duration-300 ${isMenuOpen || isRecording || isTranscribing ? 'bg-[#F8F9FE]/95 backdrop-blur-md shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]' : 'bg-gradient-to-t from-background-light via-background-light to-transparent'}`}
      >
        <div className="px-5 pb-6 pt-2">
          {/* Batch Toast */}
          {batchToast && (
            <div className="mb-2 px-4 py-2.5 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-2">
              <Icon name="check_circle" className="text-[18px] shrink-0" />
              <span>{batchToast}</span>
            </div>
          )}
          {displayVoiceError && (
            <div className="mb-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-2">
              <Icon name="error_outline" className="text-[18px] shrink-0" />
              <span className="line-clamp-2">{displayVoiceError}</span>
            </div>
          )}

          {/* Interim transcript display */}
          {(isRecording || isTranscribing) && interimTranscript && (
            <div className="mb-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-2xl text-slate-600 text-sm font-medium animate-in fade-in duration-200 border border-slate-100">
              <span className="text-slate-400 text-xs mr-1">识别中:</span>
              {interimTranscript}
            </div>
          )}

          {/* Input Bar */}
          <div className="flex items-center gap-3 relative z-20">
            <button className="flex items-center justify-center size-[3.25rem] rounded-full bg-white shadow-card border border-slate-100 text-slate-600 hover:text-primary transition-colors shrink-0">
              <Icon name="search" className="text-[26px]" />
            </button>

            {isRecording || isTranscribing ? (
              <button
                onClick={handleStopRecording}
                disabled={isTranscribing}
                className="flex-1 h-[3.25rem] bg-primary shadow-lg shadow-blue-200/50 rounded-full flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] animate-in zoom-in-95 duration-200"
              >
                {isTranscribing ? (
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>转写中...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-white/80 text-xs font-medium mr-1">{duration}s</span>
                    {[0.6, 1, 0.5, 0.8, 1.2, 0.8, 0.5, 1, 0.6, 0.4].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-white/90 rounded-full animate-wave"
                        style={{
                          height: `${h * 18}px`,
                          animationDelay: `${i * 0.1}s`,
                          opacity: 0.7 + i * 0.03,
                        }}
                      ></div>
                    ))}
                  </>
                )}
              </button>
            ) : (
              <div className="flex-1 h-[3.25rem] bg-white shadow-card border border-slate-100 rounded-full flex items-center justify-between px-2 pl-4 transition-transform">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => !isUploading && setIsMenuOpen(!isMenuOpen)}
                    className={`size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all duration-300 ${isMenuOpen ? 'rotate-45 text-slate-600 bg-slate-100 rounded-full' : ''}`}
                    disabled={isUploading}
                  >
                    <Icon name="add" className="text-[26px]" />
                  </button>
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-primary font-medium text-[15px]">
                      <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Tap here to record"
                      className="w-full bg-transparent border-none outline-none text-[15px] font-medium placeholder-slate-400 text-slate-800 h-full py-2"
                    />
                  )}
                </div>
                <button
                  onClick={handleStartRecording}
                  disabled={isUploading}
                  className="size-9 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-800 ml-2 transition-colors cursor-pointer"
                >
                  <Icon name="graphic_eq" className="text-[20px]" />
                </button>
              </div>
            )}
          </div>

          {/* Expanded Menu */}
          {isMenuOpen && !isRecording && (
            <div className="flex justify-between px-8 pt-8 pb-4 animate-in slide-in-from-bottom-5 fade-in duration-300 relative z-10">
              <button
                onClick={() => albumInputRef.current?.click()}
                className="flex flex-col items-center gap-2.5 group w-20"
              >
                <div className="size-14 rounded-2xl bg-white flex items-center justify-center shadow-soft border border-slate-50 group-active:scale-95 transition-transform">
                  <Icon name="image" className="text-[28px] text-slate-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Album</span>
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2.5 group w-20"
              >
                <div className="size-14 rounded-2xl bg-white flex items-center justify-center shadow-soft border border-slate-50 group-active:scale-95 transition-transform">
                  <Icon name="photo_camera" className="text-[28px] text-slate-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Camera</span>
              </button>
              <button
                disabled
                className="flex flex-col items-center gap-2.5 group w-20 opacity-40 cursor-not-allowed grayscale"
              >
                <div className="size-14 rounded-2xl bg-white flex items-center justify-center shadow-soft border border-slate-50">
                  <Icon name="receipt_long" className="text-[28px] text-slate-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Import Bill</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};
