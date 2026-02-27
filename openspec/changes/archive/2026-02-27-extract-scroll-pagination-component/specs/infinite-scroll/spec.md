## ADDED Requirements

### Requirement: useInfiniteScroll hook encapsulates IntersectionObserver lifecycle

The system SHALL provide a `useInfiniteScroll` hook in `hooks/useInfiniteScroll.ts` that accepts `hasMore`, `isLoading`, `loadMore`, and an optional `rootMargin` (default `'200px'`). The hook SHALL return a `React.RefObject<HTMLDivElement | null>` to be attached to a sentinel element. The hook SHALL internally create an `IntersectionObserver` that calls `loadMore` when the sentinel enters the viewport, provided `hasMore` is `true` and `isLoading` is `false`.

#### Scenario: Observer triggers loadMore when sentinel is visible

- **WHEN** the sentinel element enters the viewport (or rootMargin zone) and `hasMore` is `true` and `isLoading` is `false`
- **THEN** the hook calls the `loadMore` callback exactly once

#### Scenario: Observer does not trigger when loading

- **WHEN** the sentinel element enters the viewport but `isLoading` is `true`
- **THEN** the hook SHALL NOT call `loadMore`

#### Scenario: Observer does not trigger when no more data

- **WHEN** the sentinel element enters the viewport but `hasMore` is `false`
- **THEN** the hook SHALL NOT call `loadMore`

#### Scenario: Observer cleanup on unmount

- **WHEN** the component using the hook unmounts
- **THEN** the hook SHALL disconnect the IntersectionObserver to prevent memory leaks

#### Scenario: Observer re-creates when dependencies change

- **WHEN** `hasMore`, `isLoading`, or `loadMore` values change
- **THEN** the hook SHALL disconnect the previous Observer and create a new one with updated callback logic

#### Scenario: Custom rootMargin

- **WHEN** the caller passes `rootMargin: '400px'`
- **THEN** the IntersectionObserver SHALL use `400px` as its rootMargin instead of the default `200px`

### Requirement: ScrollSentinel component renders loading and end states

The system SHALL provide a `<ScrollSentinel>` component in `components/ScrollSentinel.tsx` that renders the sentinel `<div>` element with the provided ref and displays contextual UI based on pagination state.

#### Scenario: Fetching more data

- **WHEN** `isFetchingMore` is `true`
- **THEN** the component SHALL render a spinning loader icon and the `loadingText` (default: `"加载更多..."`)

#### Scenario: All data loaded with existing items

- **WHEN** `hasMore` is `false` and `hasData` is `true`
- **THEN** the component SHALL render the `endText` (default: `"没有更多记录了"`)

#### Scenario: All data loaded with no items

- **WHEN** `hasMore` is `false` and `hasData` is `false`
- **THEN** the component SHALL render only the sentinel div without any text

#### Scenario: Idle state waiting for scroll

- **WHEN** `isFetchingMore` is `false` and `hasMore` is `true`
- **THEN** the component SHALL render only the sentinel div (invisible to user, observed by IntersectionObserver)

#### Scenario: Custom text overrides

- **WHEN** the caller passes `loadingText="Loading..."` and `endText="No more items"`
- **THEN** the component SHALL use those strings instead of the defaults
