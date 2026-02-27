import React from 'react';

interface ScrollSentinelProps {
  /** useInfiniteScroll 返回的 ref */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** 是否正在加载更多 */
  isFetchingMore: boolean;
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 列表是否有数据（用于判断是否显示"没有更多"） */
  hasData: boolean;
  /** 加载中文案 */
  loadingText?: string;
  /** 无更多数据文案 */
  endText?: string;
}

/**
 * 通用无限滚动哨兵组件，渲染 sentinel 元素及其加载/结束状态 UI。
 */
export const ScrollSentinel: React.FC<ScrollSentinelProps> = ({
  sentinelRef,
  isFetchingMore,
  hasMore,
  hasData,
  loadingText = '加载更多...',
  endText = '没有更多记录了',
}) => {
  return (
    <div ref={sentinelRef} className="py-4 flex justify-center">
      {isFetchingMore && (
        <div className="flex items-center gap-2 text-slate-400 text-sm animate-in fade-in">
          <div className="size-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
          <span>{loadingText}</span>
        </div>
      )}
      {!hasMore && hasData && <p className="text-slate-300 text-xs">{endText}</p>}
    </div>
  );
};
