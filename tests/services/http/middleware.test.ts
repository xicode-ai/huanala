import { describe, it, expect, vi } from 'vitest';
import { composeFetch, FetchMiddleware } from '@/services/http/middleware';

// Stub global fetch for all tests
const mockResponse = new Response('ok', { status: 200 });
const originalFetch = globalThis.fetch;

describe('composeFetch', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns native fetch when no middlewares are provided', async () => {
    const composed = composeFetch();
    const res = await composed('https://example.com');

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com');
    expect(res).toBe(mockResponse);
  });

  it('applies a single middleware that wraps fetch', async () => {
    const headerMiddleware: FetchMiddleware = (next) => {
      return (input, init) => {
        const headers = new Headers((init as RequestInit)?.headers);
        headers.set('X-Test', 'hello');
        return next(input, { ...init, headers });
      };
    };

    const composed = composeFetch(headerMiddleware);
    await composed('https://example.com', {});

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, passedInit] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new Headers(passedInit.headers).get('X-Test')).toBe('hello');
  });

  it('composes multiple middlewares in left-to-right order (left = outermost)', async () => {
    const order: string[] = [];

    const middlewareA: FetchMiddleware = (next) => {
      return async (input, init) => {
        order.push('A-before');
        const res = await next(input, init);
        order.push('A-after');
        return res;
      };
    };

    const middlewareB: FetchMiddleware = (next) => {
      return async (input, init) => {
        order.push('B-before');
        const res = await next(input, init);
        order.push('B-after');
        return res;
      };
    };

    const composed = composeFetch(middlewareA, middlewareB);
    await composed('https://example.com');

    expect(order).toEqual(['A-before', 'B-before', 'B-after', 'A-after']);
  });

  it('allows a middleware to short-circuit without calling next', async () => {
    const cachedResponse = new Response('cached', { status: 200 });

    const cacheMiddleware: FetchMiddleware = (_next) => {
      return () => Promise.resolve(cachedResponse);
    };

    const composed = composeFetch(cacheMiddleware);
    const res = await composed('https://example.com');

    expect(res).toBe(cachedResponse);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('propagates errors from middleware to the caller', async () => {
    const errorMiddleware: FetchMiddleware = (_next) => {
      return () => {
        return Promise.reject(new Error('middleware failure'));
      };
    };

    const composed = composeFetch(errorMiddleware);

    await expect(composed('https://example.com')).rejects.toThrow('middleware failure');
  });
});
