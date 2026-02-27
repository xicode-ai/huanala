## MODIFIED Requirements

### Requirement: Infinite scroll pagination for sessions

The system SHALL implement infinite scroll on the session list using the shared `useInfiniteScroll` hook and `<ScrollSentinel>` component from `hooks/useInfiniteScroll.ts` and `components/ScrollSentinel.tsx`. The Home page SHALL NOT contain inline IntersectionObserver setup code. When the user scrolls to the bottom sentinel element, the next page of sessions is fetched and appended.

#### Scenario: Scroll triggers next page load

- **WHEN** the user scrolls to the bottom of the session list and more pages exist (`hasMore = true`)
- **THEN** the system fetches the next page of `input_sessions` and appends them to the list
- **AND** a loading indicator is shown during the fetch via `<ScrollSentinel>`

#### Scenario: All sessions loaded

- **WHEN** the user scrolls to the bottom and no more pages exist (`hasMore = false`)
- **THEN** the system displays a "没有更多记录了" message via `<ScrollSentinel>` and does not issue further queries

#### Scenario: Concurrent scroll events

- **WHEN** the user scrolls rapidly and the sentinel is observed multiple times while a fetch is in progress (`isFetchingMore = true`)
- **THEN** the system SHALL NOT issue duplicate fetch requests (guarded by `useInfiniteScroll` hook's `isLoading` check)
