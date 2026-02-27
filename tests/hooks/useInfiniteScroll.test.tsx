import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

// Mock IntersectionObserver
let mockObserverCallback: IntersectionObserverCallback;
let mockObserverInstance: {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  mockObserverInstance = {
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  };

  const MockIntersectionObserver = vi.fn(function (
    this: typeof mockObserverInstance,
    callback: IntersectionObserverCallback
  ) {
    mockObserverCallback = callback;
    Object.assign(this, mockObserverInstance);
  });
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const simulateIntersect = (isIntersecting: boolean) => {
  mockObserverCallback(
    [{ isIntersecting } as IntersectionObserverEntry],
    mockObserverInstance as unknown as IntersectionObserver
  );
};

/** Wrapper component that renders a real sentinel div with the hook's ref */
interface TestProps {
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  rootMargin?: string;
}

const TestComponent: React.FC<TestProps> = ({ hasMore, isLoading, loadMore, rootMargin }) => {
  const sentinelRef = useInfiniteScroll({ hasMore, isLoading, loadMore, rootMargin });
  return <div ref={sentinelRef} data-testid="sentinel" />;
};

describe('useInfiniteScroll', () => {
  it('calls loadMore when sentinel intersects and conditions are met', () => {
    const loadMore = vi.fn();
    render(<TestComponent hasMore={true} isLoading={false} loadMore={loadMore} />);

    simulateIntersect(true);
    expect(loadMore).toHaveBeenCalledOnce();
  });

  it('does not call loadMore when isLoading is true', () => {
    const loadMore = vi.fn();
    render(<TestComponent hasMore={true} isLoading={true} loadMore={loadMore} />);

    simulateIntersect(true);
    expect(loadMore).not.toHaveBeenCalled();
  });

  it('does not call loadMore when hasMore is false', () => {
    const loadMore = vi.fn();
    render(<TestComponent hasMore={false} isLoading={false} loadMore={loadMore} />);

    simulateIntersect(true);
    expect(loadMore).not.toHaveBeenCalled();
  });

  it('does not call loadMore when sentinel is not intersecting', () => {
    const loadMore = vi.fn();
    render(<TestComponent hasMore={true} isLoading={false} loadMore={loadMore} />);

    simulateIntersect(false);
    expect(loadMore).not.toHaveBeenCalled();
  });

  it('disconnects observer on unmount', () => {
    const loadMore = vi.fn();
    const { unmount } = render(<TestComponent hasMore={true} isLoading={false} loadMore={loadMore} />);

    unmount();
    expect(mockObserverInstance.disconnect).toHaveBeenCalled();
  });

  it('uses default rootMargin of 200px', () => {
    const loadMore = vi.fn();
    render(<TestComponent hasMore={true} isLoading={false} loadMore={loadMore} />);

    expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), { rootMargin: '200px' });
  });

  it('uses custom rootMargin when provided', () => {
    const loadMore = vi.fn();
    render(<TestComponent hasMore={true} isLoading={false} loadMore={loadMore} rootMargin="400px" />);

    expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), { rootMargin: '400px' });
  });

  it('re-creates observer when dependencies change', () => {
    const loadMore = vi.fn();
    const { rerender } = render(<TestComponent hasMore={true} isLoading={false} loadMore={loadMore} />);

    const initialDisconnectCount = mockObserverInstance.disconnect.mock.calls.length;

    rerender(<TestComponent hasMore={false} isLoading={false} loadMore={loadMore} />);

    expect(mockObserverInstance.disconnect.mock.calls.length).toBeGreaterThan(initialDisconnectCount);
  });
});
