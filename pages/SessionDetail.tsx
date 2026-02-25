import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { Transaction } from '../types';
import { transactionService } from '../services/transactionService';

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<{
    fetchedId: string;
    transactions: Transaction[];
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    transactionService
      .fetchBySessionId(id)
      .then((txs) => {
        if (active) setResult({ fetchedId: id, transactions: txs });
      })
      .catch((err) => console.error('Failed to fetch session transactions:', err));
    return () => {
      active = false;
    };
  }, [id]);

  const isLoading = !result || result.fetchedId !== id;
  const transactions = result?.transactions ?? [];

  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const currency = transactions[0]?.currency || '¥';
  const dateLabel = transactions[0]?.date || '';
  const timeLabel = transactions[0]?.time || '';

  return (
    <MobileLayout className="bg-background-light text-text-main">
      {/* Header */}
      <header className="flex-none bg-background-light pt-safe-top z-20">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <Icon name="arrow_back" className="text-[24px] text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex-1">会话详情</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-10">
        {/* Summary Card */}
        <div className="mt-2 w-full rounded-3xl bg-white shadow-card p-6 relative overflow-hidden">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="layers" className="text-primary text-[18px]" />
                </div>
                <span className="text-sm text-slate-400 font-medium">
                  {dateLabel} · {timeLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <h2 className="text-3xl font-bold text-slate-800">
                  {currency}
                  {totalExpense.toFixed(2)}
                </h2>
                <span className="text-slate-400 text-sm">支出</span>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">记录数</p>
                  <p className="text-slate-800 font-semibold">{transactions.length} 条</p>
                </div>
                {totalIncome > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">收入</p>
                    <p className="text-green-600 font-semibold">
                      +{currency}
                      {totalIncome.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Transaction List */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4 px-1">
            <h3 className="text-base font-bold text-slate-700">交易明细</h3>
          </div>

          <div className="flex flex-col gap-5">
            {isLoading
              ? [1, 2, 3].map((i) => (
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
                ))
              : transactions.map((t, index) => (
                  <div
                    key={t.id}
                    className="relative flex gap-4 pl-1 animate-in slide-in-from-bottom-5 duration-500 fill-mode-forwards"
                    style={{ animationDelay: `${Math.min(index, 5) * 80}ms` }}
                  >
                    <div className="flex flex-col items-center w-12 pt-1 shrink-0">
                      <span className="text-xs text-slate-400 font-medium">{t.time}</span>
                      {index < transactions.length - 1 && (
                        <div className="w-px h-full bg-slate-200 my-2 rounded-full min-h-[40px]"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`flex items-center gap-2 ${t.iconBg || 'bg-slate-50'} ${t.iconColor || 'text-slate-500'} pl-2 pr-3 py-1 rounded-full`}
                        >
                          <Icon name={t.icon} className="text-[20px]" />
                          <span className="text-sm font-bold">{t.category}</span>
                        </div>
                        <div className="bg-white border border-blue-100 px-3 py-1 rounded-full shadow-sm">
                          <span className="text-primary font-bold text-sm">
                            {t.type === 'expense' ? '-' : '+'} {t.currency}
                            {t.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-700 font-bold text-[15px] pl-1 mb-1">{t.title}</p>
                      {t.note && <p className="text-slate-400 text-xs pl-1">{t.note}</p>}
                      {t.details?.merchant && (
                        <p className="text-slate-400 text-xs pl-1 mt-0.5">
                          <Icon name="store" className="text-[12px] mr-1 inline" />
                          {t.details.merchant}
                        </p>
                      )}
                      {t.details?.description && (
                        <div className="mt-2 bg-slate-100 rounded-2xl rounded-tl-sm p-3 flex gap-2.5 items-start text-sm leading-relaxed">
                          <span className="font-bold text-primary text-xs whitespace-nowrap mt-0.5">AI:</span>
                          <span className="text-slate-600">{t.details.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </main>
    </MobileLayout>
  );
};
