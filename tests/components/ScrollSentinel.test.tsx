import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScrollSentinel } from '@/components/ScrollSentinel';

describe('ScrollSentinel', () => {
  const createRef = () => React.createRef<HTMLDivElement>();

  it('shows spinner and loading text when isFetchingMore is true', () => {
    render(<ScrollSentinel sentinelRef={createRef()} isFetchingMore={true} hasMore={true} hasData={true} />);

    expect(screen.getByText('加载更多...')).toBeInTheDocument();
  });

  it('shows end text when hasMore is false and hasData is true', () => {
    render(<ScrollSentinel sentinelRef={createRef()} isFetchingMore={false} hasMore={false} hasData={true} />);

    expect(screen.getByText('没有更多记录了')).toBeInTheDocument();
  });

  it('shows nothing when hasMore is false and hasData is false', () => {
    const { container } = render(
      <ScrollSentinel sentinelRef={createRef()} isFetchingMore={false} hasMore={false} hasData={false} />
    );

    // Only the sentinel div exists, no text content
    const sentinel = container.firstElementChild!;
    expect(sentinel.textContent).toBe('');
  });

  it('shows only sentinel div when idle (hasMore true, not fetching)', () => {
    const { container } = render(
      <ScrollSentinel sentinelRef={createRef()} isFetchingMore={false} hasMore={true} hasData={true} />
    );

    const sentinel = container.firstElementChild!;
    expect(sentinel.textContent).toBe('');
  });

  it('uses custom loadingText', () => {
    render(
      <ScrollSentinel
        sentinelRef={createRef()}
        isFetchingMore={true}
        hasMore={true}
        hasData={true}
        loadingText="Loading..."
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('加载更多...')).not.toBeInTheDocument();
  });

  it('uses custom endText', () => {
    render(
      <ScrollSentinel
        sentinelRef={createRef()}
        isFetchingMore={false}
        hasMore={false}
        hasData={true}
        endText="No more items"
      />
    );

    expect(screen.getByText('No more items')).toBeInTheDocument();
    expect(screen.queryByText('没有更多记录了')).not.toBeInTheDocument();
  });
});
