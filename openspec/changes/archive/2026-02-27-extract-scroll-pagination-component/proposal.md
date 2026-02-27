## Why

Home 页的无限滚动分页逻辑（IntersectionObserver + sentinel + 状态管理）完全内联在 `pages/Home.tsx` 中，无法复用。当 SessionDetail 或未来其他列表页需要分页时，只能复制粘贴相同的 Observer 设置、loading 守卫和 sentinel 渲染逻辑。提取为通用 hook + 组件可消除重复，并为后续页面提供开箱即用的无限滚动能力。

## What Changes

- **新增 `useInfiniteScroll` hook**：封装 IntersectionObserver 创建/销毁、sentinel ref 管理、重复请求守卫逻辑。接收 `hasMore`、`isLoading`、`loadMore` 参数，返回 `sentinelRef`。
- **新增 `<ScrollSentinel>` 组件**：渲染 sentinel 元素及其加载中/无更多数据的 UI 状态（loading spinner、"没有更多记录了"文案），消除各页面重复的 sentinel JSX。
- **重构 `pages/Home.tsx`**：移除内联的 IntersectionObserver 逻辑，改用 `useInfiniteScroll` hook + `<ScrollSentinel>` 组件。行为和 UI 保持完全一致。
- **评估 `pages/SessionDetail.tsx` 是否需要分页**：当前 SessionDetail 一次加载全部 transactions，对于大量记录的 session 可能存在性能问题。评估是否需要引入分页，如需要则作为新的消费者使用通用组件。

## Capabilities

### New Capabilities

- `infinite-scroll`: 通用无限滚动能力，包括 `useInfiniteScroll` hook 和 `<ScrollSentinel>` 组件的接口定义、行为规范和配置选项（rootMargin、loading/empty 状态展示）。

### Modified Capabilities

- `session-list-ui`: 实现方式从内联 IntersectionObserver 改为使用通用 `useInfiniteScroll` hook + `<ScrollSentinel>` 组件，分页行为要求不变。

## Impact

- **`hooks/useInfiniteScroll.ts`**（新增）：通用 hook
- **`components/ScrollSentinel.tsx`**（新增）：通用 sentinel 组件
- **`pages/Home.tsx`**：移除 ~20 行内联 Observer 逻辑，引入 hook + 组件
- **`pages/SessionDetail.tsx`**：评估后可能引入分页（需 design 阶段确认）
- **`stores/useTransactionStore.ts`**：接口不变，仅消费方式变化
- **无 breaking changes**，无新依赖，无 API/数据库变更
