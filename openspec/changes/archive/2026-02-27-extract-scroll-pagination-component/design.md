## Context

Home 页（`pages/Home.tsx`）包含一套完整的 IntersectionObserver 无限滚动实现：

- `useCallback` 包裹的 `handleIntersect` 处理函数（含 `hasMore`、`isFetchingMore`、`isLoading` 三重守卫）
- `useEffect` 管理 Observer 的创建与销毁，rootMargin 为 `200px`
- sentinel `<div ref={sentinelRef}>` 渲染加载 spinner 和 "没有更多记录了" 文案

这些逻辑与 Home 页的业务代码紧耦合，约 20 行 Observer 逻辑 + 10 行 sentinel JSX。`SessionDetail.tsx` 目前一次加载所有 transactions，暂无分页需求，但通用组件应为未来消费者做好准备。

## Goals / Non-Goals

**Goals:**

- 提取 `useInfiniteScroll` hook，封装 Observer 生命周期和请求守卫
- 提取 `<ScrollSentinel>` 组件，统一 loading/empty 状态 UI
- 重构 Home 页使用新的 hook + 组件，行为和视觉完全不变
- API 设计简洁，一个 hook + 一个组件即可接入任意列表

**Non-Goals:**

- 不为 SessionDetail 添加分页（当前单 session 内 transactions 数量有限，无需分页）
- 不引入虚拟滚动（virtualization）—— 当前数据量不需要
- 不改变 store 层的分页状态管理模式（`page`、`hasMore`、`isFetchingMore` 仍由各 store 自行管理）
- 不新增第三方依赖

## Decisions

### 1. Hook API：最小化参数，返回 sentinelRef

**方案 A（选定）**：hook 接收回调 + 状态标志，返回 ref

```typescript
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

function useInfiniteScroll(options: UseInfiniteScrollOptions): React.RefObject<HTMLDivElement | null>;
```

调用方只需将返回的 ref 挂到 sentinel 元素上。hook 内部处理：

- Observer 创建/销毁（useEffect）
- 重复请求守卫（`hasMore && !isLoading` 检查）
- rootMargin 配置

**方案 B（否决）**：hook 同时管理分页状态（page、hasMore 等）。
否决原因：分页状态与数据获取逻辑紧耦合（不同列表的 fetch 函数、数据结构各异），强行统一会导致 hook 过于复杂。当前 store 模式已经很清晰，hook 只需关注 Observer 逻辑。

**方案 C（否决）**：使用 render props 或 HOC 模式。
否决原因：项目统一使用 hooks 模式，render props/HOC 不符合现有风格。

### 2. ScrollSentinel 组件：封装 sentinel UI

```typescript
interface ScrollSentinelProps {
  /** useInfiniteScroll 返回的 ref */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** 是否正在加载更多 */
  isFetchingMore: boolean;
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 列表是否为空（用于判断是否显示"没有更多"） */
  hasData: boolean;
  /** 加载中文案，默认 "加载更多..." */
  loadingText?: string;
  /** 无更多数据文案，默认 "没有更多记录了" */
  endText?: string;
}
```

组件渲染逻辑：

- `isFetchingMore` 为 true → 显示 spinner + loadingText
- `!hasMore && hasData` → 显示 endText
- 其他情况 → 仅渲染空 sentinel div（用于 Observer 观察）

选择独立组件而非在 hook 中内置 UI，因为：

- 保持 hook 的纯逻辑性（无 UI 耦合）
- 各页面可能需要不同的 loading/empty 样式（通过 props 自定义文案，未来可扩展 className）
- 符合项目 hook + component 分离的模式

### 3. 文件位置

- `hooks/useInfiniteScroll.ts` — 遵循项目 hooks 目录约定
- `components/ScrollSentinel.tsx` — 遵循项目 components 目录约定（PascalCase）

### 4. isLoading 参数合并 isFetchingMore

Home 页当前的 Observer 回调检查三个条件：`hasMore && !isFetchingMore && !isLoading`。hook 的 `isLoading` 参数由调用方传入，调用方负责合并这些状态。对 Home 页来说传 `isFetchingMore || isLoading` 即可。这样 hook 保持简单，不需要知道"初始加载"和"翻页加载"的区别。

### 5. Home 页重构策略

替换为等价代码，确保行为一致：

```tsx
// Before (内联)
const sentinelRef = useRef<HTMLDivElement>(null);
const handleIntersect = useCallback(...);
useEffect(() => { /* observer setup */ }, [handleIntersect]);

// After (hook + 组件)
const sentinelRef = useInfiniteScroll({
  hasMore,
  isLoading: isFetchingMore || isLoading,
  loadMore: fetchMoreSessions,
});

// Sentinel JSX: <ScrollSentinel sentinelRef={sentinelRef} ... />
```

## Risks / Trade-offs

- **[风险] 重构后行为回归** → 保留现有 `session-list-ui` spec 的所有场景作为验证基准，重构后逐项验证（并发请求守卫、空列表状态、rootMargin 预加载）。
- **[权衡] rootMargin 默认值硬编码 vs 可配置** → 提供可选 `rootMargin` 参数（默认 `'200px'`），兼顾简洁和灵活。当前只有 Home 页使用 200px，未来消费者可能需要不同值。
- **[权衡] ScrollSentinel 样式可定制性有限** → 当前仅支持文案自定义。如未来需要完全自定义 UI，可通过 `renderLoading` / `renderEnd` render props 扩展，但现阶段不做过度设计。
