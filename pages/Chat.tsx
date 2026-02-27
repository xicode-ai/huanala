import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { EChartsPie } from '../components/EChartsPie';
import { useUserStore, useChatStore } from '../stores';
import { useSpeechToText } from '../hooks/useSpeechToText';

const SUGGESTED_QUESTIONS = [
  'What was my highest expense this week?',
  'View spending records for the last 3 days',
  'What did I buy in my most recent shopping?',
  'Find reimbursement bills for the last 30 days',
];

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useUserStore();
  const { messages, inputValue, isLoading, setInputValue, fetchChatHistory, sendMessage } = useChatStore();
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Speech-to-text hook
  const {
    startRecording,
    stopRecording,
    status: speechStatus,
    transcript,
    interimTranscript,
    error: speechError,
    isAvailable: isSpeechAvailable,
    unavailableError,
  } = useSpeechToText();

  const isVoiceRecording = speechStatus === 'recording';
  const displayVoiceError = voiceError ?? speechError?.message ?? null;

  useEffect(() => {
    fetchUser();
    fetchChatHistory();
  }, [fetchUser, fetchChatHistory]);

  // Fill transcript into input when recording finishes (Task 7.3)
  useEffect(() => {
    if (speechStatus === 'idle' && transcript) {
      setInputValue(transcript);
    }
  }, [speechStatus, transcript, setInputValue]);

  const handleSend = async (text: string = inputValue) => {
    await sendMessage(text);
  };

  const handleMicClick = async () => {
    if (isVoiceRecording) {
      try {
        await stopRecording();
      } catch (err) {
        console.error('[Chat] stopRecording failed:', err);
      }
      return;
    }

    if (!isSpeechAvailable) {
      setVoiceError(unavailableError?.message || '语音识别不可用');
      return;
    }

    setVoiceError(null);
    try {
      await startRecording();
    } catch (err) {
      console.error('[Chat] startRecording failed:', err);
      setVoiceError(err instanceof Error ? err.message : '启动语音识别失败');
    }
  };

  return (
    <MobileLayout className="bg-background-light">
      <header className="flex-none bg-background-light pt-safe-top z-20">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate('/home')}
            className="text-text-main flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <Icon name="menu" className="text-[24px]" />
          </button>
          <div className="flex h-10 items-center justify-center rounded-full bg-slate-100 p-1 w-48 shadow-inner">
            <button
              onClick={() => navigate('/home')}
              className="cursor-pointer h-full flex-1 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-700 text-sm font-medium transition-all"
            >
              <span>Records</span>
            </button>
            <button className="cursor-pointer h-full flex-1 flex items-center justify-center rounded-full bg-white shadow-sm text-primary text-sm font-bold transition-all ring-1 ring-black/5">
              <span>Insights</span>
            </button>
          </div>
          <button className="relative flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-text-main">
            <Icon name="notifications" className="text-[24px]" />
            <span className="absolute top-2.5 right-2.5 size-2 bg-chart-coral rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-40 px-6 flex flex-col">
        <div className="flex-1 flex flex-col pt-2">
          {/* Suggested Questions Card */}
          <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-50 mb-2 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="search" className="text-primary text-[20px]" />
                <h3 className="text-[15px] font-bold text-slate-800">Query spending, try asking like this</h3>
              </div>
              <div className="space-y-1">
                {SUGGESTED_QUESTIONS.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(q)}
                    className="w-full flex items-center justify-between py-3 px-1 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg transition-colors group text-left"
                  >
                    <span className="text-[14px] text-slate-600 font-medium group-hover:text-primary transition-colors">
                      {q}
                    </span>
                    <Icon
                      name="chevron_right"
                      className="text-slate-300 text-[18px] group-hover:text-primary transition-colors"
                    />
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button className="text-xs text-slate-400 flex items-center gap-1 hover:text-primary transition-colors">
                  <Icon name="refresh" className="text-[14px]" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-8">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">
              Chat History
            </span>
          </div>

          {isLoading ? (
            <>
              <div className="flex gap-4 mb-8">
                <Skeleton className="size-10 shrink-0" variant="circle" />
                <div className="max-w-[85%] w-full">
                  <Skeleton className="w-24 h-4 mb-2" />
                  <Skeleton className="w-full h-24 rounded-3xl" />
                </div>
              </div>
              <div className="flex gap-4 mb-8 justify-end">
                <div className="max-w-[85%] w-full flex flex-col items-end">
                  <Skeleton className="w-24 h-4 mb-2" />
                  <Skeleton className="w-2/3 h-16 rounded-3xl" />
                </div>
                <Skeleton className="size-10 shrink-0" variant="circle" />
              </div>
            </>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 mb-8 ${msg.sender === 'user' ? 'justify-end' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards`}
              >
                {msg.sender === 'ai' && (
                  <div className="shrink-0 size-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg mt-1 overflow-hidden">
                    <Icon name="smart_toy" className="text-white text-[20px]" />
                  </div>
                )}

                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                  <span className="text-[12px] font-semibold text-slate-500 ml-1">
                    {msg.sender === 'ai' ? 'Hua Na Le AI' : 'You'}
                  </span>

                  <div
                    className={`p-5 rounded-3xl shadow-soft ${
                      msg.sender === 'ai'
                        ? 'bg-white rounded-tl-sm border border-slate-50 text-slate-700'
                        : 'bg-electric-light rounded-tr-sm text-slate-800'
                    }`}
                  >
                    {msg.type === 'text' && <p className="text-[15px] leading-relaxed">{msg.text}</p>}

                    {msg.type === 'chart' && (
                      <>
                        <p className="text-[15px] leading-relaxed mb-6">
                          Here is the breakdown for{' '}
                          <span className="font-semibold text-slate-900">Oct 16 - Oct 22</span>. Total spend:{' '}
                          <span className="font-bold text-slate-900">$2,450.00</span>.
                        </p>
                        <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                          <div className="flex items-center justify-between mb-6">
                            <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              Expense Distribution
                            </h5>
                            <span className="text-[10px] text-slate-500 font-semibold bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                              USD
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative size-36 shrink-0">
                              <EChartsPie data={msg.chartData || []} />
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] text-slate-400 font-medium leading-none mb-1">Total</span>
                                <span className="text-base font-extrabold text-slate-900 leading-none tracking-tight">
                                  $2.4k
                                </span>
                              </div>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 space-y-3 w-full">
                              {msg.chartData?.map((data) => (
                                <div key={data.name} className="flex items-center justify-between text-[13px]">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className="size-2.5 rounded-full shadow-sm"
                                      style={{ backgroundColor: data.color }}
                                    ></div>
                                    <span className="text-slate-600 font-medium">{data.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-900">{data.value}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Transactions mini-list */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Top Transactions
                            </h4>
                            <button className="text-[12px] font-semibold text-primary hover:text-blue-600 transition-colors">
                              View all
                            </button>
                          </div>
                          {msg.transactions?.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group cursor-pointer -mx-3"
                            >
                              <div
                                className={`size-10 rounded-full ${t.iconBg} flex items-center justify-center ${t.iconColor} shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all`}
                              >
                                <Icon name={t.icon} className="text-[20px]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                  <p className="text-[14px] font-bold text-slate-900 truncate pr-2">{t.title}</p>
                                  <span className="text-[14px] font-bold text-slate-900 whitespace-nowrap">
                                    -{t.currency}
                                    {t.amount.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <p className="text-[12px] text-slate-500 truncate">
                                    {t.date} • {t.category}
                                  </p>
                                  {t.note && (
                                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {t.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-wrap gap-2.5">
                          <button className="group flex items-center gap-2 bg-white border border-slate-200 hover:border-primary/30 text-slate-600 hover:text-primary px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95">
                            <Icon name="trending_up" className="text-[18px]" />
                            <span>Analyze trends</span>
                          </button>
                          <button className="group flex items-center gap-2 bg-white border border-slate-200 hover:border-primary/30 text-slate-600 hover:text-primary px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95">
                            <Icon name="picture_as_pdf" className="text-[18px]" />
                            <span>Export PDF</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="shrink-0 size-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-md mt-1 overflow-hidden">
                    <img
                      alt="User"
                      className="w-full h-full object-cover"
                      src={user?.avatar || 'https://picsum.photos/200'}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Chat Input */}
      <div className="absolute bottom-0 left-0 w-full z-30 px-6 pb-6 bg-gradient-to-t from-background-light via-background-light/95 to-transparent pt-20 pointer-events-none">
        {/* Voice Error Toast */}
        {displayVoiceError && (
          <div className="mb-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-2 pointer-events-auto">
            <Icon name="error_outline" className="text-[18px] shrink-0" />
            <span className="line-clamp-2">{displayVoiceError}</span>
          </div>
        )}

        {/* Interim transcript display during recording */}
        {isVoiceRecording && interimTranscript && (
          <div className="mb-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-2xl text-slate-600 text-sm font-medium animate-in fade-in duration-200 border border-slate-100 pointer-events-auto">
            <span className="text-slate-400 text-xs mr-1">识别中:</span>
            {interimTranscript}
          </div>
        )}

        <div className="relative flex items-center gap-3 bg-white p-2 pl-5 pr-2 rounded-full shadow-soft border border-white/50 backdrop-blur-xl pointer-events-auto">
          <div className="shrink-0 text-primary">
            <Icon name="auto_awesome" className="text-[22px] animate-pulse" />
          </div>
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (inputValue.trim()) {
                  handleSend(inputValue);
                }
              }
            }}
            className="flex-1 bg-transparent border-none p-0 text-slate-800 placeholder-slate-400 focus:ring-0 text-[15px] font-medium h-12 outline-none"
            placeholder={isVoiceRecording ? '正在录音...' : 'Ask Hua Na Le...'}
            type="text"
            readOnly={isVoiceRecording}
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleMicClick}
              className={`flex items-center justify-center size-10 rounded-full transition-all ${
                isVoiceRecording
                  ? 'text-white bg-red-500 shadow-lg shadow-red-200/50 animate-pulse'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon name={isVoiceRecording ? 'stop' : 'mic'} className="text-[22px]" />
            </button>
            <button
              onClick={() => handleSend(inputValue)}
              className="flex items-center justify-center size-11 rounded-full bg-navy-blue hover:scale-105 active:scale-95 text-white shadow-lg shadow-slate-200 transition-all"
            >
              <Icon name="arrow_upward" className="text-[22px]" />
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};
