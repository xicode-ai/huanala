import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 是否正在加载（初始加载或翻页加载），为 true 时不触发 */
  isLoading: boolean;
  /** 触发加载下一页的回调 */
  loadMore: () => void;
  /** IntersectionObserver rootMargin，默认 '200px' */
  rootMargin?: string;
}

/**
 * 通用无限滚动 hook，封装 IntersectionObserver 生命周期。
 * 返回 sentinelRef，挂到列表底部的哨兵元素上即可。
 */
export const useInfiniteScroll = ({
  hasMore,
  isLoading,
  loadMore,
  rootMargin = '200px',
}: UseInfiniteScrollOptions): React.RefObject<HTMLDivElement | null> => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry?.isIntersecting && hasMore && !isLoading) {
        loadMore();
      }
    },
    [hasMore, isLoading, loadMore]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin,
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [handleIntersect, rootMargin]);

  return sentinelRef;
};
