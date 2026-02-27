import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { ScrollSentinel } from '../components/ScrollSentinel';
import { Transaction } from '../types';
import { transactionService } from '../services/transactionService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const fetchedIdRef = useRef<string | null>(null);

  // Initial fetch — reset state when session id changes
  useEffect(() => {
    if (!id) return;
    let active = true;

    // Reset pagination state for new session
    setTransactions([]);
    setIsLoading(true);
    setHasMore(true);
    pageRef.current = 0;
    fetchedIdRef.current = id;

    transactionService
      .fetchBySessionIdPage(id, 0)
      .then((result) => {
        if (active) {
          setTransactions(result.transactions);
          setHasMore(result.hasMore);
          pageRef.current = 1;
        }
      })
      .catch((err) => console.error('Failed to fetch session transactions:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  // Load more handler for infinite scroll
  const loadMore = useCallback(async () => {
    if (!id || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const result = await transactionService.fetchBySessionIdPage(id, pageRef.current);
      setTransactions((prev) => [...prev, ...result.transactions]);
      setHasMore(result.hasMore);
      pageRef.current += 1;
    } catch (err) {
      console.error('Failed to fetch more transactions:', err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [id, isFetchingMore]);

  // Infinite scroll hook
  const sentinelRef = useInfiniteScroll({
    hasMore,
    isLoading: isFetchingMore || isLoading,
    loadMore,
  });

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
          <h1 className="text-lg font-bold text-slate-800 flex-1">账单详情</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-10 pt-2">
        <div className="flex flex-col gap-4">
          {isLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="w-full bg-white rounded-3xl p-5 shadow-card border border-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-11 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="w-20 h-4" />
                        <Skeleton className="w-12 h-3" />
                      </div>
                    </div>
                    <Skeleton className="w-16 h-8 rounded-full" />
                  </div>
                  <div className="pl-[3.5rem] space-y-2">
                    <Skeleton className="w-40 h-4" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                </div>
              ))
            : transactions.map((t, index) => (
                <div
                  key={t.id}
                  className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100/50 hover:shadow-card transition-shadow animate-in slide-in-from-bottom-5 duration-500 fill-mode-forwards"
                  style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-11 flex items-center justify-center rounded-2xl ${t.iconBg || 'bg-slate-100'} ${t.iconColor || 'text-slate-500'} shadow-inner`}
                      >
                        <Icon name={t.icon} className="text-[24px]" />
                      </div>
                      <div>
                        <span className="text-base font-bold text-slate-800">{t.category}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-400 font-medium">
                            {t.date} {t.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <span
                        className={`font-bold text-[16px] ${t.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}
                      >
                        {t.type === 'expense' ? '-' : '+'}
                        <span className="text-xs ml-[1px]">{t.currency}</span>
                        {t.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="pl-[3.75rem]">
                    <p className="text-slate-700 font-semibold text-[15px] leading-snug">{t.title}</p>
                    {t.note && <p className="text-slate-500 text-[13px] mt-1 line-clamp-2">{t.note}</p>}

                    {t.details?.merchant && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Icon name="storefront" className="text-[14px] text-slate-400" />
                        <span className="text-slate-500 text-xs">{t.details.merchant}</span>
                      </div>
                    )}

                    {t.details?.description && (
                      <div className="mt-3 bg-slate-50 rounded-2xl rounded-tl-none p-3 flex gap-2.5 items-start">
                        <div className="mt-0.5 shrink-0">
                          <Icon name="auto_awesome" className="text-[14px] text-primary/70" />
                        </div>
                        <p className="text-slate-600 text-[13px] leading-relaxed flex-1">{t.details.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </div>

        {/* Infinite scroll sentinel */}
        {!isLoading && (
          <ScrollSentinel
            sentinelRef={sentinelRef}
            isFetchingMore={isFetchingMore}
            hasMore={hasMore}
            hasData={transactions.length > 0}
          />
        )}
      </main>
    </MobileLayout>
  );
};
