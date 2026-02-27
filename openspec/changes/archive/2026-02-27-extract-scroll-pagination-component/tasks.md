## 1. useInfiniteScroll Hook

- [x] 1.1 Create `hooks/useInfiniteScroll.ts` with `UseInfiniteScrollOptions` interface (`hasMore`, `isLoading`, `loadMore`, optional `rootMargin` defaulting to `'200px'`)
- [x] 1.2 Implement hook body: `useCallback` wrapping intersection handler with `hasMore && !isLoading` guard, `useEffect` managing Observer create/disconnect lifecycle, return `useRef<HTMLDivElement | null>` as sentinelRef
- [x] 1.3 Add unit tests in `tests/hooks/useInfiniteScroll.test.tsx`: verify loadMore called when sentinel intersects and conditions met, verify NOT called when `isLoading=true` or `hasMore=false`, verify observer disconnect on unmount, verify custom rootMargin passed to Observer

## 2. ScrollSentinel Component

- [x] 2.1 Create `components/ScrollSentinel.tsx` with props: `sentinelRef`, `isFetchingMore`, `hasMore`, `hasData`, optional `loadingText` (default `"加载更多..."`), optional `endText` (default `"没有更多记录了"`)
- [x] 2.2 Implement render logic: spinner + loadingText when fetching, endText when `!hasMore && hasData`, empty sentinel div otherwise. Use existing Tailwind classes matching Home.tsx's current sentinel styling (`py-4 flex justify-center`, spinner with `size-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin`, end text with `text-slate-300 text-xs`)
- [x] 2.3 Add unit tests in `tests/components/ScrollSentinel.test.tsx`: verify spinner shown when `isFetchingMore=true`, verify end text when `!hasMore && hasData`, verify empty when `!hasMore && !hasData`, verify custom text props override defaults

## 3. Refactor Home Page

- [x] 3.1 In `pages/Home.tsx`: remove `sentinelRef` useRef, remove `handleIntersect` useCallback, remove IntersectionObserver useEffect (lines ~73, ~102-120)
- [x] 3.2 Add `useInfiniteScroll` call: `const sentinelRef = useInfiniteScroll({ hasMore, isLoading: isFetchingMore || isLoading, loadMore: fetchMoreSessions })`
- [x] 3.3 Replace inline sentinel JSX with `<ScrollSentinel sentinelRef={sentinelRef} isFetchingMore={isFetchingMore} hasMore={hasMore} hasData={sessions.length > 0} />`
- [x] 3.4 Verify: `pnpm build` passes, `pnpm lint` clean, no regressions in existing session-list-ui spec scenarios (scroll triggers load, no duplicate requests, empty/end states)

## 4. Export & Cleanup

- [x] 4.1 Verify `useInfiniteScroll` and `ScrollSentinel` are properly exported (named exports, no barrel file changes needed)
- [x] 4.2 Run full test suite `pnpm test` — all 27 tests pass (5 suites)
- [x] 4.3 Run `pnpm build` — production build succeeds with no errors
